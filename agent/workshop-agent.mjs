#!/usr/bin/env node
// Workshop design agent: a tiny HTTP server that runs `claude -p` for each
// request and streams Claude's text back. appysstudio.com's
// /api/workshop/design forwards kids' prompts here when WORKSHOP_AGENT_URL is
// set.
//
// It runs on an Anthropic API key only. `--bare` makes Claude Code use
// ANTHROPIC_API_KEY and never read an OAuth/subscription login or keychain, and
// each run gets an empty, private config dir, so nothing from a Claude login
// on the host is visible. No dependencies: `node workshop-agent.mjs`.

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
const MAX_BODY = 64 * 1024;

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
function runClaude({ system, prompt }, onText, signal) {
  return new Promise(resolve => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'workshop-agent-'));
    const args = [
      '-p', '--bare',
      '--model', MODEL,
      '--system-prompt', system,
      '--tools', '',
      '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
      '--no-session-persistence', '--disable-slash-commands',
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
      fs.rm(home, { recursive: true, force: true }, () => {});
      if (code !== 0 && !error) error = `exit ${code}: ${stderr.slice(-300)}`;
      resolve(error);
    });
    child.on('error', err => { error = err.message; });
  });
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
    res.end(JSON.stringify({ ok: true, model: MODEL, running, queued: waiting.length }));
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

  const slot = acquire();
  if (!slot) {
    res.writeHead(503, { 'Retry-After': '30' }).end('busy');
    return;
  }
  const controller = new AbortController();
  res.on('close', () => controller.abort());   // kid closed the page: stop the run
  await slot;
  if (controller.signal.aborted) { release(); return; }   // left while queued

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  const started = Date.now();
  try {
    const error = await runClaude(job, text => res.write(text), controller.signal);
    if (error && error !== 'aborted') {
      log('run failed:', error);
      res.write(error === 'timeout'
        ? '\n\n[[ERROR]] That took too long. Try asking for one part at a time.'
        : '\n\n[[ERROR]] The AI had a problem. Try again.');
    }
    log(`run ${error ? 'ended (' + error + ')' : 'ok'} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } finally {
    release();
    res.end();
  }
});

server.listen(PORT, HOST, () => log(`workshop-agent on http://${HOST}:${PORT}, model ${MODEL}, max ${MAX_RUNNING} at once`));
