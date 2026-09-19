#!/usr/bin/env node
// Workshop design agent: a tiny HTTP server that runs `claude -p` for each
// request and streams Claude's text back. appysstudio.com's
// /api/workshop/design forwards kids' prompts here when WORKSHOP_AGENT_URL is
// set.
//
// It runs on an Anthropic API key only. `--bare` makes Claude Code use
// ANTHROPIC_API_KEY and never read an OAuth/subscription login or keychain, and
// every run uses its own private config dir (a throwaway one, or the kid's
// session folder), so nothing from a Claude login on the host is visible.
//
// Sessions work like Swayat's per-chat sessions: when the website sends a
// sessionId, the kid's first message starts a Claude session and later ones
// resume it (`--session-id` / `--resume`). No dependencies:
// `node workshop-agent.mjs`.

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN = process.env.AGENT_TOKEN || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const MAX_RUNNING = Number(process.env.MAX_RUNNING || 3);    // each run is a ~200MB Node process
const MAX_QUEUED = Number(process.env.MAX_QUEUED || 12);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 180_000);
const MAX_BODY = 96 * 1024;
// Persistent per-kid sessions, like Swayat's per-chat sessions: the first
// message starts a Claude session in its own folder, later ones resume it.
const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(os.homedir(), 'workshop-agent', 'sessions');
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 48) * 3600_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('workshop-agent: ANTHROPIC_API_KEY is required. This agent only runs on an API key.');
  process.exit(1);
}
if (!TOKEN) {
  console.error('workshop-agent: AGENT_TOKEN is required (the shared secret the website sends).');
  process.exit(1);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ------------------------------------------------------------- concurrency
let running = 0;
const waiting = [];

function acquire() {
  if (running < MAX_RUNNING) { running++; return Promise.resolve(); }
  if (waiting.length >= MAX_QUEUED) return null;
  return new Promise(resolve => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next(); else running--;
}

// ------------------------------------------------------------------ claude
// session: null = one-off run in a throwaway dir; { id, resume } = a kid's
// persistent session (its folder is HOME and the Claude config dir).
function runClaude({ system, prompt }, session, onText, signal) {
  return new Promise(resolve => {
    const home = session
      ? path.join(SESSIONS_DIR, session.id)
      : fs.mkdtempSync(path.join(os.tmpdir(), 'workshop-agent-'));
    if (session) fs.mkdirSync(home, { recursive: true, mode: 0o700 });
    const args = [
      '-p', '--bare',
      '--model', MODEL,
      '--system-prompt', system,
      '--tools', '',
      '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
      '--disable-slash-commands',
      ...(session
        ? (session.resume ? ['--resume', session.id] : ['--session-id', session.id])
        : ['--no-session-persistence']),
    ];
    const child = spawn(CLAUDE_BIN, args, {
      cwd: home,
      env: {
        PATH: process.env.PATH,
        HOME: home,
        CLAUDE_CONFIG_DIR: home,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let streamed = false;
    let buffer = '';
    let stderr = '';
    let error = '';
    const timer = setTimeout(() => { error = 'timeout'; child.kill('SIGKILL'); }, TIMEOUT_MS);
    const abort = () => { error = error || 'aborted'; child.kill('SIGKILL'); };
    signal.addEventListener('abort', abort, { once: true });

    child.stdout.on('data', chunk => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        const ev = msg.type === 'stream_event' ? msg.event : null;
        if (msg.type === 'system' && msg.subtype === 'api_retry' && [400, 401, 402, 403].includes(msg.error_status)) {
          // A bad or unfunded key: the CLI would retry ~10 times before giving
          // up, leaving the kid staring at a spinner. Stop now instead.
          error = `config: ${msg.error_status} ${msg.error}`;
          child.kill('SIGKILL');
        } else if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          streamed = true;
          onText(ev.delta.text);
        } else if (msg.type === 'result') {
          if (msg.is_error) error = error || String(msg.result || msg.subtype || 'error');
          else if (!streamed && typeof msg.result === 'string') onText(msg.result);
        }
      }
    });
    child.stderr.on('data', c => { stderr += c; });
    child.stdin.end(prompt);

    child.on('close', code => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (!session) fs.rm(home, { recursive: true, force: true }, () => {});
      if (code !== 0 && !error) error = `exit ${code}: ${stderr.slice(-300)}`;
      resolve({ error, streamed });
    });
    child.on('error', err => { error = err.message; });
  });
}

// --------------------------------------------------------------- sessions
const busySessions = new Set();

function sessionStarted(id) {
  return fs.existsSync(path.join(SESSIONS_DIR, id, '.started'));
}

function markStarted(id) {
  fs.writeFileSync(path.join(SESSIONS_DIR, id, '.started'), new Date().toISOString());
}

function sweepSessions() {
  let entries = [];
  try { entries = fs.readdirSync(SESSIONS_DIR); } catch { return; }
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const name of entries) {
    const dir = path.join(SESSIONS_DIR, name);
    try {
      if (fs.statSync(dir).mtimeMs < cutoff) fs.rmSync(dir, { recursive: true, force: true });
    } catch { /* already gone */ }
  }
}

// Run one message in a kid's session: resume it if it exists, otherwise start
// it from the full transcript the website sends (which also rebuilds a
// session lost to a restart or the cleanup).
async function runInSession(job, id, onText, signal) {
  const dir = path.join(SESSIONS_DIR, id);
  const fresh = () => {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Mark it started BEFORE the run: even if this run dies, Claude has
    // claimed the session id inside dir, so the next message must resume.
    markStarted(id);
    return runClaude({ system: job.system, prompt: job.transcript || job.prompt }, { id, resume: false }, onText, signal);
  };

  if (sessionStarted(id)) {
    const again = await runClaude({ system: job.system, prompt: job.prompt }, { id, resume: true }, onText, signal);
    if (!again.error || again.streamed || again.error === 'aborted' || again.error.startsWith('config:')) return again;
    log(`session ${id.slice(0, 8)} could not resume (${again.error.slice(0, 80)}); starting it again`);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const first = await fresh();
  // A run that died before Claude wrote its transcript leaves the id claimed
  // but unresumable; clearing the folder releases it.
  if (first.error && !first.streamed && /already in use/i.test(first.error)) {
    log(`session ${id.slice(0, 8)} id was stuck; clearing it and retrying`);
    fs.rmSync(dir, { recursive: true, force: true });
    return fresh();
  }
  return first;
}

// ------------------------------------------------------------------- http
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      parts.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let sessions = 0;
    try { sessions = fs.readdirSync(SESSIONS_DIR).length; } catch { /* none yet */ }
    res.end(JSON.stringify({ ok: true, model: MODEL, running, queued: waiting.length, sessions }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/run') {
    res.writeHead(404).end();
    return;
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end('unauthorized');
    return;
  }

  let job;
  try {
    job = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (typeof job?.system !== 'string' || typeof job?.prompt !== 'string' || !job.prompt.trim()) {
    res.writeHead(400).end('system and prompt are required');
    return;
  }
  const sessionId = job.sessionId == null ? null : String(job.sessionId).toLowerCase();
  if (sessionId !== null && !UUID.test(sessionId)) {
    res.writeHead(400).end('sessionId must be a UUID');
    return;
  }
  if (sessionId && busySessions.has(sessionId)) {
    res.writeHead(409).end('this session is still thinking');
    return;
  }

  const slot = acquire();
  if (!slot) {
    res.writeHead(503, { 'Retry-After': '30' }).end('busy');
    return;
  }
  if (sessionId) busySessions.add(sessionId);
  const controller = new AbortController();
  res.on('close', () => controller.abort());   // kid closed the page: stop the run
  await slot;
  if (controller.signal.aborted) {   // left while queued
    release();
    if (sessionId) busySessions.delete(sessionId);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  const started = Date.now();
  try {
    const write = text => res.write(text);
    const { error } = sessionId
      ? await runInSession(job, sessionId, write, controller.signal)
      : await runClaude(job, null, write, controller.signal);
    if (error && error !== 'aborted') {
      log('run failed:', error);
      res.write(error === 'timeout'
        ? '\n\n[[ERROR]] That took too long. Try asking for one part at a time.'
        : '\n\n[[ERROR]] The AI had a problem. Try again.');
    }
    const who = sessionId ? `session ${sessionId.slice(0, 8)}` : 'run';
    log(`${who} ${error ? 'ended (' + error + ')' : 'ok'} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } finally {
    release();
    if (sessionId) busySessions.delete(sessionId);
    res.end();
  }
});

fs.mkdirSync(SESSIONS_DIR, { recursive: true, mode: 0o700 });
sweepSessions();
setInterval(sweepSessions, 3600_000).unref();

server.listen(PORT, HOST, () => log(`workshop-agent on http://${HOST}:${PORT}, model ${MODEL}, max ${MAX_RUNNING} at once`));
