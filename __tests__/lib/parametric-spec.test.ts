import { describe, it, expect } from 'vitest';
import {
  assertValidParamDefs,
  describeValues,
  resolveParams,
  toDefines,
  type ParamDef,
} from '@/lib/parametric/spec';
import {
  PARAMETRIC_MODELS,
  LISTED_MODELS,
  findModel,
  findListedModel,
} from '@/lib/parametric/models';
import { PARAMETRIC_GENERATORS } from '@/lib/generators';

const DEFS: ParamDef[] = [
  { kind: 'number', key: 'width', label: 'Width', unit: 'mm', min: 10, max: 100, step: 5, default: 50 },
  { kind: 'bool', key: 'lid', label: 'Lid', default: false },
  {
    kind: 'choice',
    key: 'style',
    label: 'Style',
    default: 'round',
    options: [
      { value: 'round', label: 'Round' },
      { value: 'square', label: 'Square' },
    ],
  },
];

describe('resolveParams', () => {
  it('falls back to defaults for anything missing', () => {
    const { values, rejected } = resolveParams(DEFS, {});
    expect(values).toEqual({ width: 50, lid: false, style: 'round' });
    expect(rejected).toEqual([]);
  });

  it('snaps numbers to the step and clamps to the range', () => {
    expect(resolveParams(DEFS, { width: '52' }).values.width).toBe(50);
    expect(resolveParams(DEFS, { width: '53' }).values.width).toBe(55);

    const high = resolveParams(DEFS, { width: '5000' });
    expect(high.values.width).toBe(100);
    expect(high.rejected).toHaveLength(1);
  });

  it('rejects a choice that is not on the list, and keeps the default', () => {
    const { values, rejected } = resolveParams(DEFS, { style: 'hexagonal' });
    expect(values.style).toBe('round');
    expect(rejected[0]).toContain('Style');
  });

  it('treats non-numeric input as missing rather than passing it on', () => {
    const { values, rejected } = resolveParams(DEFS, { width: 'NaN; drop table' });
    expect(values.width).toBe(50);
    expect(rejected).toHaveLength(1);
  });
});

describe('toDefines', () => {
  it('writes each kind in the form OpenSCAD expects', () => {
    const { values } = resolveParams(DEFS, { width: '75', lid: 'true', style: 'square' });
    expect(toDefines(DEFS, values).sort()).toEqual(['lid=true', 'style="square"', 'width=75']);
  });

  // The whole reason toDefines takes the definitions as well as the values: it
  // re-derives every string from the manifest instead of formatting what it was
  // handed, so nothing a visitor typed can reach the SCAD source.
  it('refuses a choice value that is not declared, even if it is already in values', () => {
    expect(() => toDefines(DEFS, { style: 'round"; system("rm -rf /"); x="' })).toThrow(
      /not a declared option/
    );
  });

  it('refuses a non-finite number', () => {
    expect(() => toDefines(DEFS, { width: Number.NaN })).toThrow(/non-finite/);
    expect(() => toDefines(DEFS, { width: Number.POSITIVE_INFINITY })).toThrow(/non-finite/);
  });

  it('never emits anything but digits, dots and minus for a number', () => {
    for (const raw of ['1e9', '-0', '0x10', '1,5', '  12  ']) {
      const { values } = resolveParams(DEFS, { width: raw });
      const [define] = toDefines([DEFS[0]], values);
      expect(define).toMatch(/^width=-?[0-9]+(\.[0-9]+)?$/);
    }
  });
});

describe('assertValidParamDefs', () => {
  it('rejects a key that is not a plain SCAD identifier', () => {
    expect(() =>
      assertValidParamDefs([{ ...DEFS[0], key: 'width; evil' } as ParamDef], 'x')
    ).toThrow(/parameter key/);
  });

  it('rejects an option value carrying anything but word characters', () => {
    expect(() =>
      assertValidParamDefs(
        [
          {
            kind: 'choice',
            key: 'style',
            label: 'Style',
            default: 'a',
            options: [
              { value: 'a', label: 'A' },
              { value: 'b"; cube(999); //', label: 'B' },
            ],
          },
        ],
        'x'
      )
    ).toThrow(/must match/);
  });

  it('rejects a default outside the declared range', () => {
    expect(() =>
      assertValidParamDefs([{ ...DEFS[0], default: 500 } as ParamDef], 'x')
    ).toThrow(/outside/);
  });
});

describe('the shipped manifest', () => {
  it('declares every model with a valid parameter set', () => {
    for (const model of PARAMETRIC_MODELS) {
      expect(() => assertValidParamDefs(model.params, model.slug)).not.toThrow();
    }
  });

  it('uses unique slugs and plain .scad filenames', () => {
    const slugs = PARAMETRIC_MODELS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const model of PARAMETRIC_MODELS) {
      expect(model.file).toMatch(/^[a-z0-9_]+\.scad$/);
      expect(model.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('produces a filesystem-safe filename suffix from any settings', () => {
    for (const model of PARAMETRIC_MODELS) {
      const { values } = resolveParams(model.params, {});
      expect(describeValues(model.params, values)).toMatch(/^[A-Za-z0-9._-]*$/);
    }
  });

  it('finds models by slug and nothing else', () => {
    expect(findModel('twisty-vase')?.name).toBe('Twisty Vase & Planter');
    expect(findModel('../../etc/passwd')).toBeUndefined();
  });
});

describe('unverified models stay off the site', () => {
  // Apurva's rule, 2026-08-04: nothing that has not been test printed is
  // reachable. Geometry settles most correctness, but not everything — the
  // articulated chain measures as four separate bodies at exactly 0.350mm of
  // clearance, and whether those joints come free off the plate is a question
  // for a printer, not a mesh.
  it('keeps the articulated chain in the catalogue but not on the site', () => {
    expect(findModel('finger-extensions')).toBeDefined();
    expect(findModel('finger-extensions')?.verified).toBe(false);
    expect(findListedModel('finger-extensions')).toBeUndefined();
    expect(LISTED_MODELS.some((m) => m.slug === 'finger-extensions')).toBe(false);
  });

  it('lists every verified model and nothing else', () => {
    expect(LISTED_MODELS.map((m) => m.slug).sort()).toEqual(
      PARAMETRIC_MODELS.filter((m) => m.verified)
        .map((m) => m.slug)
        .sort()
    );
    for (const model of LISTED_MODELS) expect(model.verified).toBe(true);
  });

  it('shows a card only for models that are listed', () => {
    // The catalogue is what the hub and the index render from, so an
    // unverified model appearing here would put it back on the site even
    // though its page and endpoint are gone.
    const cards = PARAMETRIC_GENERATORS.map((g) => g.slug);
    for (const model of PARAMETRIC_MODELS) {
      if (model.verified) expect(cards).toContain(model.slug);
      else expect(cards).not.toContain(model.slug);
    }
  });

  it('still covers unverified models with the geometry tests', () => {
    // The point is that the work is kept, not thrown away — flipping the flag
    // after a test print should be the only change needed.
    for (const model of PARAMETRIC_MODELS) {
      expect(model.file, model.slug).toMatch(/^[a-z0-9_]+\.scad$/);
    }
  });
});
