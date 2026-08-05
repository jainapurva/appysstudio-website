/**
 * OpenSCAD render process.
 *
 * A forked child rather than a worker thread, and that choice is about memory,
 * not isolation. A render spikes RSS by ~200MB. In a worker thread that spike
 * lands in the server's own process, and glibc keeps the freed pages in its
 * arena afterwards rather than returning them — measured on production, the
 * service settled at 250MB and stayed there. In a child it goes away with the
 * process: the parent measured 37MB before and 50MB after three renders.
 *
 * Production is a t3.micro with 914MB shared between this and several other
 * services, so 200MB held for nothing is worth more than the ~600ms a fresh
 * process costs to start.
 *
 * The job arrives over IPC rather than argv — a traced paint-kit outline can
 * run to hundreds of kilobytes of SCAD, which is uncomfortably close to
 * ARG_MAX. The mesh goes back over stdout, which is a pipe and does not care
 * how big it is.
 *
 * Plain .mjs, resolved by path at runtime rather than imported, so webpack
 * leaves it alone and Next copies it into the standalone build verbatim (see
 * outputFileTracingIncludes in next.config.ts).
 */

import { createOpenSCAD } from 'openscad-wasm';

/** SCAD errors are the last thing in the log; the geometry stats above are noise. */
function tailOf(logs) {
  const interesting = logs.filter((line) => /error|warning|unknown|ignoring/i.test(line));
  const chosen = interesting.length > 0 ? interesting : logs;
  return chosen.slice(-4).join(' | ').slice(0, 500) || 'no output';
}

function fail(message) {
  if (process.send) process.send({ error: message });
  process.exit(1);
}

async function render({ source, defines }) {
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

  if (status !== 0) return fail(`OpenSCAD exited ${status}: ${tailOf(logs)}`);

  let stl;
  try {
    stl = fs.readFile('/out.stl');
  } catch {
    return fail(`OpenSCAD produced no output: ${tailOf(logs)}`);
  }
  // 84 bytes is an empty binary STL: an 80-byte header plus a zero count.
  if (!stl || stl.length < 84) {
    return fail(`OpenSCAD produced an empty model: ${tailOf(logs)}`);
  }

  // Wait for the pipe to drain before exiting, or a multi-megabyte mesh gets
  // truncated on the way out.
  process.stdout.write(Buffer.from(stl), () => process.exit(0));
}

process.on('message', (job) => {
  render(job).catch((err) => fail(err instanceof Error ? err.message : String(err)));
});
