// Links into the OpenSCAD Playground (ochafik.com/openscad2), a free,
// browser-only build of OpenSCAD. The whole project travels in the URL
// fragment as gzipped, base64 JSON, so nothing is uploaded anywhere.
//
// Gotcha: a tab (or iframe) that already has the Playground open ignores a new
// fragment. Always load a link in a fresh tab, or remount the iframe.

const PLAYGROUND = 'https://ochafik.com/openscad2/';

export interface PlaygroundView {
  editor?: boolean;
  customizer?: boolean;
}

export async function playgroundUrl(code: string, view: PlaygroundView = {}): Promise<string> {
  const state = {
    params: {
      activePath: '/design.scad',
      sources: [{ path: '/design.scad', content: code }],
      features: ['lazy-union'],
      exportFormat2D: 'svg',
      exportFormat3D: 'stl',
    },
    view: {
      layout: { mode: 'multi', editor: view.editor ?? false, viewer: true, customizer: view.customizer ?? false },
      color: '#e8965a',
      showAxes: true,
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  const gz = await new Response(new Response(bytes).body!.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  const u8 = new Uint8Array(gz);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return PLAYGROUND + '#' + btoa(bin);
}

export interface CodeNumber {
  line: number;
  name: string;
  value: string;
  isText: boolean;
  comment: string;
}

// Top-level `name = value; // comment` lines with a plain number or a quoted
// string: the knobs a kid can turn without touching the rest of the code.
const NUMBER_LINE = /^([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?|"[^"\n]*")\s*;\s*(?:\/\/\s*(.*))?$/;

export function findNumbers(code: string): CodeNumber[] {
  const out: CodeNumber[] = [];
  code.split('\n').forEach((text, line) => {
    const m = text.match(NUMBER_LINE);
    if (m && !m[1].startsWith('$')) {
      out.push({ line, name: m[1], value: m[2], isText: m[2].startsWith('"'), comment: m[3] ?? '' });
    }
  });
  return out.slice(0, 30);
}

export function setNumber(code: string, n: CodeNumber, value: string): string {
  const lines = code.split('\n');
  const clean = n.isText ? `"${value.replace(/"/g, '')}"` : value;
  lines[n.line] = lines[n.line].replace(NUMBER_LINE, (_all, name, _old, comment) =>
    `${name} = ${clean};${comment ? ` // ${comment}` : ''}`);
  return lines.join('\n');
}
