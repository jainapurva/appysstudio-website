/**
 * Geometry checks for generated meshes.
 *
 * These exist because "the render succeeded" and "the STL is watertight" both
 * stay true for models that are quietly broken — a vase whose wall has opened
 * into a spiral ribbon, or an articulated chain that printed as one fused lump.
 * Each of those shipped at some point during this work and neither raised an
 * error anywhere. What follows is what actually catches them.
 */

/** Every edge of a closed surface is shared by exactly two triangles. */
export function openEdgeCount(stl: Buffer): number {
  const tris = stl.readUInt32LE(80);
  const edges = new Map<string, number>();

  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50 + 12;
    const corners: string[] = [];
    for (let v = 0; v < 3; v++) {
      const at = base + v * 12;
      corners.push(
        `${stl.readFloatLE(at)},${stl.readFloatLE(at + 4)},${stl.readFloatLE(at + 8)}`
      );
    }
    for (let e = 0; e < 3; e++) {
      const a = corners[e];
      const b = corners[(e + 1) % 3];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }

  let open = 0;
  for (const count of edges.values()) if (count !== 2) open++;
  return open;
}

export function triangleCount(stl: Buffer): number {
  return stl.readUInt32LE(80);
}

/**
 * Enclosed volume in mm³, by the divergence theorem over the triangles.
 *
 * Useful where a cavity opens to the outside and so does not show up as a
 * second loop in a slice — a socket you can put a finger into cuts as one
 * C-shaped outline, exactly like a solid block would.
 */
export function volume(stl: Buffer): number {
  const tris = stl.readUInt32LE(80);
  let total = 0;

  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50 + 12;
    const p: number[][] = [];
    for (let v = 0; v < 3; v++) {
      const at = base + v * 12;
      p.push([stl.readFloatLE(at), stl.readFloatLE(at + 4), stl.readFloatLE(at + 8)]);
    }
    const [a, b, c] = p;
    total +=
      (a[0] * (b[1] * c[2] - c[1] * b[2]) -
        a[1] * (b[0] * c[2] - c[0] * b[2]) +
        a[2] * (b[0] * c[1] - c[0] * b[1])) /
      6;
  }
  return Math.abs(total);
}

export function bounds(stl: Buffer): { min: number[]; max: number[]; size: number[] } {
  const tris = stl.readUInt32LE(80);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50 + 12;
    for (let v = 0; v < 3; v++) {
      const at = base + v * 12;
      const p = [stl.readFloatLE(at), stl.readFloatLE(at + 4), stl.readFloatLE(at + 8)];
      for (let i = 0; i < 3; i++) {
        if (p[i] < min[i]) min[i] = p[i];
        if (p[i] > max[i]) max[i] = p[i];
      }
    }
  }
  return { min, max, size: [0, 1, 2].map((i) => max[i] - min[i]) };
}

/**
 * Disconnected bodies in the mesh.
 *
 * A print-in-place hinge has to come out as separate shells. One shell means
 * the links share plastic and the chain prints rigid.
 */
export function shellCount(stl: Buffer): number {
  const tris = stl.readUInt32LE(80);
  const ids = new Map<string, number>();
  const parent: number[] = [];

  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50 + 12;
    const corner: number[] = [];
    for (let v = 0; v < 3; v++) {
      const at = base + v * 12;
      const key = `${stl.readFloatLE(at)},${stl.readFloatLE(at + 4)},${stl.readFloatLE(at + 8)}`;
      let id = ids.get(key);
      if (id === undefined) {
        id = parent.length;
        parent.push(id);
        ids.set(key, id);
      }
      corner.push(id);
    }
    union(corner[0], corner[1]);
    union(corner[1], corner[2]);
  }

  const roots = new Set<number>();
  for (const id of ids.values()) roots.add(find(id));
  return roots.size;
}

/**
 * Closed loops in a horizontal slice.
 *
 * A vessel that holds water cuts as exactly two loops at mid-height: an outer
 * wall and an inner one. More than that and the wall has broken open — which
 * looks like a design flourish in a render and leaks on the windowsill.
 */
export function crossSectionLoops(stl: Buffer, z: number): number {
  const tris = stl.readUInt32LE(80);
  const links = new Map<string, string[]>();

  const key = (x: number, y: number) => `${Math.round(x * 200)},${Math.round(y * 200)}`;

  for (let t = 0; t < tris; t++) {
    const base = 84 + t * 50 + 12;
    const p: number[][] = [];
    for (let v = 0; v < 3; v++) {
      const at = base + v * 12;
      p.push([stl.readFloatLE(at), stl.readFloatLE(at + 4), stl.readFloatLE(at + 8)]);
    }

    const hits: [number, number][] = [];
    for (let e = 0; e < 3; e++) {
      const a = p[e];
      const b = p[(e + 1) % 3];
      if ((a[2] - z) * (b[2] - z) < 0) {
        const f = (z - a[2]) / (b[2] - a[2]);
        hits.push([a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])]);
      }
    }
    if (hits.length !== 2) continue;

    const ka = key(hits[0][0], hits[0][1]);
    const kb = key(hits[1][0], hits[1][1]);
    if (ka === kb) continue;
    if (!links.has(ka)) links.set(ka, []);
    if (!links.has(kb)) links.set(kb, []);
    links.get(ka)!.push(kb);
    links.get(kb)!.push(ka);
  }

  const seen = new Set<string>();
  let loops = 0;
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    loops++;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const node = stack.pop()!;
      for (const next of links.get(node) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
  }
  return loops;
}
