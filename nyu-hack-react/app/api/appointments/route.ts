import { NextResponse } from 'next/server';
import { google } from 'googleapis';

type Appointment = {
  timestamp: string;
  name: string;
  email: string;
  appointmentType: string;
  date: string;
  time: string;
};

function getGoogleAuth() {
  const credentialsB64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_FILE;

  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not defined');
  }

  if (credentialsB64) {
    const json = Buffer.from(credentialsB64, 'base64').toString('utf8');
    const creds = JSON.parse(json);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  if (credentialsPath) {
    return new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  throw new Error(
    'Provide Google credentials via GOOGLE_CREDENTIALS_BASE64 or GOOGLE_CREDENTIALS_FILE'
  );
}

export const revalidate = 0;

export async function GET() {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID as string;

    // Read the first sheet (sheet1) and all rows
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const values = resp.data.values ?? [];
    if (values.length === 0) {
      return NextResponse.json<Appointment[]>([]);
    }

    // Expect header row: Timestamp, Name, Email, Appointment Type, Date, Time
    const [header, ...rows] = values;
    const idx = (col: string) => header.findIndex((h) => h?.toLowerCase() === col);
    const tsIdx = idx('timestamp');
    const nameIdx = idx('name');
    const emailIdx = idx('email');
    const typeIdx = header.findIndex((h) => h?.toLowerCase().includes('appointment'));
    const dateIdx = idx('date');
    const timeIdx = idx('time');

    const data: Appointment[] = rows.map((r) => ({
      timestamp: r[tsIdx] ?? '',
      name: r[nameIdx] ?? '',
      email: r[emailIdx] ?? '',
      appointmentType: r[typeIdx] ?? '',
      date: r[dateIdx] ?? '',
      time: r[timeIdx] ?? '',
    }));

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/appointments error:', error);
    return new NextResponse(message, { status: 500 });
  }
}
