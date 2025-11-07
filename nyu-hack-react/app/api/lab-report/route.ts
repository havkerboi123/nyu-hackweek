import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';
import { z } from 'zod';

export const revalidate = 0;

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google Sheets setup for lab reports
const REPORTS_SPREADSHEET_ID =
  process.env.REPORTS_SPREADSHEET_ID || '1dB_zPHSp186qPkMLfXRhsc5ilsDJnfKMZqgtscw45js';
const REPORTS_CREDENTIALS_FILE = process.env.REPORTS_CREDENTIALS_FILE || 'reports_credentials.json';

function getGoogleAuth() {
  const credentialsB64 = process.env.REPORTS_CREDENTIALS_BASE64;
  const credentialsPath = REPORTS_CREDENTIALS_FILE;

  if (credentialsB64) {
    const json = Buffer.from(credentialsB64, 'base64').toString('utf8');
    const creds = JSON.parse(json);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  if (credentialsPath) {
    return new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  throw new Error(
    'Provide Google credentials via REPORTS_CREDENTIALS_BASE64 or REPORTS_CREDENTIALS_FILE'
  );
}

function generateUniqueId(): string {
  return Math.floor(Math.random() * 100).toString().padStart(2, '0');
}

function encodeImageToBase64(imageData: Buffer, filename: string): string {
  const encodedString = imageData.toString('base64');
  let mimeType = 'image/png';

  if (filename.toLowerCase().endsWith('.png')) {
    mimeType = 'image/png';
  } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
    mimeType = 'image/jpeg';
  } else if (filename.toLowerCase().endsWith('.gif')) {
    mimeType = 'image/gif';
  } else if (filename.toLowerCase().endsWith('.webp')) {
    mimeType = 'image/webp';
  }

  return `data:${mimeType};base64,${encodedString}`;
}

// Pydantic-like schemas using Zod
const TestLevelSchema = z.object({
  name: z.string().describe('Name of the test parameter'),
  value: z.string().describe('Measured value with units'),
  reference_range: z.string().nullable().default('N/A').describe('Normal reference range'),
  what_it_is: z.string().describe('Simple explanation of what this test measures'),
  your_level_means: z.string().describe('What your specific level indicates in plain English'),
  why_it_matters: z.string().describe('Health implications in everyday terms'),
  possible_causes: z.string().nullable().default(null).describe(
    'Common reasons for abnormal values if applicable'
  ),
});

const MedicalReportAnalysisSchema = z.object({
  type: z
    .string()
    .describe('Type of medical test/report (e.g., Blood Test, Glucose Test, Lipid Panel, Blood Glucose Profile, etc.)'),
  levels: z.array(TestLevelSchema).describe('All test parameters with comprehensive explanations'),
  concerns: z
    .array(z.string())
    .default([])
    .describe('Any concerning findings that need attention. Empty list if everything is normal.'),
});

const SIMPLE_MEDICAL_PROMPT = `You are a medical report analyzer that helps patients understand their test results in simple language.

Your task is to extract and explain medical reports in 3 sections:

## 1. TYPE
Identify what type of medical test this is (blood test, glucose test, lipid panel, blood glucose profile, etc.)

## 2. LEVELS (with detailed explanations)
For each test parameter in the report, provide:
- name
- value
- reference_range
- what_it_is
- your_level_means
- why_it_matters
- possible_causes (null if normal)

## 3. CONCERNS  
State abnormalities or return an empty list.`;

async function analyzeMedicalReport(
  imageData: Buffer,
  filename: string
): Promise<z.infer<typeof MedicalReportAnalysisSchema>> {
  const imageDataUri = encodeImageToBase64(imageData, filename);

  const response = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      { role: 'system', content: SIMPLE_MEDICAL_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this report and return structured JSON.' },
          { type: 'image_url', image_url: { url: imageDataUri } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'MedicalReportAnalysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            levels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'string' },
                  reference_range: { type: ['string', 'null'] },
                  what_it_is: { type: 'string' },
                  your_level_means: { type: 'string' },
                  why_it_matters: { type: 'string' },
                  possible_causes: { type: ['string', 'null'] },
                },
                required: [
                  'name',
                  'value',
                  'reference_range',
                  'what_it_is',
                  'your_level_means',
                  'why_it_matters',
                  'possible_causes'
                ],
                additionalProperties: false,
              },
            },            
            concerns: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'levels', 'concerns'],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.3,
  });

  return MedicalReportAnalysisSchema.parse(response.choices[0].message.parsed as any);
}

async function saveToGoogleSheet(
  reportId: string,
  analysis: z.infer<typeof MedicalReportAnalysisSchema>
): Promise<boolean> {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const testType = analysis.type;

    const concernsSummary = analysis.concerns.length > 0 ? analysis.concerns.join(' | ') : 'None';

    const parameterNames = analysis.levels.map((l) => l.name).join(', ');
    const values = analysis.levels.map((l) => l.value).join(', ');
    const referenceRanges = analysis.levels.map((l) => l.reference_range || 'N/A').join(', ');
    const whatItIsAll = analysis.levels.map((l) => `${l.name}: ${l.what_it_is}`).join(' || ');
    const yourLevelMeansAll = analysis.levels.map((l) => `${l.name}: ${l.your_level_means}`).join(' || ');
    const whyItMattersAll = analysis.levels.map((l) => `${l.name}: ${l.why_it_matters}`).join(' || ');
    const possibleCausesAll = analysis.levels.map((l) => `${l.name}: ${l.possible_causes || 'N/A'}`).join(' || ');

    try {
      const headerResp = await sheets.spreadsheets.values.get({
        spreadsheetId: REPORTS_SPREADSHEET_ID,
        range: 'Sheet1!A1:K1',
      });

      const headers = headerResp.data.values?.[0];
      if (!headers || headers[0] !== 'id') {
        await sheets.spreadsheets.values.update({
          spreadsheetId: REPORTS_SPREADSHEET_ID,
          range: 'Sheet1!A1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [
              [
                'id',
                'timestamp',
                'test_type',
                'parameter_name',
                'value',
                'reference_range',
                'what_it_is',
                'your_level_means',
                'why_it_matters',
                'possible_causes',
                'concerns_summary',
              ],
            ],
          },
        });
      }
    } catch {
      await sheets.spreadsheets.values.update({
        spreadsheetId: REPORTS_SPREADSHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              'id',
              'timestamp',
              'test_type',
              'parameter_name',
              'value',
              'reference_range',
              'what_it_is',
              'your_level_means',
              'why_it_matters',
              'possible_causes',
              'concerns_summary',
            ],
          ],
        },
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: REPORTS_SPREADSHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            reportId,
            timestamp,
            testType,
            parameterNames,
            values,
            referenceRanges,
            whatItIsAll,
            yourLevelMeansAll,
            whyItMattersAll,
            possibleCausesAll,
            concernsSummary,
          ],
        ],
      },
    });

    return true;
  } catch (error) {
    console.error('Error saving to Google Sheet:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'No image file provided', message: 'Please upload an image file' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format', message: 'Please upload PNG/JPG/GIF/WEBP' },
        { status: 400 }
      );
    }

    if (imageFile.size > 16 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large', message: 'Max size 16MB' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuration error', message: 'OPENAI_API_KEY not set' },
        { status: 500 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const reportId = generateUniqueId();

    const analysis = await analyzeMedicalReport(imageBuffer, imageFile.name);

    const result = {
      success: true,
      id: reportId,
      timestamp: new Date().toISOString(),
      data: analysis,
    };

    const saved = await saveToGoogleSheet(reportId, analysis);

    if (!saved) {
      return NextResponse.json({ ...result, warning: 'Saved locally but not stored in sheet' });
    }

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Lab report analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze report', message },
      { status: 500 }
    );
  }
}