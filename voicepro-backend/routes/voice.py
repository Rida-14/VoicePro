from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import speech_recognition as sr
import os
import json
import re
import mimetypes
from datetime import datetime, timedelta
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError
from werkzeug.utils import secure_filename

voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')

recognizer = sr.Recognizer()

ALLOWED_EXTENSIONS = {'wav', 'mp3', 'webm', 'ogg', 'm4a'}
SR_FALLBACK_EXTENSIONS = {'wav', 'aif', 'aiff', 'flac', 'webm'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def transcribe_with_openai(filepath, filename):
    """Transcribe using OpenAI Whisper API when OPENAI_API_KEY is available."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return None

    try:
        from openai import OpenAI
    except Exception:
        return None

    model = os.getenv('OPENAI_TRANSCRIBE_MODEL', 'whisper-1')
    client = OpenAI(api_key=api_key)
    with open(filepath, 'rb') as audio_file:
        response = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
        )

    text = getattr(response, 'text', None)
    if text is None and isinstance(response, dict):
        text = response.get('text')

    return (text or '').strip() or None


@voice_bp.route('/transcribe', methods=['POST'])
@jwt_required()
def transcribe():
    """Transcribe audio file to text"""
    try:
        if 'audio' not in request.files:
            return jsonify({'message': 'No audio file provided'}), 400

        file = request.files['audio']

        if file.filename == '':
            return jsonify({'message': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'message': 'File type not allowed'}), 400

        filename = secure_filename(file.filename)
        upload_folder = 'uploads'
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        try:
            text = None
            whisper_error = None
            ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

            try:
                text = transcribe_with_openai(filepath, filename)
            except HTTPError as e:
                try:
                    details = e.read().decode('utf-8')
                except Exception:
                    details = str(e)
                whisper_error = f'OpenAI Whisper HTTP {e.code}: {details}'
            except URLError as e:
                whisper_error = f'OpenAI Whisper network error: {str(e)}'
            except Exception as e:
                whisper_error = f'OpenAI Whisper failed: {str(e)}'

            if not text and ext in SR_FALLBACK_EXTENSIONS:
                with sr.AudioFile(filepath) as source:
                    audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data)

            if not text:
                if whisper_error:
                    print(f'[voice.transcribe] Whisper failed for .{ext}: {whisper_error}')
                    return jsonify({'message': whisper_error}), 500
                return jsonify({'message': 'Could not transcribe audio. Please verify OPENAI_API_KEY and try again.'}), 500

            return jsonify({'transcription': text, 'success': True}), 200

        except sr.UnknownValueError:
            return jsonify({'message': 'Could not understand audio'}), 400

        except sr.RequestError as e:
            return jsonify({'message': f'Speech recognition service error: {str(e)}'}), 500

        finally:
            if os.path.exists(filepath):
                os.remove(filepath)

    except Exception as e:
        return jsonify({'message': f'Transcription failed: {str(e)}'}), 500


@voice_bp.route('/command', methods=['POST'])
@jwt_required()
def process_command():
    """Process voice command (legacy endpoint)"""
    try:
        data = request.get_json()
        if 'command' not in data:
            return jsonify({'message': 'Command text is required'}), 400
        command = data['command'].lower().strip()
        intent = parse_command(command)
        return jsonify({'command': data['command'], 'intent': intent, 'success': True}), 200
    except Exception as e:
        return jsonify({'message': f'Command processing failed: {str(e)}'}), 500


def parse_command(command):
    """Parse voice command and extract intent (legacy)"""
    command_lower = command.lower()
    if any(word in command_lower for word in ['log', 'add task', 'create task']):
        return {'type': 'create_task', 'action': 'task_creation', 'text': command}
    if 'start timer' in command_lower or 'start pomodoro' in command_lower:
        return {'type': 'start_timer', 'action': 'timer_start', 'text': command}
    if 'stop timer' in command_lower or 'end timer' in command_lower:
        return {'type': 'stop_timer', 'action': 'timer_stop', 'text': command}
    if any(word in command_lower for word in ['complete', 'finish', 'done']):
        return {'type': 'complete_task', 'action': 'task_completion', 'text': command}
    if any(word in command_lower for word in ['summary', 'today', 'how was my day']):
        return {'type': 'summary', 'action': 'show_summary', 'text': command}
    if 'remind' in command_lower or 'reminder' in command_lower:
        return {'type': 'reminder', 'action': 'set_reminder', 'text': command}
    return {'type': 'unknown', 'action': 'unknown', 'text': command}


def fallback_assistant_parse(command_text, now_iso=None):
    """Deterministic assistant parser used when AI API is unavailable."""
    raw = (command_text or '').strip()
    command = raw.lower()

    try:
        now = datetime.fromisoformat(now_iso) if now_iso else datetime.utcnow()
    except Exception:
        now = datetime.utcnow()

    def infer_due_date(text):
        if 'tomorrow' in text:
            due = now + timedelta(days=1)
            return due.replace(hour=17, minute=0, second=0, microsecond=0).isoformat()
        if 'today' in text:
            due = now.replace(hour=17, minute=0, second=0, microsecond=0)
            if due <= now:
                due = now + timedelta(hours=2)
            return due.isoformat()
        if 'next week' in text:
            due = now + timedelta(days=7)
            return due.replace(hour=17, minute=0, second=0, microsecond=0).isoformat()
        # "in X hours/minutes"
        hour_m = re.search(r'in\s+(\d+)\s*(hour|hours|hr|hrs)', text)
        min_m = re.search(r'in\s+(\d+)\s*(minute|minutes|min|mins)', text)
        if hour_m:
            return (now + timedelta(hours=int(hour_m.group(1)))).isoformat()
        if min_m:
            return (now + timedelta(minutes=int(min_m.group(1)))).isoformat()
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', text)
        if date_match:
            return f"{date_match.group(1)}T17:00:00"
        return None

    def infer_task_details(original_text, lowered_text):
        if any(word in lowered_text for word in ['delete', 'remove', 'trash', 'discard', 'drop', 'reopen', 'update', 'change']):
            return None

        priority = None
        if 'high priority' in lowered_text or 'urgent' in lowered_text or re.search(r'\bhigh\b', lowered_text):
            priority = 'high'
        elif 'low priority' in lowered_text or re.search(r'\blow\b', lowered_text):
            priority = 'low'
        elif 'medium priority' in lowered_text or re.search(r'\bmedium\b', lowered_text):
            priority = 'medium'

        due_date = infer_due_date(lowered_text)

        title = original_text
        title = re.sub(r'^(add task|create task|log task|new task|i need to|i have to|i must|please add|please create)\s*', '', title, flags=re.IGNORECASE)
        title = re.sub(r'^(my|a|an)\s+', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\bis due\b.*$', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\bdue\b.*$', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\b(today|tomorrow|next week)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\b(high|low|medium)\s+priority\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\s+', ' ', title).strip(' .,!?:;')

        task_keywords = [
            'task', 'assignment', 'homework', 'project', 'report', 'slides', 'presentation',
            'seminar', 'meeting', 'study', 'exam', 'review', 'submit', 'prepare', 'finish',
            'todo', 'to-do', 'work', 'call', 'email', 'buy', 'get', 'write', 'fix', 'check'
        ]
        looks_like_task = (
            any(phrase in lowered_text for phrase in ['add task', 'create task', 'log task', 'new task', 'i need to', 'i have to', 'i must']) or
            'due' in lowered_text or
            any(keyword in lowered_text for keyword in task_keywords)
        )

        if not looks_like_task:
            return None

        if not title:
            return {'title': '', 'priority': priority, 'due_date': due_date}

        return {
            'title': title[0].upper() + title[1:] if title else '',
            'priority': priority,
            'due_date': due_date,
        }

    def parse_task_query(text):
        query = re.sub(r'\b(my|the|a|an)\b', '', text, flags=re.IGNORECASE)
        query = re.sub(r'\b(task|todo|to do|item)\b', '', query, flags=re.IGNORECASE)
        query = re.sub(r'\s+', ' ', query).strip(' .,!?:;')
        return query

    response = {
        'reply': 'I can help with tasks, reminders, timers, summaries, navigation, and more. What would you like to do?',
        'action': {'type': 'none', 'params': {}},
        'confidence': 0.45,
        'needs_confirmation': False,
        'missing_fields': []
    }

    # Navigation
    if any(phrase in command for phrase in ['go to', 'open', 'take me to', 'navigate to', 'show me']):
        route_map = {
            'dashboard': '/', 'home': '/', 'tasks': '/tasks', 'task': '/tasks',
            'timer': '/timer', 'time tracker': '/timer', 'calendar': '/calendar',
            'analytics': '/analytics', 'insights': '/analytics',
            'settings': '/settings', 'profile': '/settings'
        }
        for key, route in route_map.items():
            if key in command:
                response['reply'] = f'Opening {key}.'
                response['action'] = {'type': 'navigate', 'params': {'route': route}}
                response['confidence'] = 0.95
                return response

    # List tasks
    if any(phrase in command for phrase in ['list tasks', 'show tasks', 'what are my tasks', 'show my tasks', 'pending tasks', 'my tasks']):
        response['reply'] = 'Here are your pending tasks.'
        response['action'] = {'type': 'list_tasks', 'params': {}}
        response['confidence'] = 0.9
        return response

    # List reminders
    if any(phrase in command for phrase in ['list reminders', 'show reminders', 'my reminders', 'what reminders']):
        response['reply'] = 'Here are your active reminders.'
        response['action'] = {'type': 'list_reminders', 'params': {}}
        response['confidence'] = 0.9
        return response

    # Clear timer history
    if any(phrase in command for phrase in ['clear all timers', 'clear timer history', 'delete timer history', 'remove timer history']):
        response['reply'] = 'I can clear all timer history. Please confirm.'
        response['action'] = {'type': 'clear_timers_history', 'params': {}}
        response['confidence'] = 0.9
        response['needs_confirmation'] = True
        return response

    # Delete task
    if re.search(r'\b(delete|remove|trash|discard)\b.*\b(task|todo|to do|item)\b', command) or \
       re.search(r'\b(delete|remove|trash|discard)\b\s+(that|it)\b', command):
        cleaned = re.sub(r'^(can you|please|could you|would you|help me)\s*', '', raw, flags=re.IGNORECASE)
        cleaned = re.sub(r'\b(delete|remove|trash|discard)\b\s*(my|the|a)?\s*(task|todo|to do|item)?\s*', '', cleaned, flags=re.IGNORECASE)
        query = parse_task_query(cleaned)
        response['reply'] = 'I can delete that task. Please confirm first.'
        response['action'] = {'type': 'delete_task', 'params': {'task_query': query}}
        response['confidence'] = 0.92
        response['needs_confirmation'] = True
        return response

    # Reopen task
    if any(phrase in command for phrase in ['reopen task', 'mark pending', 'undo complete']):
        cleaned = re.sub(r'^(reopen task|mark pending|undo complete)\s*', '', raw, flags=re.IGNORECASE)
        query = parse_task_query(cleaned)
        response['reply'] = 'I will reopen that task.'
        response['action'] = {'type': 'update_task', 'params': {'task_query': query, 'status': 'pending'}}
        response['confidence'] = 0.87
        return response

    # In progress → start timer
    if re.search(r'\b(put|mark|set|move)\b.{0,40}\b(in progress|in-progress|as in progress)\b', command) or \
       re.search(r'\b(start working on|working on)\b', command):
        cleaned = re.sub(r'^(put|mark|set|move|start working on|working on)\s*(the|a)?\s*(task)?\s*', '', raw, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*(in progress|in-progress|as in progress)\s*$', '', cleaned, flags=re.IGNORECASE).strip()
        query = parse_task_query(cleaned)
        response['reply'] = f'Starting a 25-minute timer for {query}.' if query else 'Starting a 25-minute pomodoro timer.'
        response['action'] = {'type': 'start_timer', 'params': {'duration': 25, 'timer_type': 'pomodoro', 'task_query': query}}
        response['confidence'] = 0.88
        return response

    # Set priority
    if 'priority' in command and any(word in command for word in ['set', 'change', 'make']):
        priority = None
        if 'high' in command or 'urgent' in command:
            priority = 'high'
        elif 'low' in command:
            priority = 'low'
        elif 'medium' in command or 'normal' in command:
            priority = 'medium'
        cleaned = re.sub(r'^(set|change|make)\s*(the)?\s*priority\s*(to)?\s*(high|medium|low|normal|urgent)?\s*(for)?\s*', '', raw, flags=re.IGNORECASE)
        query = parse_task_query(cleaned)
        if priority:
            response['reply'] = f'I will set that task priority to {priority}.'
            response['action'] = {'type': 'update_task', 'params': {'task_query': query, 'priority': priority}}
            response['confidence'] = 0.85
            return response

    # Set category
    if 'category' in command and any(word in command for word in ['set', 'change', 'make']):
        cleaned = re.sub(r'^(set|change|make)\s*(the)?\s*category\s*(to)?\s*', '', raw, flags=re.IGNORECASE)
        category = cleaned.strip() or ''
        response['reply'] = 'I will update the task category.'
        response['action'] = {'type': 'update_task', 'params': {'category': category}}
        response['confidence'] = 0.75
        return response

    # Summary
    if any(phrase in command for phrase in ['show summary', 'today summary', 'how was my day', 'what did i do today', 'my summary']):
        response['reply'] = 'Here is your summary for today.'
        response['action'] = {'type': 'summary_today', 'params': {}}
        response['confidence'] = 0.9
        return response

    # Stop timer
    if any(phrase in command for phrase in ['stop timer', 'pause timer', 'end timer', 'cancel timer']):
        response['reply'] = 'Stopping your active timer.'
        response['action'] = {'type': 'stop_timer', 'params': {}}
        response['confidence'] = 0.95
        return response

    # Start timer
    if any(phrase in command for phrase in ['start timer', 'start pomodoro', 'begin timer', 'start a timer']):
        duration_match = re.search(r'(\d+)\s*(min|mins|minute|minutes)', command)
        duration = int(duration_match.group(1)) if duration_match else 25
        timer_type = 'pomodoro' if 'pomodoro' in command else 'manual'
        response['reply'] = f'Starting a {duration}-minute timer.'
        response['action'] = {'type': 'start_timer', 'params': {'duration': duration, 'timer_type': timer_type}}
        response['confidence'] = 0.92
        return response

    # Set reminder
    if any(word in command for word in ['remind', 'reminder', 'alert me']):
        hour_m = re.search(r'in\s+(\d+)\s*(hour|hours|hr|hrs)', command)
        min_m = re.search(r'in\s+(\d+)\s*(minute|minutes|min|mins)', command)
        in_minutes = 30
        if hour_m:
            in_minutes = int(hour_m.group(1)) * 60
        elif min_m:
            in_minutes = int(min_m.group(1))
        reminder_message = re.sub(r'^(remind|set reminder|reminder|alert me)\s*(me)?\s*(to)?', '', raw, flags=re.IGNORECASE).strip()
        reminder_message = reminder_message or 'Reminder'
        response['reply'] = f'Creating a reminder in {in_minutes} minutes.'
        response['action'] = {'type': 'set_reminder', 'params': {'message': reminder_message, 'in_minutes': in_minutes}}
        response['confidence'] = 0.88
        return response

    # Complete task
    if any(word in command for word in ['complete', 'finish', 'mark done', 'done task', 'mark as done', 'mark as complete']):
        query = re.sub(r'(complete|finish|mark|done|task|as|that)', '', raw, flags=re.IGNORECASE).strip()
        response['reply'] = 'I will mark that task complete.' if query else 'I will complete your most recent pending task.'
        response['action'] = {'type': 'complete_task', 'params': {'task_query': query}}
        response['confidence'] = 0.82
        return response

    # Task creation inference
    task_details = infer_task_details(raw, command)
    if task_details:
        if not task_details['title']:
            response['reply'] = 'Tell me the task title so I can create it.'
            response['action'] = {'type': 'create_task', 'params': {'title': ''}}
            response['missing_fields'] = ['title']
            response['confidence'] = 0.72
            return response

        response['reply'] = f'Got it! Creating task: {task_details["title"]}.'
        response['action'] = {
            'type': 'create_task',
            'params': {
                'title': task_details['title'],
                'priority': task_details['priority'],
                'due_date': task_details['due_date'],
                'status': 'pending'
            }
        }
        response['missing_fields'] = []
        response['confidence'] = 0.9 if 'due' in command or 'assignment' in command else 0.78
        return response

    return response


def ai_assistant_parse(command_text, context=None, history=None, now_iso=None):
    """Parse a command into structured actions using OpenAI GPT with conversation memory."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return fallback_assistant_parse(command_text, now_iso)

    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    context = context or {}
    history = history or []
    pending_tasks = context.get('pending_tasks', [])
    task_reminders = context.get('task_reminders', [])
    last_mentioned_task = context.get('last_mentioned_task')

    try:
        now = datetime.fromisoformat(now_iso) if now_iso else datetime.utcnow()
    except Exception:
        now = datetime.utcnow()

    now_str = now.strftime('%A, %B %d, %Y %H:%M')
    tomorrow_str = (now + timedelta(days=1)).strftime('%Y-%m-%dT17:00:00')
    today_str = (now).strftime('%Y-%m-%dT17:00:00')

    system_prompt = (
        f'You are the AI voice assistant for VoicePro, a productivity app. Today is {now_str} (UTC). '
        f'When user says "tomorrow" use date {tomorrow_str}. When user says "today" use {today_str}. '
        f'You have full conversation memory — use prior turns to resolve pronouns like "it", "that task", "the last one". '
        'Parse the user spoken command (may have typos, contractions, or informal phrasing) into structured JSON. '
        'Return ONLY valid JSON, no markdown fences.\n\n'
        'ALLOWED ACTION TYPES (use exactly these strings):\n'
        '  create_task         - add/log/create/I need to do/I have to X\n'
        '  complete_task       - mark done/finish/X is done (task_query: task name)\n'
        '  clear_completed_tasks - delete/remove all completed tasks (needs_confirmation: true)\n'
        '  delete_task         - delete/remove/trash a task (task_query: name, needs_confirmation: true)\n'
        '  update_task         - change priority/category/due_date/status of a task\n'
        '  start_timer         - start a timer or pomodoro\n'
        '  stop_timer          - stop the current running timer\n'
        '  log_timer           - manually log past time spent (duration in minutes, task_query optional)\n'
        '  delete_timer        - delete a specific past timer (timer_query: string, needs_confirmation: true)\n'
        '  set_reminder        - create a reminder (message: string, in_minutes: int)\n'
        '  cancel_reminder     - cancel/dismiss a reminder (reminder_query: string)\n'
        '  update_reminder     - change the time of a reminder (reminder_query: string, in_minutes: int)\n'
        '  navigate            - go to a page (route: /, /tasks, /timer, /calendar, /analytics, /settings)\n'
        '  summary_today       - show today summary / productivity stats\n'
        '  analytics_period    - show productivity analytics for a given period (period: "week", "month", or "year")\n'
        '  list_tasks          - user wants to hear/see their pending tasks. Extracts optional filters: due_date (ISO 8601), category (string), priority (high/medium/low).\n'
        '  list_reminders      - user wants to hear/see their active reminders\n'
        '  clear_timers_history - wipe all timer history (needs_confirmation: true)\n'
        '  none                - greeting, unclear, or completely out of scope\n\n'
        'CRITICAL RULES:\n'
        '1. For create_task: extract title, priority (high/medium/low), category, due_date (ISO 8601), reminder_offset (minutes before due_date). '
        '   Extract ALL fields you can infer from a single sentence. Do NOT leave title empty unless user gave no task name. '
        '   EXTREMELY IMPORTANT: For the `title`, strip out the conversational wrapper words. If user says "log in cloud computing assignment as a task with medium priority and in the category cc", the title should safely be JUST "cloud computing assignment". Remove words like "log in", "add", "as a task", "with", "and in the category", etc. '
        '   Valid categories: Client Work, Meeting, Admin, Bills & utilities (or any custom name user mentions like "CC"). '
        '   Map acronyms or custom categories directly to the `category` field rather than leaving them in the title.\n'
        '2. "put/mark/set task X in progress" or "working on X" → start_timer with duration=25, timer_type=pomodoro.\n'
        '3. "mark X done/complete" or "finish X" → complete_task with task_query=X.\n'
        '4. "delete/remove/trash X" → delete_task, needs_confirmation=true.\n'
        '5. For update_task: valid status = pending, completed, cancelled ONLY (NO in_progress).\n'
        '6. For start_timer: duration (int minutes, default 25), timer_type (manual or pomodoro).\n'
        '7. For navigate: route must be one of /, /tasks, /timer, /calendar, /analytics, /settings.\n'
        '8. Use pending_tasks list AND the last_mentioned_task for exact task_query matching when user says "it" or "that task".\n'
        '   EXTREMELY IMPORTANT: For update_task and delete_task `task_query`, strip out filler words like "the", "task", "tasks", "my". If user says "change the priority of AI assignment tasks to low", the task_query must be JUST "AI assignment".\n'
        '9. For update_reminder, extract the reminder_query and the new in_minutes offset.\n'
        '10. For list_tasks, if user says "due tomorrow", extract due_date. If "high priority", extract priority. If "CC category", extract category.\n'
        '11. For analytics_period, extract period ("week", "month", or "year"). For log_timer, extract duration in minutes.\n'
        '12. Tolerate typos and informal speech — infer the most likely intent.\n'
        '13. PERSONALITY & RESPONSES (CRITICAL):\n'
        '   - Be extremely casual, brief, and sound like a real human assistant (like Siri or Alexa).\n'
        '   - NEVER use robotic phrasing like "I have successfully created your task" or "Task deleted."\n'
        '   - **VARIATION RULE**: Rotate your responses so they never sound repetitive. Never start with "Got it" more than once in a row.\n'
        '   - EXAMPLES OF [CREATE] VARIATIONS (Pick randomly):\n'
        '     * "Got groceries down for tomorrow."\n'
        '     * "Added that for tomorrow."\n'
        '     * "You\'re all set for tomorrow."\n'
        '     * "Done. Put it on your list."\n'
        '   - EXAMPLES OF [TIMER] VARIATIONS (Pick randomly):\n'
        '     * "Starting that now. Have a good session!"\n'
        '     * "25 minutes on the clock."\n'
        '     * "Count down is running."\n'
        '   - Notice how they never sound like a computer. Mimic this extreme variation.\n'
        '   - Keep it to one short sentence.\n\n'
        'JSON schema: {"reply": string, "action": {"type": string, "params": object}, '
        '"confidence": number, "needs_confirmation": boolean, "missing_fields": string[]}'
    )

    # Build messages array with conversation history
    messages = [{'role': 'system', 'content': system_prompt}]

    # Add conversation history (up to last 12 turns)
    for turn in history[-12:]:
        role = turn.get('role', 'user')
        content = turn.get('content', '')
        if role in ('user', 'assistant') and content:
            messages.append({'role': role, 'content': content})

    # Current user message with context
    user_payload = {
        'command': command_text,
        'pending_tasks': pending_tasks[:25],
        'active_reminders': task_reminders[:10],
        'last_mentioned_task': last_mentioned_task,
    }
    messages.append({'role': 'user', 'content': json.dumps(user_payload)})

    body = {
        'model': model,
        'temperature': 0.1,
        'response_format': {'type': 'json_object'},
        'messages': messages
    }

    req = urllib_request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=json.dumps(body).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        },
        method='POST'
    )

    try:
        with urllib_request.urlopen(req, timeout=20) as res:
            payload = json.loads(res.read().decode('utf-8'))
            content = payload['choices'][0]['message']['content']
            parsed = json.loads(content)

            action = parsed.get('action') or {}
            action_type = action.get('type', 'none')
            allowed = {
                'create_task', 'complete_task', 'start_timer', 'stop_timer',
                'set_reminder', 'cancel_reminder', 'navigate', 'summary_today',
                'delete_task', 'update_task', 'clear_timers_history',
                'list_tasks', 'list_reminders', 'none'
            }
            if action_type not in allowed:
                return fallback_assistant_parse(command_text, now_iso)

            return {
                'reply': parsed.get('reply', 'Done.'),
                'action': {
                    'type': action_type,
                    'params': action.get('params', {})
                },
                'confidence': float(parsed.get('confidence', 0.6)),
                'needs_confirmation': bool(parsed.get('needs_confirmation', False)),
                'missing_fields': parsed.get('missing_fields', [])
            }
    except (HTTPError, URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError) as exc:
        print(f'[ai_assistant_parse] GPT call failed: {exc}. Using fallback.')
        return fallback_assistant_parse(command_text, now_iso)


@voice_bp.route('/assistant-command', methods=['POST'])
@jwt_required()
def assistant_command():
    """AI-first command parser endpoint used by global assistant."""
    try:
        _ = int(get_jwt_identity())
        data = request.get_json() or {}
        command_text = (data.get('command') or '').strip()
        if not command_text:
            return jsonify({'message': 'Command text is required'}), 400

        context = data.get('context') or {}
        history = data.get('history') or []
        now_iso = data.get('now_iso') or None

        assistant_result = ai_assistant_parse(command_text, context, history, now_iso)

        return jsonify({
            'success': True,
            'assistant': assistant_result
        }), 200
    except Exception as e:
        print(f'[assistant_command] Error: {e}')
        return jsonify({
            'success': True,
            'assistant': {
                'reply': 'I had trouble understanding that. Could you try again?',
                'action': {'type': 'none', 'params': {}},
                'confidence': 0.0,
                'needs_confirmation': False,
                'missing_fields': []
            }
        }), 200
