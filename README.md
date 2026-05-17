# Code Assistant Bot — Project 2

A full-stack AI-powered coding assistant with 6 modes, syntax highlighting, history, and file download.

## Features

| Mode | What it does |
|------|-------------|
| Generate | Write code from a plain English description |
| Fix Bug | Paste broken code, get it fixed with explanation |
| Explain | Get a plain-English explanation of any code |
| Refactor | Improve code quality, structure, and readability |
| Convert | Convert code between programming languages |
| Write Tests | Auto-generate unit tests for any function |

## Quick Start

```bash
# 1. Enter the project
cd code-assistant-bot

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Add your API key
copy .env.example .env       # Windows
cp .env.example .env         # Mac/Linux
# Edit .env and add your ANTHROPIC_API_KEY

# 5. Run
python app.py
```

Visit **http://localhost:5000**

---

## Project Structure

```
code-assistant-bot/
├── app.py                  # Flask backend — 6 mode endpoints + history
├── requirements.txt
├── .env.example
├── database/
│   └── history.db          # Auto-created SQLite database
├── templates/
│   └── index.html          # Main UI with mode selector
└── static/
    ├── css/style.css        # Dark editor theme
    └── js/app.js            # Frontend logic + syntax highlighting
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main UI |
| POST | `/api/process` | Process code (all 6 modes) |
| GET | `/api/history` | Get last 20 history items |
| DELETE | `/api/history/<id>` | Delete a history item |
| GET | `/health` | Health check |

### POST /api/process

```json
{
  "mode": "generate",
  "language": "Python",
  "input": "A function that sorts a list of dictionaries by a key",
  "extra": "JavaScript"
}
```

**mode options:** `generate` | `fix` | `explain` | `refactor` | `convert` | `test`

**Response:**
```json
{
  "result": "```python\ndef sort_dicts...",
  "mode": "generate",
  "mode_label": "Code Generator",
  "language": "Python",
  "timestamp": "14:32"
}
```

---

## Tech Stack

- Python 3.10+ / Flask 3.x
- Anthropic Claude API (`claude-sonnet-4-20250514`)
- SQLite (history storage)
- Highlight.js (syntax highlighting)
- Vanilla JS — no framework needed

## Production Tips

- Replace SQLite with PostgreSQL for multi-user deployments
- Add user authentication (Flask-Login)
- Rate limit the `/api/process` endpoint (Flask-Limiter)
- Deploy on Railway, Render, or Fly.io
- Set `DEBUG=False` in production
