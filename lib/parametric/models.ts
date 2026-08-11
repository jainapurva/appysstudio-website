/**
 * The parametric model catalogue.
 *
 * One entry per .scad file in assets/parametric. Adding a model here is the
 * whole job: it appears on the generator hub and the parametric index, gets a
 * customiser page at /3d-generator/parametric/<slug>, and becomes downloadable
 * from /api/parametric/<slug>. No new route, no new page, no nav change.
 *
 * Ranges are not decoration. Every render happens inside a web request on a
 * shared box, so min/max are what stop someone asking for a 400mm vase at 4000
 * facets; __tests__/lib/parametric.test.ts renders each model at the corners of
 * its declared range and holds it to a time budget.
 */

import { assertValidParamDefs, type ParamDef } from './spec';

export interface ParametricModel {
  slug: string;
  /**
   * Whether a physical test print has confirmed this one actually works.
   *
   * Apurva's rule, 2026-08-04: nothing unverified goes on the site. Geometry
   * checks settle most of it — watertight, right dimensions, holds water,
   * tessellates — but some properties only a printer can answer. The
   * articulated chain is the case in point: the mesh says four separate bodies
   * at exactly 0.350mm of clearance, and whether those joints actually come
   * free off the plate is not a question a mesh can answer.
   *
   * Unverified models keep their .scad and their tests. They just are not
   * reachable: no card, no page, and the endpoint 404s. Flip this to true once
   * one has been printed.
   */
  verified: boolean;
  /** File under assets/parametric. */
  file: string;
  name: string;
  /** One line for the catalogue card. */
  blurb: string;
  /** Longer intro for the model's own page. */
  intro: string;
  tag: string;
  params: ParamDef[];
  /**
   * Bodies to render separately so a 3MF can carry them as distinct objects,
   * which is what lets a slicer put a different filament on each. Rendering is
   * one pass per entry, so keep the list short.
   *
   * `partKey` is the SCAD variable that selects one; `previewPart` is the value
   * used for the customiser's single-mesh preview.
   *
   * `assembly` says which bodies belong in the same place. Parts that share one
   * keep the coordinates OpenSCAD gave them, because their registration is the
   * whole point — an inlay has to sit in its pocket. Parts that do not are laid
   * out beside each other, since a body that is a separate physical piece has
   * no business intersecting another one on the plate.
   */
  partKey?: string;
  parts?: { value: string; name: string; needsLogo?: boolean; assembly?: string }[];
  previewPart?: string;
  /** Practical notes shown next to the form — print orientation, materials. */
  notes: string[];
  /** Rough print time and orientation advice, shown under the preview. */
  printHint: string;
  /**
   * "Or have us print them" — the paid path beside the free download.
   *
   * Only models we are actually willing to make in quantity declare this, so
   * the card is manifest-driven like everything else here: no per-model page,
   * no second place to remember. It rides on the model page, which means the
   * `verified` gate covers it too — an unprinted design cannot be sold any more
   * than it can be downloaded.
   */
  bulkOrder?: {
    unitPrice: number;
    minQuantity: number;
    /** What the unit price covers, listed under the price. */
    includes: string[];
  };
}

export const PARAMETRIC_MODELS: ParametricModel[] = [
  {
    slug: 'logo-clicker',
    // Geometry is checked, but whether the cap actually clicks on a real MX
    // switch is a question only a printer and a switch can answer.
    verified: false,
    file: 'logo_clicker.scad',
    name: 'Logo Clicker',
    blurb:
      'A desk clicker built around a keyboard switch, with your logo inlaid flush into the cap. Upload an SVG or PNG and pick a shape.',
    intro:
      'The logo is not printed on top — it is a pocket cut into the cap face and a matching piece that fills it, so the surface stays flat and the colour goes all the way through. The cap comes out face-down on the plate, which puts the logo in the first few layers against the build sheet: no supports, no bridging, and the smoothest face the printer can give. Drop a Cherry-MX style switch into the base and the cap presses straight onto its stem.',
    tag: 'Free',
    partKey: 'part',
    parts: [
      { value: 'cap', name: 'Cap', assembly: 'cap' },
      // Only exists once artwork has been uploaded. OpenSCAD treats "nothing
      // to export" as an error, so this body is skipped rather than rendered
      // and caught — matching on an error string would risk swallowing a real
      // failure.
      { value: 'logo', name: 'Logo inlay', needsLogo: true, assembly: 'cap' },
      // The base is a second piece printed alongside, not part of the cap.
      { value: 'base', name: 'Base', assembly: 'base' },
    ],
    previewPart: 'preview',
    params: [
      {
        kind: 'logo', key: 'logo', label: 'Your logo',
        placeholder: 'SVG or PNG — a solid shape on a plain background works best',
        help: 'Traced in your browser, so the image itself never leaves your machine.',
      },
      {
        kind: 'choice', key: 'shape', label: 'Shape', default: 'circle',
        options: [
          { value: 'circle', label: 'Circle' },
          { value: 'square', label: 'Rounded square' },
          { value: 'rectangle', label: 'Rectangle' },
          { value: 'pill', label: 'Pill' },
        ],
      },
      { kind: 'number', key: 'cap_width', label: 'Cap width', unit: 'mm', min: 24, max: 48, step: 1, default: 33 },
      { kind: 'number', key: 'cap_depth', label: 'Cap depth', unit: 'mm', min: 24, max: 48, step: 1, default: 26, help: 'Rectangle only — the other shapes stay square on this axis.' },
      { kind: 'number', key: 'corner_radius', label: 'Corner rounding', unit: 'mm', min: 0, max: 12, step: 0.5, default: 4, help: 'Square and rectangle only.' },
      { kind: 'number', key: 'logo_size', label: 'Logo size', unit: 'mm', min: 6, max: 44, step: 0.5, default: 22, help: 'Across the longest axis. Anything past the face edge is trimmed.' },
      { kind: 'number', key: 'logo_depth', label: 'Inlay depth', unit: 'mm', min: 0.2, max: 2, step: 0.1, default: 0.8, help: '0.8mm is four layers at 0.2mm.' },
      { kind: 'number', key: 'logo_bleed', label: 'Line thickening', unit: 'mm', min: -0.6, max: 0.6, step: 0.05, default: 0, help: 'Nudge up if your logo has hairline strokes that would print mushy.' },
    ],
    notes: [
      'Needs a Cherry-MX style switch — any of the cheap clicky ones work.',
      'The cap and the inlay come out as separate bodies in the 3MF, so assign a filament to each in your slicer.',
      'Both colours sit in the same first few layers, so this wants an AMS or a second extruder — a filament swap cannot do it.',
      'A logo with strokes thinner than about 0.8mm will print soft. Raise the line thickening or scale it up.',
    ],
    printHint:
      'Cap prints face-down, base prints as-is. No supports. Around 1h 45m for all three bodies at 0.2mm — the base is most of it.',
    bulkOrder: {
      unitPrice: 5,
      minQuantity: 25,
      includes: [
        'Printed in your two colours, logo inlaid flush',
        'A clicky switch fitted — it arrives working',
        'Compact 24mm cap, the size the price is built around',
      ],
    },
  },
  {
    slug: 'twisty-vase',
    verified: true,
    file: 'twisty_vase.scad',
    name: 'Twisty Vase & Planter',
    blurb:
      'A ribbed profile wound into a spiral. Set the twist and the ribs and no two come out alike.',
    intro:
      'The ribs and the twist are independent, so the same vase can be a gentle fluted pot or a hard spiral. Add a drain hole and it is a planter instead.',
    tag: 'Free',
    params: [
      { kind: 'number', key: 'diameter', label: 'Diameter', unit: 'mm', min: 50, max: 180, step: 5, default: 90 },
      { kind: 'number', key: 'height', label: 'Height', unit: 'mm', min: 50, max: 250, step: 5, default: 140 },
      { kind: 'number', key: 'lobes', label: 'Ribs', unit: '', min: 3, max: 12, step: 1, default: 6, help: 'How many ridges run up the side.' },
      { kind: 'number', key: 'twist', label: 'Twist', unit: '°', min: 0, max: 360, step: 15, default: 180, help: 'Rotation from bottom to top. 0 is a straight fluted vase.' },
      { kind: 'number', key: 'taper', label: 'Flare', unit: '%', min: 60, max: 140, step: 5, default: 105, help: 'Top width against the base. Under 100 narrows toward the top.' },
      { kind: 'number', key: 'depth', label: 'Rib depth', unit: '%', min: 4, max: 40, step: 2, default: 14, help: 'Deep ribs are capped automatically at the point the wall would open up.' },
      { kind: 'number', key: 'wall', label: 'Wall', unit: 'mm', min: 1.2, max: 4, step: 0.2, default: 2.4 },
      { kind: 'bool', key: 'drain', label: 'Drainage hole', default: false, help: 'Makes it a planter. Leave off to hold water.' },
    ],
    notes: [
      'Prints upright with no supports. Vase mode works if you set the wall to a single perimeter in your slicer.',
      'Deep ribs on a thin wall would break the vase open, so the rib depth is capped at whatever the wall can carry — past that point the shape simply stops getting deeper.',
    ],
    printHint: 'Upright, no supports. A 90 × 140mm vase is roughly 4–6 hours at 0.2mm.',
  },
  {
    slug: 'spinning-top',
    verified: true,
    file: 'spinning_top.scad',
    name: 'Spinning Top',
    blurb:
      'Weight in the rim, not the middle — that is what makes one spin for a minute instead of five seconds.',
    intro:
      'A top spins for as long as its mass sits far from the axis. The rim setting is that trade made explicit: a heavy outer ring on a thin web outlasts a solid disc of the same weight.',
    tag: 'Free',
    params: [
      { kind: 'number', key: 'body_diameter', label: 'Diameter', unit: 'mm', min: 25, max: 80, step: 1, default: 46 },
      { kind: 'number', key: 'body_height', label: 'Rim depth', unit: 'mm', min: 5, max: 20, step: 0.5, default: 9 },
      { kind: 'number', key: 'rim', label: 'Rim width', unit: 'mm', min: 2, max: 15, step: 0.5, default: 5, help: 'Wider rim, longer spin.' },
      { kind: 'number', key: 'web', label: 'Web thickness', unit: 'mm', min: 1.2, max: 6, step: 0.2, default: 2.4, help: 'The thin disc inside the rim. Keep it light.' },
      { kind: 'number', key: 'stem_height', label: 'Stem height', unit: 'mm', min: 10, max: 50, step: 1, default: 26 },
      { kind: 'number', key: 'stem_diameter', label: 'Stem thickness', unit: 'mm', min: 4, max: 14, step: 0.5, default: 8 },
      {
        kind: 'choice', key: 'tip', label: 'Tip', default: 'point',
        options: [
          { value: 'point', label: 'Point — fastest, needs a smooth surface' },
          { value: 'round', label: 'Round — wanders, forgiving' },
          { value: 'flat', label: 'Flat — slowest, most stable' },
        ],
      },
      { kind: 'number', key: 'flutes', label: 'Grip notches', unit: '', min: 0, max: 12, step: 1, default: 0 },
    ],
    notes: [
      'Prints tip-down with no supports.',
      'A splash of paint or a coin epoxied into the rim adds mass exactly where it helps most.',
    ],
    printHint: 'As oriented, tip down. Under an hour at 0.2mm.',
  },
  {
    slug: 'cookie-cutter',
    verified: true,
    file: 'cookie_cutter.scad',
    name: 'Cookie Cutter & Clay Stamp',
    blurb:
      'Six shapes, any size, in cutter or stamp form. A thin edge to cut with and a ledge to press on.',
    intro:
      'The wall is what cuts and the flange is what you press — without the flange a tall thin ribbon digs into your hand and flexes out of shape. Switch to stamp and the same outline presses a line into clay instead of cutting through it.',
    tag: 'Free',
    params: [
      {
        kind: 'choice', key: 'shape', label: 'Shape', default: 'heart',
        options: [
          { value: 'circle', label: 'Circle' },
          { value: 'square', label: 'Rounded square' },
          { value: 'hexagon', label: 'Hexagon' },
          { value: 'star', label: 'Star' },
          { value: 'heart', label: 'Heart' },
          { value: 'flower', label: 'Flower' },
        ],
      },
      { kind: 'number', key: 'size', label: 'Size', unit: 'mm', min: 30, max: 140, step: 5, default: 70, help: 'Across the cut shape. The flange adds to this.' },
      { kind: 'number', key: 'height', label: 'Cut depth', unit: 'mm', min: 8, max: 30, step: 1, default: 18 },
      { kind: 'number', key: 'wall', label: 'Edge thickness', unit: 'mm', min: 0.6, max: 2, step: 0.1, default: 0.9, help: 'Thin cuts cleanly. Under 0.8 is fragile.' },
      { kind: 'number', key: 'flange', label: 'Finger ledge', unit: 'mm', min: 0, max: 12, step: 1, default: 5 },
      { kind: 'number', key: 'points', label: 'Points / petals', unit: '', min: 3, max: 12, step: 1, default: 5, help: 'Star and flower only.' },
      {
        kind: 'choice', key: 'mode', label: 'Type', default: 'cutter',
        options: [
          { value: 'cutter', label: 'Cutter — cuts all the way through' },
          { value: 'stamp', label: 'Stamp — presses a line, with a handle' },
        ],
      },
    ],
    notes: [
      'Prints flat with no supports.',
      'PLA or PETG, and wash it in warm water rather than hot — a dishwasher will soften the edge out of shape.',
    ],
    printHint: 'Flat on the plate, no supports. 20–40 minutes at 0.2mm.',
  },
  {
    slug: 'finger-extensions',
    // Needs one test print to confirm the hinge frees. Off the site until then.
    verified: false,
    file: 'finger_extensions.scad',
    name: 'Articulated Finger Extensions',
    blurb:
      'A socket for your fingertip and a chain of links that bend. Printed already assembled.',
    intro:
      'The joints are printed in place — pins already sitting inside their sockets — so it comes off the plate moving, with nothing to clip together. It is the fiddliest thing here to print, and the clearance setting is the one that decides whether it works.',
    tag: 'Free',
    params: [
      { kind: 'number', key: 'segments', label: 'Links', unit: '', min: 2, max: 6, step: 1, default: 3 },
      { kind: 'number', key: 'segment_length', label: 'Link length', unit: 'mm', min: 18, max: 45, step: 1, default: 26 },
      { kind: 'number', key: 'finger_width', label: 'Fingertip width', unit: 'mm', min: 13, max: 26, step: 0.5, default: 19, help: 'Measure across your fingertip, not around it.' },
      { kind: 'number', key: 'finger_height', label: 'Fingertip depth', unit: 'mm', min: 9, max: 22, step: 0.5, default: 15 },
      { kind: 'number', key: 'socket_depth', label: 'Socket depth', unit: 'mm', min: 15, max: 45, step: 1, default: 26 },
      { kind: 'number', key: 'thickness', label: 'Link thickness', unit: 'mm', min: 8, max: 20, step: 0.5, default: 12, help: 'The hinge lives inside this, so thinner links mean a weaker joint.' },
      { kind: 'number', key: 'clearance', label: 'Joint clearance', unit: 'mm', min: 0.2, max: 0.6, step: 0.05, default: 0.35, help: '0.35 suits a well-tuned 0.4mm nozzle. Raise it if the joints come out stiff.' },
      { kind: 'bool', key: 'claw', label: 'Tapered claw tip', default: true },
    ],
    notes: [
      'Print it flat, exactly as generated, with no supports. The hinge pins stand vertically so every moving gap is a vertical gap — laid on its side instead, the joints fuse solid.',
      'Joint clearance is printer-specific. If the links come out stuck, flex them firmly once before reprinting; if that fails, add 0.05mm and try again.',
    ],
    printHint: 'Flat, no supports, no brim under the joints. About 1–2 hours at 0.2mm.',
  },
  {
    slug: 'stackable-box',
    verified: true,
    file: 'stackable_box.scad',
    name: 'Stackable Organizer Box',
    blurb:
      'Our organizer box at whatever size you actually need, with dividers where you want them.',
    intro:
      'The catalogue box is 4 × 3 × 2 inches. This is the same box with the numbers handed over — set the size and the compartments and the geometry is built around them, so the price is exact rather than confirmed later.',
    tag: 'Free',
    params: [
      { kind: 'number', key: 'length', label: 'Length', unit: 'mm', min: 50, max: 240, step: 5, default: 100 },
      { kind: 'number', key: 'width', label: 'Width', unit: 'mm', min: 40, max: 200, step: 5, default: 75 },
      { kind: 'number', key: 'height', label: 'Height', unit: 'mm', min: 20, max: 140, step: 5, default: 50 },
      { kind: 'number', key: 'wall', label: 'Wall', unit: 'mm', min: 1.2, max: 4, step: 0.2, default: 2 },
      { kind: 'number', key: 'corner', label: 'Corner radius', unit: 'mm', min: 0, max: 20, step: 1, default: 6 },
      { kind: 'number', key: 'divisions_long', label: 'Dividers across the length', unit: '', min: 0, max: 6, step: 1, default: 0 },
      { kind: 'number', key: 'divisions_wide', label: 'Dividers across the width', unit: '', min: 0, max: 5, step: 1, default: 0 },
      { kind: 'bool', key: 'stacking', label: 'Stacking lip', default: true, help: 'A rim on top and a groove underneath, so boxes seat into each other.' },
    ],
    notes: [
      'Prints flat with no supports.',
      'Boxes only stack onto boxes with the same footprint and wall — the groove is cut to match the lip, not to match every size.',
    ],
    printHint: 'Flat on the plate. A 100 × 75 × 50mm box is around 3 hours at 0.2mm.',
  },
  {
    slug: 'hex-organizer',
    verified: true,
    file: 'hex_organizer.scad',
    name: 'Hex Desk Organizer',
    blurb:
      'Hexagonal cells that pack against each other. Print the ones you need and grow the set later.',
    intro:
      'Six modules on one footprint, so a pen pot, a phone stand and a coaster sit together without gaps. Left at the default size a new cell packs against the ones already on your desk.',
    tag: 'Free',
    params: [
      {
        kind: 'choice', key: 'type', label: 'Module', default: 'pen',
        options: [
          { value: 'pen', label: 'Pen pot — full height' },
          { value: 'marker', label: 'Marker cup — cut away at the front' },
          { value: 'notes', label: 'Note holder — shallow tray' },
          { value: 'cable', label: 'Cable dock — keyhole slots' },
          { value: 'phone', label: 'Phone stand — leaning slot' },
          { value: 'coaster', label: 'Coaster — shallow dish' },
        ],
      },
      { kind: 'number', key: 'cell', label: 'Cell size', unit: 'mm', min: 22, max: 50, step: 0.25, default: 31.75, help: 'Circumradius. 31.75 is the studio standard — change it and it will not pack against existing cells.' },
      { kind: 'number', key: 'height', label: 'Height', unit: 'mm', min: 25, max: 140, step: 5, default: 90, help: 'Each module takes its own proportion of this.' },
      { kind: 'number', key: 'wall', label: 'Wall', unit: 'mm', min: 1.6, max: 6, step: 0.1, default: 3.5 },
      { kind: 'number', key: 'base', label: 'Base thickness', unit: 'mm', min: 1.6, max: 8, step: 0.2, default: 4 },
      { kind: 'bool', key: 'magnets', label: 'Magnet pockets', default: false, help: 'Pockets in the six flats so cells clip to each other.' },
      { kind: 'number', key: 'magnet_d', label: 'Magnet diameter', unit: 'mm', min: 4, max: 12, step: 0.1, default: 6.2, help: 'Add about 0.2mm to the magnet you have.' },
      { kind: 'number', key: 'magnet_h', label: 'Magnet thickness', unit: 'mm', min: 1, max: 6, step: 0.1, default: 3.2 },
    ],
    notes: [
      'Prints upright with no supports.',
      'Magnet pockets sit in the side flats, not the base, so the cells hold each other rather than the desk. Glue the magnets in with the poles alternating or neighbours will push apart.',
    ],
    printHint: 'Upright, no supports. A full-height pen pot is about 2 hours at 0.2mm.',
  },
];

// Catch a malformed manifest at import time rather than when a visitor first
// asks for the model.
for (const model of PARAMETRIC_MODELS) {
  assertValidParamDefs(model.params, model.slug);
}

/** Everything in the catalogue, verified or not. For tests and tooling. */
export function findModel(slug: string): ParametricModel | undefined {
  return PARAMETRIC_MODELS.find((m) => m.slug === slug);
}

/**
 * The models visitors can actually reach.
 *
 * Every public surface — the catalogue cards, the generated pages, the download
 * endpoint — goes through this rather than PARAMETRIC_MODELS, so an unverified
 * model cannot appear anywhere by being forgotten about in one of them.
 */
export const LISTED_MODELS: ParametricModel[] = PARAMETRIC_MODELS.filter((m) => m.verified);

export function findListedModel(slug: string): ParametricModel | undefined {
  return LISTED_MODELS.find((m) => m.slug === slug);
}
