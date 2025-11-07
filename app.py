from dotenv import load_dotenv
load_dotenv()
import os
import json
import base64
import uuid
from datetime import datetime
from typing import Optional
from enum import Enum
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from pydantic import BaseModel, Field
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, RunContext, function_tool
from livekit.plugins import openai, silero, cartesia
from livekit.plugins import noise_cancellation
from livekit.plugins import groq
import gspread
from google.oauth2.service_account import Credentials
import threading

# Google Sheets Setup - Appointments
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
APPOINTMENTS_SPREADSHEET_ID = os.getenv('GOOGLE_SHEET_ID')  # For appointments
APPOINTMENTS_CREDENTIALS_FILE = os.getenv('GOOGLE_CREDENTIALS_FILE', 'credentials.json')

# Google Sheets Setup - Lab Reports (different sheet and credentials)
REPORTS_SPREADSHEET_ID = '1dB_zPHSp186qPkMLfXRhsc5ilsDJnfKMZqgtscw45js'
REPORTS_CREDENTIALS_FILE = os.getenv('REPORTS_CREDENTIALS_FILE', 'reports_credentials.json')

def get_appointments_sheets_client():
    """Initialize and return Google Sheets client for appointments"""
    creds = Credentials.from_service_account_file(APPOINTMENTS_CREDENTIALS_FILE, scopes=SCOPES)
    client = gspread.authorize(creds)
    return client

def get_reports_sheets_client():
    """Initialize and return Google Sheets client for lab reports"""
    creds = Credentials.from_service_account_file(REPORTS_CREDENTIALS_FILE, scopes=SCOPES)
    client = gspread.authorize(creds)
    return client

def get_reports_google_sheet():
    """Initialize Google Sheets connection for lab reports"""
    creds = Credentials.from_service_account_file(REPORTS_CREDENTIALS_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)
    sheet = gc.open_by_key(REPORTS_SPREADSHEET_ID).sheet1
    return sheet

# OpenAI client for lab report analysis
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Flask app for lab report analysis API
flask_app = Flask(__name__)
CORS(flask_app)  # Enable CORS for Next.js frontend
flask_app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Lab Report Analysis Models
class TestType(str, Enum):
    BLOOD_TEST = "Blood Test"
    GLUCOSE_TEST = "Glucose Test"
    LIPID_PANEL = "Lipid Panel"
    HORMONE_PANEL = "Hormone Panel"
    KIDNEY_FUNCTION = "Kidney Function"
    LIVER_FUNCTION = "Liver Function"
    THYROID_PANEL = "Thyroid Panel"
    URINALYSIS = "Urinalysis"
    TESTOSTERONE = "Testosterone"
    OTHER = "Other"

class TestLevel(BaseModel):
    """Individual test parameter with detailed layman explanation"""
    name: str = Field(description="Name of the test parameter")
    value: str = Field(description="Measured value with units")
    reference_range: Optional[str] = Field(default="N/A", description="Normal reference range")
    what_it_is: str = Field(description="Simple explanation of what this test measures")
    your_level_means: str = Field(description="What your specific level indicates in plain English")
    why_it_matters: str = Field(description="Health implications in everyday terms")
    possible_causes: Optional[str] = Field(default=None, description="Common reasons for abnormal values if applicable")

class MedicalReportAnalysis(BaseModel):
    """Simplified medical report analysis"""
    type: TestType = Field(description="Type of medical test/report")
    levels: list[TestLevel] = Field(description="All test parameters with comprehensive layman explanations")
    concerns: list[str] = Field(
        default_factory=list,
        description="Any concerning findings that need attention. Empty list if everything is normal."
    )

# Simplified system prompt
SIMPLE_MEDICAL_PROMPT = """You are a medical report analyzer that helps patients understand their test results in simple language.

Your task is to extract and explain medical reports in 3 sections:

## 1. TYPE
Identify what type of medical test this is (blood test, glucose test, lipid panel, etc.)

## 2. LEVELS (with detailed explanations)
For each test parameter in the report, provide:

- *name*: The test parameter name
- *value*: The measured value with units
- *reference_range*: Normal reference range (if shown in report)
- *what_it_is*: Simple explanation of what this test measures (e.g., "Postprandial glucose measures the sugar level in your blood after eating")
- *your_level_means*: What YOUR specific level indicates (e.g., "Your postprandial glucose level is slightly above the normal range, indicating impaired glucose tolerance")
- *why_it_matters*: Health implications in everyday terms (e.g., "Impaired glucose tolerance can lead to diabetes if not managed with lifestyle changes")
- *possible_causes*: Common reasons for abnormal values if applicable (e.g., "Early Type II Diabetes, glucose intolerance, or dietary habits"). Leave null if level is normal.

## 3. CONCERNS
List any concerning findings that need medical attention. Use simple language.
- If everything is normal, return an empty list
- If there are concerns, clearly state what's abnormal and why it matters
- Include any actionable advice or recommendations from the report
- Always recommend consulting with their doctor for concerns
- If values are critical, clearly state this is urgent

## Guidelines:
- Use simple, clear language - avoid medical jargon
- Be honest about abnormal findings but not alarmist
- Extract all information directly from the report image provided
- For normal values, still provide educational context about what the test measures

Do NOT include a separate suggestions section - integrate any recommendations into the concerns section."""

def generate_unique_id():
    """Generate a unique 2-digit numeric ID"""
    unique_num = str(uuid.uuid4().int)[:2]
    return unique_num

def encode_image_to_base64(image_data: bytes, filename: str) -> str:
    """Convert image bytes to base64 string"""
    encoded_string = base64.b64encode(image_data).decode('utf-8')
    
    if filename.lower().endswith('.png'):
        mime_type = "image/png"
    elif filename.lower().endswith(('.jpg', '.jpeg')):
        mime_type = "image/jpeg"
    elif filename.lower().endswith('.gif'):
        mime_type = "image/gif"
    elif filename.lower().endswith('.webp'):
        mime_type = "image/webp"
    else:
        mime_type = "image/png"
    
    return f"data:{mime_type};base64,{encoded_string}"

def analyze_medical_report(image_data: bytes, filename: str) -> MedicalReportAnalysis:
    """Analyze a medical report image and return simplified analysis"""
    image_data_uri = encode_image_to_base64(image_data, filename)
    
    response = openai_client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": SIMPLE_MEDICAL_PROMPT
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Please analyze this medical report and provide: 1) type of test, 2) detailed levels with explanations (what it is, what your level means, why it matters, possible causes), 3) concerns if any."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_data_uri
                        }
                    }
                ]
            }
        ],
        response_format=MedicalReportAnalysis,
        temperature=0.3
    )
    
    return response.choices[0].message.parsed

def save_to_google_sheet(report_id: str, analysis: MedicalReportAnalysis, result_dict: dict):
    """Save analysis result to Google Sheet"""
    try:
        sheet = get_reports_google_sheet()
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        test_type = analysis.type
        concerns_summary = ' | '.join(analysis.concerns) if analysis.concerns else 'None'
        
        parameter_names = ', '.join([level.name for level in analysis.levels])
        values = ', '.join([level.value for level in analysis.levels])
        reference_ranges = ', '.join([level.reference_range if level.reference_range else 'N/A' for level in analysis.levels])
        what_it_is_all = ' || '.join([f"{level.name}: {level.what_it_is}" for level in analysis.levels])
        your_level_means_all = ' || '.join([f"{level.name}: {level.your_level_means}" for level in analysis.levels])
        why_it_matters_all = ' || '.join([f"{level.name}: {level.why_it_matters}" for level in analysis.levels])
        possible_causes_all = ' || '.join([f"{level.name}: {level.possible_causes if level.possible_causes else 'N/A'}" for level in analysis.levels])
        
        try:
            headers = sheet.row_values(1)
            if not headers or headers[0] != 'id':
                sheet.insert_row([
                    'id', 'timestamp', 'test_type', 'parameter_name', 'value', 
                    'reference_range', 'what_it_is', 'your_level_means', 
                    'why_it_matters', 'possible_causes', 'concerns_summary'
                ], 1)
        except:
            sheet.insert_row([
                'id', 'timestamp', 'test_type', 'parameter_name', 'value', 
                'reference_range', 'what_it_is', 'your_level_means', 
                'why_it_matters', 'possible_causes', 'concerns_summary'
            ], 1)
        
        row = [
            report_id,
            timestamp,
            test_type,
            parameter_names,
            values,
            reference_ranges,
            what_it_is_all,
            your_level_means_all,
            why_it_matters_all,
            possible_causes_all,
            concerns_summary
        ]
        
        sheet.append_row(row)
        return True
    except Exception as e:
        print(f"Error saving to Google Sheet: {str(e)}")
        return False

# Flask routes for lab report analysis
@flask_app.route('/analyze', methods=['POST'])
def analyze_report():
    """API endpoint to analyze medical report"""
    try:
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image file provided',
                'message': 'Please upload an image file with key "image"'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'message': 'Please select an image file to upload'
            }), 400
        
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'error': 'Invalid file format',
                'message': f'Please upload an image file. Allowed formats: {", ".join(allowed_extensions)}'
            }), 400
        
        image_data = file.read()
        report_id = generate_unique_id()
        analysis = analyze_medical_report(image_data, file.filename)
        
        result = {
            'success': True,
            'id': report_id,
            'timestamp': datetime.now().isoformat(),
            'data': {
                'type': analysis.type,
                'levels': [
                    {
                        'name': level.name,
                        'value': level.value,
                        'reference_range': level.reference_range,
                        'what_it_is': level.what_it_is,
                        'your_level_means': level.your_level_means,
                        'why_it_matters': level.why_it_matters,
                        'possible_causes': level.possible_causes
                    }
                    for level in analysis.levels
                ],
                'concerns': analysis.concerns
            }
        }
        
        saved = save_to_google_sheet(report_id, analysis, result)
        
        if not saved:
            result['warning'] = 'Analysis completed but failed to save to database'
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Analysis failed',
            'message': str(e)
        }), 500

@flask_app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Medical Report Analyzer API is running'
    }), 200

@flask_app.route('/', methods=['GET'])
def flask_home():
    """Home endpoint with API documentation"""
    return jsonify({
        'message': 'Medical Report Analyzer API',
        'version': '2.0',
        'endpoints': {
            '/health': 'GET - Health check',
            '/analyze': 'POST - Analyze medical report (upload image with key "image")',
        }
    }), 200

@function_tool
async def check_appointment_availability(
    date: str,
    time: str
) -> str:
    """
    Check if a specific date and time slot is available for booking.
    
    Args:
        date: Appointment date in format YYYY-MM-DD
        time: Appointment time in format HH:MM (24-hour format)
    
    Returns:
        Availability status message
    """
    try:
        client = get_appointments_sheets_client()
        sheet = client.open_by_key(APPOINTMENTS_SPREADSHEET_ID).sheet1
        
        # Get all existing appointments
        all_records = sheet.get_all_records()
        
        # Check for conflicts
        for record in all_records:
            existing_date = record.get('Date', '')
            existing_time = record.get('Time', '')
            
            # Normalize time format for comparison
            if existing_date == date and existing_time == time:
                return f"UNAVAILABLE: The time slot on {date} at {time} is already booked. Please choose a different date or time."
        
        return f"AVAILABLE: The time slot on {date} at {time} is available for booking."
    
    except Exception as e:
        return f"I apologize, but I couldn't check availability at the moment: {str(e)}. Let's proceed and I'll note your preferred time."


@function_tool
async def save_appointment_to_sheet(
    name: str,
    email: str,
    appointment_type: str,
    date: str,
    time: str
) -> str:
    """
    Save appointment details to Google Sheet after confirming availability.
    
    Args:
        name: Patient's full name
        email: Patient's email address
        appointment_type: Type of appointment (e.g., "General Checkup", "Physical", "Consultation")
        date: Appointment date in format YYYY-MM-DD
        time: Appointment time in format HH:MM
    
    Returns:
        Confirmation message
    """
    try:
        client = get_appointments_sheets_client()
        sheet = client.open_by_key(APPOINTMENTS_SPREADSHEET_ID).sheet1
        
        # Double-check availability before saving
        all_records = sheet.get_all_records()
        for record in all_records:
            if record.get('Date') == date and record.get('Time') == time:
                return f"ERROR: This time slot was just booked by someone else. Please choose a different time."
        
        # Prepare row data
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        row_data = [timestamp, name, email, appointment_type, date, time]
        
        # Append to sheet
        sheet.append_row(row_data)
        
        return f"Appointment successfully booked for {name} on {date} at {time}. Confirmation will be sent to {email}."
    
    except Exception as e:
        return f"I apologize, but there was an error saving your appointment: {str(e)}. Please contact our office directly."


@function_tool
async def lookup_user_reports(
    user_id: str
) -> str:
    """
    Look up all medical reports for a specific user from Google Sheets.
    
    Args:
        user_id: The unique user/report identifier to search for
    
    Returns:
        Formatted string containing all reports for the user or error message
    """
    try:
        client = get_reports_sheets_client()
        sheet = client.open_by_key(REPORTS_SPREADSHEET_ID).sheet1
        
        # Get all records
        all_records = sheet.get_all_records()
        
        # Filter records by user_id
        user_reports = [record for record in all_records if str(record.get('id')) == str(user_id)]
        
        if not user_reports:
            return f"I couldn't find any reports for ID {user_id}. Please double-check the Report ID and try again, or contact our office for assistance."
        
        # Format the reports in a conversational way
        result = f"I found {len(user_reports)} report(s) for ID {user_id}:\n\n"
        
        for idx, report in enumerate(user_reports, 1):
            result += f"Report {idx}: {report.get('test_type', 'Unknown Test')}\n"
            result += f"Date: {report.get('timestamp', 'Not available')}\n\n"
            
            # Parse parameters
            param_names = report.get('parameter_name', '').split(', ')
            values = report.get('value', '').split(', ')
            ref_ranges = report.get('reference_range', '').split(', ')
            
            # Add each parameter
            for i, param_name in enumerate(param_names):
                if i < len(values) and i < len(ref_ranges):
                    result += f"• {param_name}: {values[i]} (Normal range: {ref_ranges[i]})\n"
            
            result += "\n"
            
            # Add explanations if available
            what_it_is = report.get('what_it_is', '')
            your_level = report.get('your_level_means', '')
            why_matters = report.get('why_it_matters', '')
            concerns = report.get('concerns_summary', '')
            
            if what_it_is:
                result += f"What this test measures: {what_it_is}\n\n"
            if your_level:
                result += f"What your results mean: {your_level}\n\n"
            if why_matters:
                result += f"Why it matters: {why_matters}\n\n"
            if concerns and concerns.lower() != 'none':
                result += f"Important notes: {concerns}\n\n"
            
            result += "---\n\n"
        
        return result
        
    except Exception as e:
        return f"I apologize, but I encountered an error retrieving your reports: {str(e)}. Please try again or contact our office for assistance."


INSTRUCTIONS = """
# Hospital Assistant - Luna

## Core Identity
You are Luna, a warm and professional hospital assistant. You help patients with:
1. **Appointment Booking** - Schedule consultations efficiently
2. **Lab Report Explanations** - Help patients understand their medical test results in simple terms
3. **Initial Symptom Assessment** - Provide preliminary guidance on whether to visit the hospital or manage at home

## Response Style
- Be warm, empathetic, and professional
- Use a conversational, natural tone
- Keep responses brief (1-3 sentences) for smooth voice interaction
- Use natural filler words occasionally like "Great", "Perfect", "Wonderful", "I understand"
- Ask ONE question at a time - don't rush
- Acknowledge information before moving forward

---

## APPOINTMENT BOOKING

### Information to Collect (in order):
1. **Full Name** - Patient's complete name
2. **Email Address** - Valid email for confirmation
3. **Appointment Type** - Choose from:
   - General Checkup
   - Physical Examination
   - Specialist Consultation
   - Follow-up Visit
   - Other (ask them to specify)
4. **Preferred Date** - In format like "December 15, 2024" or "15th December"
5. **Preferred Time** - In format like "2:30 PM" or "14:30"

### Booking Flow:
1. **Greeting**: Welcome warmly and ask what they need help with (appointment, lab report, or symptom check)
2. **For Appointments**: Ask for their name
3. **Email**: After confirming name, ask for email
4. **Appointment Type**: Ask what type of appointment they need
5. **Date**: Ask for their preferred date
6. **Time**: Ask for their preferred time
7. **Check Availability**: Use check_appointment_availability tool to verify the slot is free
   - If UNAVAILABLE: Inform politely and ask for different date/time
   - If AVAILABLE: Proceed to confirmation
8. **Confirmation**: Summarize ALL details and ask for final confirmation
9. **Save**: Once confirmed, use save_appointment_to_sheet tool to book

### Important Guidelines:
- Always validate email format (contains @ and domain)
- For dates, accept natural language but convert to YYYY-MM-DD format for tools
- For times, accept 12-hour or 24-hour format, convert to HH:MM (24-hour) for tools
- **CRITICAL**: After collecting date and time, IMMEDIATELY use check_appointment_availability
- Only call save_appointment_to_sheet AFTER getting explicit confirmation AND verifying availability

---

## LAB REPORT EXPLANATIONS

### Flow:
1. **Ask for Report ID**: "I'd be happy to help explain your lab report. May I have your Report ID?"
2. **Lookup Report**: Use lookup_user_reports tool with the provided ID
3. **Explain Results**: Break down the report in simple, everyday language:
   - Explain what each test measures (avoid medical jargon)
   - Tell them what their specific numbers mean
   - Indicate if values are in normal range
   - Explain why each test matters for their health
   - If there are concerns, mention them calmly and recommend discussing with their doctor

### Explanation Guidelines:
- **Use Simple Language**: Avoid medical jargon or explain it in simple terms
  - Example: "Hemoglobin is like the delivery trucks in your blood - it carries oxygen"
- **Be Clear About Normal vs Abnormal**: 
  - "Your level is 14.2, which is within the normal range of 13.5-17.5"
  - "Your level is 18.5, which is slightly above the normal range"
- **Provide Context**: Explain why each value matters
- **Stay Calm**: If results show concerns, be reassuring but honest
- **Don't Diagnose**: Never diagnose conditions or prescribe treatments
- **Recommend Doctor**: Always suggest discussing concerns with their doctor

---

## INITIAL SYMPTOM ASSESSMENT (NEW)

### Purpose
Provide preliminary guidance to help patients decide if they need immediate hospital care, can schedule a regular appointment, or can manage symptoms at home.

### Assessment Flow:
1. **Gather Basic Info**:
   - What symptoms are they experiencing?
   - When did symptoms start?
   - How severe are the symptoms? (mild/moderate/severe)
   - Any relevant medical history or current medications?
   - Age of patient (if child, be more cautious)

2. **Ask Clarifying Questions** based on symptoms:
   - Fever: Temperature? How long? Other symptoms?
   - Pain: Location? Scale 1-10? Constant or intermittent?
   - Breathing issues: Difficulty level? Chest pain?
   - Injury: How did it happen? Can they move the affected area?
   - Digestive: Vomiting/diarrhea frequency? Blood present? Dehydration signs?

### CRITICAL - IMMEDIATE HOSPITAL VISIT REQUIRED:
If patient reports ANY of these, immediately advise going to hospital/emergency:
- **Severe chest pain or pressure**
- **Difficulty breathing or shortness of breath**
- **Severe allergic reaction (swelling face/throat, difficulty breathing)**
- **Uncontrolled bleeding**
- **Signs of stroke (facial drooping, arm weakness, speech difficulty)**
- **Severe head injury or loss of consciousness**
- **High fever in infant under 3 months**
- **Severe abdominal pain**
- **Suicidal thoughts or severe mental health crisis**
- **Suspected broken bones with deformity**
- **Severe burns**
- **Poisoning or overdose**

**Response**: "I understand this is concerning. Based on what you've described, I strongly recommend going to the emergency room immediately or calling emergency services. This needs urgent medical attention. Would you like me to help arrange anything?"

### RECOMMEND SCHEDULING APPOINTMENT:
For moderate symptoms that need medical attention but aren't emergencies:
- Persistent fever (2-3 days) without improvement
- Moderate pain that's manageable but concerning
- Symptoms that are worsening gradually
- New symptoms that need diagnosis
- Follow-up needed for existing condition

**Response**: "Based on your symptoms, I think it would be best to have a doctor examine you. It's not an emergency, but you should be seen soon. Would you like me to help you book an appointment?"

### HOME CARE SUGGESTIONS:
For mild symptoms that can be managed at home:
- Common cold/flu with mild symptoms
- Minor headaches
- Mild fever in adults (under 102°F/39°C)
- Minor cuts/scrapes
- Mild indigestion
- Muscle soreness from activity

**Response format**:
1. Acknowledge their concern
2. Explain why home care is appropriate
3. Provide 2-3 simple care suggestions
4. Give clear signs to watch for that would require medical attention
5. Offer to book appointment if symptoms don't improve

**Example**: "It sounds like you have a common cold. For mild symptoms like this, home care usually works well. I'd suggest: getting plenty of rest, drinking lots of water, and you can take over-the-counter pain relievers if needed. If your fever goes above 102°F, symptoms last more than a week, or you have difficulty breathing, please come in to see us. Would you like me to note anything else?"

### Important Safety Guidelines:
- **Never diagnose** - Only provide guidance on urgency level
- **When in doubt, err on the side of caution** - Suggest appointment or hospital visit
- **Be especially careful with**:
  - Children (lower threshold for recommending visit)
  - Elderly patients (higher risk)
  - Pregnant women (many symptoms need medical attention)
  - Patients with chronic conditions (diabetes, heart disease, etc.)
- **Always provide a safety net**: Tell them signs to watch for that would require coming in
- **Don't recommend specific medications** - Only suggest they "can take over-the-counter medication if appropriate"
- **Document conversation**: Mention they should call back or come in if anything changes

### After Assessment:
- If recommending hospital visit: Ask if they need help with anything
- If recommending appointment: Offer to book immediately
- If suggesting home care: Remind them they can call back anytime if concerned

---

## Error Handling
- If tools return errors, apologize warmly and offer to help manually
- Stay calm and helpful even with technical issues
- For missing reports, politely ask them to verify the ID
- For medical advice, always prioritize patient safety

## Example Opening
"Hello! I'm Luna, your hospital assistant. I can help you book an appointment, explain your lab report, or discuss any symptoms you're experiencing. What would you like help with today?"

## Remember
- You're providing triage guidance, not medical diagnosis
- Patient safety is the top priority
- When uncertain, always recommend professional medical evaluation
- Be warm and reassuring while being medically responsible
"""


async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        stt=openai.STT.with_groq(model="whisper-large-v3", language="en"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=cartesia.TTS(
            model="sonic-english",
            voice="a0e99841-438c-4a64-b679-ae501e7d6091",  # Warm British Lady
            speed=1.0,
            emotion=["positivity:high", "curiosity:high"],
        ),
        vad=silero.VAD.load(),
    )
    
    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=INSTRUCTIONS,
            tools=[
                check_appointment_availability,
                save_appointment_to_sheet,
                lookup_user_reports
            ]
        ),
        room_input_options=RoomInputOptions(
            close_on_disconnect=False,
            noise_cancellation=noise_cancellation.BVCTelephony(),
        ),
    )
    
    await session.generate_reply(
        instructions="Give a warm, brief greeting. Introduce yourself as Luna, the hospital assistant. Mention you can help with appointments, lab reports, or discussing symptoms. Keep it to 1-2 sentences maximum for natural voice flow."
    )


def run_flask_app():
    """Run Flask app in a separate thread"""
    flask_app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Start Flask server in a separate thread
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    
    # Run LiveKit agent
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            initialize_process_timeout=60,
        )
    )