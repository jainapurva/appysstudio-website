/**
 * What a visitor is allowed to ask for, and how a name becomes a print plan.
 *
 * Kept apart from generator.ts so the page (a client component) can import the
 * limits without pulling in node:fs and the 4.5 MB parts library.
 */

/** The tray tops out at 10 slots, and everything must fit one plate. */
export const MAX_NAME_LENGTH = 10;
export const NAME_PATTERN = /^[A-Z]+$/;

/** Uppercase, strip spaces and separators — "Ny-esha" and "ny esha" both work. */
export function sanitiseName(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-_'’.]/g, '');
}

export interface Plan {
  letters: string[];
  bases: Array<{ slots: number; text: boolean }>;
}

/**
 * One keycap per letter, on a single tray sized to the name, with "Our Hero"
 * engraved underneath whenever the tray is long enough to carry it.
 */
export function planFor(name: string): Plan {
  const letters = name.split('');
  const slots = Math.max(1, Math.min(MAX_NAME_LENGTH, letters.length));
  // The engraving needs a 4-slot tray or longer; shorter names get a plain one.
  return { letters, bases: [{ slots, text: slots >= 4 }] };
}
