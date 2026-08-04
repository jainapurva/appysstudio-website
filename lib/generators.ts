/**
 * The generator catalogue.
 *
 * One entry per thing that turns an input into a downloadable 3D file. Add a
 * parametric product here and it shows up on the hub and the parametric index
 * on its own — no new nav item, no new landing page to wire up.
 */

import { PARAMETRIC_MODELS } from '@/lib/parametric/models';

export interface Generator {
  slug: string;
  href: string;
  name: string;
  blurb: string;
  /** Short line for the card's corner: "Free", "Credits", "Soon". */
  tag: string;
  available: boolean;
}

export const AI_GENERATOR: Generator = {
  slug: 'ai',
  href: '/3d-generator/ai',
  name: 'AI 3D Generator',
  blurb:
    'Describe what you want, or upload a picture of it, and get a 3D model back. Best for one-off shapes and characters.',
  tag: 'Credits',
  available: true,
};

/**
 * Name Keycaps predates the .scad pipeline and has its own generator and its
 * own hand-built page, so it is listed by hand. Everything after it comes from
 * the model manifest.
 */
const KEYCAPS: Generator = {
  slug: 'keycaps',
  href: '/3d-generator/parametric/keycaps',
  name: 'Name Keycaps',
  blurb:
    'One clicky keycap per letter of a name, plus a tray sized to hold them. Arranged on a print plate and ready to slice.',
  tag: 'Free',
  available: true,
};

/**
 * The paint kit is parametric too, but its input is a picture rather than a set
 * of numbers, so it has its own page and its own endpoint instead of coming
 * from the .scad manifest.
 */
const PAINT_KIT: Generator = {
  slug: 'paint-kit',
  href: '/3d-generator/parametric/paint-kit',
  name: 'Paint Kit Maker',
  blurb:
    'Turn any picture into a paint-it-yourself plaque — the outline raised off a flat white plate, ready to colour in.',
  tag: 'Free',
  available: true,
};

export const PARAMETRIC_GENERATORS: Generator[] = [
  KEYCAPS,
  PAINT_KIT,
  ...PARAMETRIC_MODELS.map((model) => ({
    slug: model.slug,
    href: `/3d-generator/parametric/${model.slug}`,
    name: model.name,
    blurb: model.blurb,
    tag: model.tag,
    available: true,
  })),
];

export const PARAMETRIC_SUMMARY = {
  href: '/3d-generator/parametric',
  name: 'Parametric Generator',
  blurb:
    'Pick a product, set the numbers, download the exact file. Made to measure rather than guessed at — the geometry is built to your input.',
};
