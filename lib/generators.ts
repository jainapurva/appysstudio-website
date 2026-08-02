/**
 * The generator catalogue.
 *
 * One entry per thing that turns an input into a downloadable 3D file. Add a
 * parametric product here and it shows up on the hub and the parametric index
 * on its own — no new nav item, no new landing page to wire up.
 */

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

export const PARAMETRIC_GENERATORS: Generator[] = [
  {
    slug: 'keycaps',
    href: '/3d-generator/parametric/keycaps',
    name: 'Name Keycaps',
    blurb:
      'One clicky keycap per letter of a name, plus a tray sized to hold them. Arranged on a print plate and ready to slice.',
    tag: 'Free',
    available: true,
  },
];

export const PARAMETRIC_SUMMARY = {
  href: '/3d-generator/parametric',
  name: 'Parametric Generator',
  blurb:
    'Pick a product, set the numbers, download the exact file. Made to measure rather than guessed at — the geometry is built to your input.',
};
