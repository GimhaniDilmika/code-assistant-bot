'use strict';

const MODES = {
  generate: { label: 'Code Generator',    hint: 'Describe what you want to build',          inputLabel: 'Your request',  runLabel: 'Generate Code',   loading: 'Generating code...' },
  fix:      { label: 'Bug Fixer',          hint: 'Paste your broken code below',             inputLabel: 'Broken code',   runLabel: 'Fix Bug',         loading: 'Fixing bugs...' },
  explain:  { label: 'Code Explainer',     hint: 'Paste any code to get a plain explanation',inputLabel: 'Code to explain',runLabel: 'Explain Code',   loading: 'Analysing code...' },
  refactor: { label: 'Code Refactor',      hint: 'Paste code to clean up and improve',       inputLabel: 'Code to refactor',runLabel: 'Refactor',      loading: 'Refactoring...' },
  convert:  { label: 'Language Converter', hint: 'Paste code and choose target language',    inputLabel: 'Source code',   runLabel: 'Convert',         loading: 'Converting...' },
  test:     { label: 'Test Writer',        hint: 'Paste a function or class to test',        inputLabel: 'Code to test',  runLabel: 'Write Tests',     loading: 'Writing tests...' },
};

let currentMode = 'generate';
let lastResult  = '';
let lastLanguage = 'Python';

// ── Mode switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    applyMode(currentMode);
  });
});

function applyMode(mode) {
  const m = MODES[mode];
  document.getElementById('mode-title').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> ${m.label}`;
  document.getElementById('mode-hint').textContent = m.hint;
  document.getElementById('input-label').textContent = m.inputLabel;
  document.getElementById('run-label').textContent = m.runLabel;
  document.getElementById('user-input').placeholder = getPlaceholder(mode);
  document.getElementById('convert-target-row').style.display = mode === 'convert' ? 'block' : 'none';
  document.getElementById('output-section').style.display = 'none';
  document.getElementById('run-hint').textContent = '';
}

function getPlaceholder(mode) {
  const p = {
    generate: 'e.g. A function that takes a list of numbers and returns the top 3 largest values',
    fix:      'Paste your buggy code here...',
    explain:  'Paste any code here to get a plain-English explanation...',
    refactor: 'Paste code to refactor and improve...',
    convert:  'Paste source code here...',
    test:     'Paste a function or class to generate unit tests for...',
  };
  return p[mode] || '';
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function runMode() {
  const input    = document.getElementById('user-input').value.trim();
  const language = document.getElementById('language-select').value;
  const target   = document.getElementById('target-language-select').value;

  if (!input) {
    document.getElementById('run-hint').textContent = 'Please enter some input first.';
    return;
  }

  lastLanguage = language;
  const btn = document.getElementById('run-btn');
  btn.disabled = true;
  document.getElementById('output-section').style.display = 'none';
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('loading-text').textContent = MODES[currentMode].loading;
  document.getElementById('run-hint').textContent = '';

  try {
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: currentMode, language, input, extra: target }),
    });

    const data = await res.json();
    document.getElementById('loading').style.display = 'none';

    if (data.error) {
      document.getElementById('run-hint').textContent = 'Error: ' + data.error;
      btn.disabled = false;
      return;
    }

    lastResult = data.result;
    renderOutput(data.result, data.mode_label, language);

  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('run-hint').textContent = 'Connection error. Is the server running?';
  }

  btn.disabled = false;
}

function renderOutput(text, modeLabel, language) {
  const section = document.getElementById('output-section');
  const content = document.getElementById('output-content');
  document.getElementById('output-label').textContent = modeLabel + ' · ' + language;
  section.style.display = 'flex';

  // Extract code blocks for syntax highlighting
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let hasCode = false;
  let html = '';
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    hasCode = true;
    if (match.index > lastIndex) {
      html += `<div class="output-text">${escapeHtml(text.slice(lastIndex, match.index))}</div>`;
    }
    const lang = match[1] || language.toLowerCase();
    const code = match[2].trim();
    html += `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    html += `<div class="output-text">${escapeHtml(text.slice(lastIndex))}</div>`;
  }

  if (!hasCode) {
    html = `<div class="output-text">${escapeHtml(text)}</div>`;
  }

  content.innerHTML = html;
  content.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Copy & Download ───────────────────────────────────────────────────────────
function copyOutput() {
  if (!lastResult) return;
  navigator.clipboard.writeText(lastResult).then(() => {
    const btn = document.querySelector('.icon-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    setTimeout(() => btn.innerHTML = orig, 1500);
  });
}

function downloadOutput() {
  if (!lastResult) return;
  const ext = getExtension(lastLanguage);
  const blob = new Blob([lastResult], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `codebot_output.${ext}`;
  a.click();
}

function getExtension(lang) {
  const map = { Python:'py', JavaScript:'js', TypeScript:'ts', Java:'java', 'C++':'cpp', 'C#':'cs', Go:'go', Rust:'rs', PHP:'php', Ruby:'rb', Swift:'swift', Kotlin:'kt', SQL:'sql', Bash:'sh', 'HTML/CSS':'html' };
  return map[lang] || 'txt';
}

// ── Clear ─────────────────────────────────────────────────────────────────────
function clearAll() {
  document.getElementById('user-input').value = '';
  document.getElementById('output-section').style.display = 'none';
  document.getElementById('run-hint').textContent = '';
  lastResult = '';
}

// ── History ───────────────────────────────────────────────────────────────────
function toggleHistory() {
  const panel = document.getElementById('history-panel');
  const isVisible = panel.style.display !== 'none';
  panel.style.display = isVisible ? 'none' : 'flex';
  panel.style.flexDirection = 'column';
  if (!isVisible) loadHistory();
}

async function loadHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3)">Loading...</div>';
  try {
    const res = await fetch('/api/history');
    const items = await res.json();
    if (!items.length) {
      list.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3)">No history yet.</div>';
      return;
    }
    list.innerHTML = items.map(item => `
      <div class="history-item" onclick="loadHistoryItem(${JSON.stringify(item.input).replace(/"/g,'&quot;')}, ${JSON.stringify(item.response).replace(/"/g,'&quot;')}, '${item.mode}', '${item.language}')">
        <div class="history-mode">${item.mode}</div>
        <div class="history-preview">${item.input.slice(0, 60)}${item.input.length > 60 ? '…' : ''}</div>
        <div class="history-time">${new Date(item.created_at).toLocaleString()}</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3)">Failed to load history.</div>';
  }
}

function loadHistoryItem(input, response, mode, language) {
  document.getElementById('user-input').value = input;
  lastResult = response;
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  applyMode(mode);
  renderOutput(response, MODES[mode]?.label || mode, language);
  toggleHistory();
}

// ── Keyboard shortcut: Ctrl+Enter to run ─────────────────────────────────────
document.getElementById('user-input').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runMode();
});

// Init
applyMode('generate');
document.getElementById('run-hint').textContent = 'Tip: Press Ctrl+Enter to run';
