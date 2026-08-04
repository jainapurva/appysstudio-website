/**
 * OpenSCAD render worker.
 *
 * Runs off the main thread on purpose. OpenSCAD's wasm build is a synchronous
 * emscripten `callMain` — rendering on the request thread would stall every
 * other visitor for the duration, and this box is shared. One worker per
 * render, then it exits: the wasm module cannot be re-entered (a second
 * callMain throws an exit status), so reuse buys nothing anyway.
 *
 * Plain .mjs, resolved by path at runtime rather than imported, so webpack
 * leaves it alone and Next copies it into the standalone build verbatim (see
 * outputFileTracingIncludes in next.config.ts).
 */

import { parentPort, workerData } from 'node:worker_threads';
import { createOpenSCAD } from 'openscad-wasm';

const { source, defines } = workerData;

async function run() {
  const logs = [];
  const openscad = await createOpenSCAD({
    print: (text) => logs.push(text),
    printErr: (text) => logs.push(text),
  });
  const fs = openscad.getInstance().FS;

  fs.writeFile('/model.scad', source);

  // --backend=manifold is not a nicety. On CGAL, the default, a twisted vase
  // takes 39s; on Manifold the same file with byte-identical output takes 0.4s.
  // Nothing here is affordable inside a request without it.
  const args = [
    '/model.scad',
    '-o',
    '/out.stl',
    '--export-format',
    'binstl',
    '--backend=manifold',
  ];
  for (const define of defines) args.push('-D', define);

  let status;
  try {
    status = openscad.getInstance().callMain(args);
  } catch (err) {
    // Emscripten signals a non-zero exit by throwing; treat it as a failure
    // rather than a crash so the caller gets the SCAD log instead of a stack.
    status = typeof err === 'number' ? err : 1;
  }

  if (status !== 0) {
    throw new Error(`OpenSCAD exited ${status}: ${tailOf(logs)}`);
  }

  let stl;
  try {
    stl = fs.readFile('/out.stl');
  } catch {
    throw new Error(`OpenSCAD produced no output: ${tailOf(logs)}`);
  }
  if (!stl || stl.length < 84) {
    // 84 bytes is an empty binary STL: an 80-byte header plus a zero count.
    throw new Error(`OpenSCAD produced an empty model: ${tailOf(logs)}`);
  }

  // Copy out of the wasm heap before it is torn down, and hand ownership to the
  // parent so a multi-MB mesh is moved rather than structured-cloned.
  const bytes = new Uint8Array(stl.length);
  bytes.set(stl);
  parentPort.postMessage({ ok: true, stl: bytes }, [bytes.buffer]);
}

/** SCAD errors are the last thing in the log; the geometry stats above are noise. */
function tailOf(logs) {
  const interesting = logs.filter((line) => /error|warning|unknown|ignoring/i.test(line));
  const chosen = interesting.length > 0 ? interesting : logs;
  return chosen.slice(-4).join(' | ').slice(0, 500) || 'no output';
}

run().catch((err) => {
  parentPort.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
});
