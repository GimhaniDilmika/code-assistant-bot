from flask import Flask, request, jsonify, render_template
import anthropic
import sqlite3
import uuid
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

DB_PATH = "database/history.db"

# ─── System Prompts per Mode ──────────────────────────────────────────────────

SYSTEM_PROMPTS = {
    "generate": """You are an expert software engineer and code generator.
When asked to write code:
- Write clean, well-structured, production-quality code
- Add brief comments explaining key parts
- Follow best practices for the language requested
- Include example usage at the bottom as a comment
- Return ONLY the code block, no extra explanation unless asked""",

    "fix": """You are an expert debugger and code reviewer.
When given broken or buggy code:
- Identify all bugs and errors
- Return the fully fixed code
- After the code block, add a short section titled '# What was fixed:' listing each fix
- Be precise and thorough""",

    "explain": """You are a patient and clear coding tutor.
When asked to explain code:
- Explain what the code does overall in 1-2 sentences
- Then go through it section by section in simple English
- Use analogies when helpful
- Assume the reader is a beginner unless told otherwise
- Do NOT rewrite the code, just explain it""",

    "refactor": """You are a senior software engineer specializing in clean code.
When asked to refactor code:
- Improve readability, structure, and performance
- Follow SOLID principles where applicable
- Add proper docstrings and comments
- Return the refactored code followed by '# What changed:' section listing improvements""",

    "convert": """You are a polyglot software engineer fluent in all programming languages.
When asked to convert code from one language to another:
- Preserve the exact logic and functionality
- Use idiomatic patterns of the target language
- Add a comment at the top showing original and target language
- Return ONLY the converted code block""",

    "test": """You are a QA engineer and testing expert.
When asked to write unit tests:
- Write comprehensive unit tests covering happy path, edge cases, and error cases
- Use the appropriate testing framework for the language (pytest for Python, Jest for JS, JUnit for Java, etc.)
- Add a comment explaining what each test checks
- Return ONLY the test code""",
}

MODE_LABELS = {
    "generate": "Code Generator",
    "fix":      "Bug Fixer",
    "explain":  "Code Explainer",
    "refactor": "Code Refactor",
    "convert":  "Language Converter",
    "test":     "Test Writer",
}

# ─── Database Setup ───────────────────────────────────────────────────────────

def init_db():
    os.makedirs("database", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            mode TEXT,
            language TEXT,
            user_input TEXT,
            ai_response TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_history(mode, language, user_input, ai_response):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO history VALUES (?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), mode, language, user_input, ai_response, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_history(limit=20):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, mode, language, user_input, ai_response, created_at FROM history ORDER BY created_at DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [{"id": r[0], "mode": r[1], "language": r[2], "input": r[3], "response": r[4], "created_at": r[5]} for r in rows]

def delete_history_item(item_id):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM history WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/process", methods=["POST"])
def process():
    data = request.get_json()
    mode     = data.get("mode", "generate")
    language = data.get("language", "Python")
    user_input = data.get("input", "").strip()
    extra    = data.get("extra", "")  # e.g. target language for convert

    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    if mode not in SYSTEM_PROMPTS:
        return jsonify({"error": "Invalid mode"}), 400

    # Build user message based on mode
    if mode == "generate":
        message = f"Write the following in {language}:\n\n{user_input}"
    elif mode == "fix":
        message = f"Fix this {language} code:\n\n```{language.lower()}\n{user_input}\n```"
    elif mode == "explain":
        message = f"Explain this {language} code:\n\n```{language.lower()}\n{user_input}\n```"
    elif mode == "refactor":
        message = f"Refactor this {language} code:\n\n```{language.lower()}\n{user_input}\n```"
    elif mode == "convert":
        target = extra or "JavaScript"
        message = f"Convert this {language} code to {target}:\n\n```{language.lower()}\n{user_input}\n```"
        language = f"{language} → {target}"
    elif mode == "test":
        message = f"Write unit tests for this {language} code:\n\n```{language.lower()}\n{user_input}\n```"

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPTS[mode],
            messages=[{"role": "user", "content": message}],
        )
        result = response.content[0].text
        save_history(mode, language, user_input, result)
        return jsonify({
            "result": result,
            "mode": mode,
            "mode_label": MODE_LABELS.get(mode, mode),
            "language": language,
            "timestamp": datetime.now().strftime("%H:%M"),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def history():
    return jsonify(get_history())


@app.route("/api/history/<item_id>", methods=["DELETE"])
def delete_history(item_id):
    delete_history_item(item_id)
    return jsonify({"success": True})


@app.route("/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
