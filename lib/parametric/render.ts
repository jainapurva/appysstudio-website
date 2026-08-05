/**
 * Render a .scad file to a mesh.
 *
 * The work happens in a forked child (see render.child.mjs) with a hard
 * timeout, so a pathological parameter combination costs one process rather
 * than the site — and its ~200MB of wasm heap is returned to the OS when it
 * exits, which a worker thread's would not be.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'module';
import os from 'node:os';

/**
 * child_process, fetched out of the bundler's sight.
 *
 * Importing a node builtin normally here — with or without the `node:` prefix —
 * panics Turbopack's file tracer during `next build`:
 *
 *     NftJsonAsset: cannot handle filepath node:worker_threads
 *
 * which fails the whole build, not just this route. process.getBuiltinModule is
 * a plain method call, so the specifier never enters the module graph and there
 * is nothing for the tracer to resolve. It is also a real function at runtime
 * under both Next and vitest, which a hidden dynamic import is not: Vite's
 * module runner has no import callback to hand an evaluated one.
 *
 * getBuiltinModule arrived in Node 20.16 / 22.3; older versions fall through to
 * createRequire, which has always been there. Either way the specifier is a
 * string argument rather than an import, which is the whole trick.
 */
type NodeWithBuiltins = NodeJS.Process & {
  getBuiltinModule?: (id: string) => unknown;
};

function childProcess(): typeof import('child_process') {
  const get = (process as NodeWithBuiltins).getBuiltinModule;
  if (typeof get === 'function') {
    return get.call(process, 'child_process') as typeof import('child_process');
  }
  // Older Node: go through a require anchored at the app root. Also invisible
  // to the tracer, and it means the deployed box's Node version cannot quietly
  // turn this whole feature off.
  return createRequire(path.join(process.cwd(), 'package.json'))(
    'child_process'
  ) as typeof import('child_process');
}

/** Generous enough for the heaviest model at its largest settings, short enough
 * that a runaway render is capped. Every model is checked against this in tests. */
export const RENDER_TIMEOUT_MS = 20_000;

/**
 * How many renders may run at once, and how many may wait.
 *
 * Not a tuning knob — a memory bound, sized to the machine it lands on. Each
 * render costs ~200MB of resident memory while it runs. Previews fire on page
 * load, so four open tabs is an ordinary thing a visitor does. Unbounded, that
 * is an out-of-memory kill, not a slow page.
 *
 * Beyond the cap, queue a little and then shed: a visitor told "busy, try again"
 * is better off than one holding a connection open behind a queue that cannot
 * drain inside the timeout.
 */
function defaultConcurrency(): number {
  const override = Number(process.env.PARAMETRIC_MAX_CONCURRENT);
  if (Number.isFinite(override) && override >= 1) return Math.floor(override);

  // One render spikes RSS by roughly 200MB (measured: 60MB baseline -> 257MB
  // mid-render -> back to 39MB once idle, so it is a spike rather than a leak).
  // Budget a slot per 700MB of total RAM and never fewer than one.
  //
  // Production is a t3.micro: 914MB total, ~270MB available, and 1.2GB of its
  // 2GB swap already in use because the box is shared with several other
  // services. That arithmetic gives exactly one slot, which is the honest
  // answer — two concurrent renders there would go straight into swap.
  const totalMb = os.totalmem() / (1024 * 1024);
  return Math.min(4, Math.max(1, Math.floor(totalMb / 700)));
}

const MAX_CONCURRENT = defaultConcurrency();
// With one slot, six queued means the last one waits about twelve seconds.
// Four keeps the worst wait under the queue timeout with room to spare.
const MAX_QUEUED = Math.max(0, Number(process.env.PARAMETRIC_MAX_QUEUED ?? 4));
const QUEUE_TIMEOUT_MS = 15_000;

/** Thrown when the queue is full or a wait times out; the route maps it to 503. */
export class RenderBusyError extends Error {
  constructor() {
    super('The generator is busy right now. Try again in a moment.');
    this.name = 'RenderBusyError';
  }
}

let active = 0;
const waiting: Array<() => void> = [];

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) {
    // Hand the slot straight over rather than decrementing first, so a burst
    // of callers resuming from the queue cannot briefly exceed the cap.
    next();
    return;
  }
  active--;
}

async function takeSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  if (waiting.length >= MAX_QUEUED) throw new RenderBusyError();

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const at = waiting.indexOf(wake);
      if (at >= 0) waiting.splice(at, 1);
      reject(new RenderBusyError());
    }, QUEUE_TIMEOUT_MS);

    const wake = () => {
      clearTimeout(timer);
      resolve();
    };
    waiting.push(wake);
  });
}

/** Live counters plus the limits they are held to. The limits are derived from
 * the machine, so tests assert against these rather than a hardcoded number. */
export function renderQueueState(): {
  active: number;
  waiting: number;
  maxConcurrent: number;
  maxQueued: number;
} {
  return {
    active,
    waiting: waiting.length,
    maxConcurrent: MAX_CONCURRENT,
    maxQueued: MAX_QUEUED,
  };
}

const childPath = () => path.join(process.cwd(), 'lib', 'parametric', 'render.child.mjs');
const scadPath = (file: string) => path.join(process.cwd(), 'assets', 'parametric', file);

/** SCAD sources are small and unchanging; read each one once per process. */
const sourceCache = new Map<string, Promise<string>>();

export async function loadScad(file: string): Promise<string> {
  if (!/^[a-z0-9_-]+\.scad$/.test(file)) {
    throw new Error(`refusing to load "${file}": not a plain .scad filename`);
  }
  let cached = sourceCache.get(file);
  if (!cached) {
    cached = readFile(scadPath(file), 'utf8');
    // Don't cache a failed read — a missing file during a deploy shouldn't
    // poison the process for good.
    cached.catch(() => sourceCache.delete(file));
    sourceCache.set(file, cached);
  }
  return cached;
}

export interface RenderResult {
  /** Binary STL. */
  stl: Buffer;
  ms: number;
}

/**
 * Run OpenSCAD over `source` with the given `-D` assignments.
 *
 * `defines` must already be sanitised — see toDefines() in spec.ts. Nothing
 * here re-checks them, because by this point they are supposed to have been
 * rebuilt from the manifest rather than from caller input.
 */
export async function renderScad(source: string, defines: string[]): Promise<RenderResult> {
  await takeSlot();
  try {
    return await runRender(source, defines);
  } finally {
    releaseSlot();
  }
}

function runRender(source: string, defines: string[]): Promise<RenderResult> {
  const started = Date.now();
  const { fork } = childProcess();

  return new Promise((resolve, reject) => {
    const child = fork(childPath(), [], {
      // stdout carries the mesh, stderr is inherited so a crash shows up in
      // the service log, and IPC carries the job and any error message.
      stdio: ['ignore', 'pipe', 'inherit', 'ipc'],
    });

    const chunks: Buffer[] = [];
    let failure: string | null = null;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() =>
        reject(new Error('That combination took too long to build. Try smaller numbers.'))
      );
    }, RENDER_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('message', (msg: { error?: string }) => {
      if (msg && typeof msg.error === 'string') failure = msg.error;
    });

    child.on('error', (err) => {
      child.kill('SIGKILL');
      finish(() => reject(err));
    });

    child.on('close', (code) => {
      if (failure) return finish(() => reject(new Error(failure!)));
      if (code !== 0) {
        return finish(() => reject(new Error(`render process exited ${code}`)));
      }
      const stl = Buffer.concat(chunks);
      if (stl.length < 84) {
        return finish(() => reject(new Error('render produced no usable output')));
      }
      finish(() => resolve({ stl, ms: Date.now() - started }));
    });

    child.send({ source, defines });
  });
}
