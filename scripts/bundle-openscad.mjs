/**
 * Copy openscad-wasm into the standalone build.
 *
 * Next's file tracing will not do this. The package is only ever loaded by
 * lib/parametric/render.worker.mjs, and a worker listed in
 * outputFileTracingIncludes is copied verbatim rather than parsed — so nothing
 * in the traced module graph mentions openscad-wasm and it never gets picked
 * up. Listing `./node_modules/openscad-wasm/**` as an include does not help
 * either: tracing includes skip node_modules paths entirely (verified against
 * the emitted .nft.json, which lists the worker and the .scad files but never
 * the package).
 *
 * The alternative was vendoring the 13MB bundle into assets/ next to the
 * keycap parts library. Deliberately not done: this repo is public and
 * openscad-wasm is GPL-2.0, so committing the build would be redistributing it
 * and would pull in a source-offer obligation. Kept as a dependency it only
 * ever reaches our own server, which is not distribution.
 *
 * Runs as npm's `postbuild`, so both `npm run build` in CI and the local
 * deploy_to_aws.sh path get it, and both rsync `.next/standalone/` afterwards.
 */

import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const PACKAGE = 'openscad-wasm';
const root = process.cwd();
const from = path.join(root, 'node_modules', PACKAGE);
const standalone = path.join(root, '.next', 'standalone');
const to = path.join(standalone, 'node_modules', PACKAGE);

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standalone))) {
  // A non-standalone build has nothing to copy into. Not an error — `next dev`
  // and a plain build both resolve the package from the real node_modules.
  console.log(`[${PACKAGE}] no standalone output; nothing to copy`);
  process.exit(0);
}

if (!(await exists(from))) {
  console.error(
    `[${PACKAGE}] missing from node_modules — the parametric generator ` +
      `cannot render without it. Run npm install.`
  );
  process.exit(1);
}

await mkdir(path.dirname(to), { recursive: true });
await cp(from, to, { recursive: true });

// The whole point is that the deployed server can resolve it, so prove it did.
const entry = path.join(to, 'openscad.js');
if (!(await exists(entry))) {
  console.error(`[${PACKAGE}] copy finished but ${entry} is not there`);
  process.exit(1);
}

const { size } = await stat(entry);
console.log(`[${PACKAGE}] copied into standalone (${(size / 1e6).toFixed(1)} MB)`);
