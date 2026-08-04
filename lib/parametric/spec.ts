/**
 * Parameter definitions for the parametric models, and the sanitiser that turns
 * a query string into OpenSCAD `-D` assignments.
 *
 * Everything a visitor sends is untrusted and ends up as SCAD source, so the
 * rule here is that no caller-supplied text ever reaches OpenSCAD. Numbers are
 * re-serialised from parsed floats, booleans become the literals true/false,
 * and a choice may only ever emit a string that is already declared in its
 * option list. There is no path that passes a value through verbatim.
 */

export interface NumberParam {
  kind: 'number';
  key: string;
  label: string;
  /** Shown after the value: "mm", "°", "" for counts. */
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  help?: string;
}

export interface BoolParam {
  kind: 'bool';
  key: string;
  label: string;
  default: boolean;
  help?: string;
}

export interface ChoiceParam {
  kind: 'choice';
  key: string;
  label: string;
  options: { value: string; label: string }[];
  default: string;
  help?: string;
}

export type ParamDef = NumberParam | BoolParam | ChoiceParam;

export type ParamValue = number | boolean | string;
export type ParamValues = Record<string, ParamValue>;

/** SCAD identifiers we are willing to define. Anything else is a bug, not input. */
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
/** Choice values become bare SCAD strings, so keep them boring. */
const CHOICE_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Check a model's parameter list is well formed.
 *
 * This guards the code, not the visitor — a malformed option value would be a
 * mistake in our own manifest, and it should fail loudly at startup rather than
 * quietly widen what can be injected.
 */
export function assertValidParamDefs(defs: ParamDef[], modelSlug: string): void {
  const seen = new Set<string>();
  for (const def of defs) {
    const where = `${modelSlug}.${def.key}`;
    if (!KEY_PATTERN.test(def.key)) {
      throw new Error(`${where}: parameter key must match ${KEY_PATTERN}`);
    }
    if (seen.has(def.key)) throw new Error(`${where}: duplicate parameter key`);
    seen.add(def.key);

    if (def.kind === 'number') {
      if (!(def.min < def.max)) throw new Error(`${where}: min must be below max`);
      if (!(def.step > 0)) throw new Error(`${where}: step must be positive`);
      if (def.default < def.min || def.default > max(def)) {
        throw new Error(`${where}: default ${def.default} is outside ${def.min}..${def.max}`);
      }
    } else if (def.kind === 'choice') {
      if (def.options.length < 2) throw new Error(`${where}: a choice needs two options`);
      for (const opt of def.options) {
        if (!CHOICE_PATTERN.test(opt.value)) {
          throw new Error(`${where}: option "${opt.value}" must match ${CHOICE_PATTERN}`);
        }
      }
      if (!def.options.some((o) => o.value === def.default)) {
        throw new Error(`${where}: default "${def.default}" is not one of the options`);
      }
    }
  }
}

function max(def: NumberParam): number {
  return def.max;
}

/** Round to the nearest step, then clamp. Keeps values on the grid the UI shows. */
function snap(def: NumberParam, value: number): number {
  const stepped = Math.round((value - def.min) / def.step) * def.step + def.min;
  const clamped = Math.min(def.max, Math.max(def.min, stepped));
  // Steps like 0.2 accumulate float dust; 4 decimals is far finer than any
  // printer resolves and keeps the SCAD literal short.
  return Number(clamped.toFixed(4));
}

export interface ResolveResult {
  values: ParamValues;
  /** Inputs that were out of range or unrecognised, for an honest error message. */
  rejected: string[];
}

/**
 * Turn raw query parameters into a complete, valid set of values.
 *
 * Missing parameters take their default rather than failing, so a short URL
 * still builds something. Out-of-range numbers are clamped rather than
 * rejected, but are reported so the caller can say what it did.
 */
export function resolveParams(
  defs: ParamDef[],
  raw: Record<string, string | undefined>
): ResolveResult {
  const values: ParamValues = {};
  const rejected: string[] = [];

  for (const def of defs) {
    const given = raw[def.key];

    if (given === undefined || given === '') {
      values[def.key] = def.default;
      continue;
    }

    if (def.kind === 'number') {
      const parsed = Number(given);
      if (!Number.isFinite(parsed)) {
        values[def.key] = def.default;
        rejected.push(`${def.label} must be a number`);
        continue;
      }
      const snapped = snap(def, parsed);
      if (parsed < def.min || parsed > def.max) {
        rejected.push(`${def.label} must be between ${def.min} and ${def.max}${def.unit}`);
      }
      values[def.key] = snapped;
    } else if (def.kind === 'bool') {
      values[def.key] = given === 'true' || given === '1' || given === 'yes';
    } else {
      const match = def.options.find((o) => o.value === given);
      if (!match) {
        values[def.key] = def.default;
        rejected.push(`${def.label} has no option "${given.slice(0, 20)}"`);
        continue;
      }
      values[def.key] = match.value;
    }
  }

  return { values, rejected };
}

/**
 * Serialise resolved values as OpenSCAD `-D name=value` arguments.
 *
 * Takes the definitions too, so every emitted value is re-derived from the
 * manifest rather than trusted: a choice is looked up in its option list again
 * and the *stored* option value is what gets written.
 */
export function toDefines(defs: ParamDef[], values: ParamValues): string[] {
  const out: string[] = [];

  for (const def of defs) {
    const value = values[def.key];
    if (value === undefined) continue;

    if (def.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${def.key}: refusing to define a non-finite number`);
      }
      out.push(`${def.key}=${value}`);
    } else if (def.kind === 'bool') {
      out.push(`${def.key}=${value ? 'true' : 'false'}`);
    } else {
      // Look the value up rather than formatting what we were handed, so only
      // strings from our own manifest can ever reach the SCAD source.
      const match = def.options.find((o) => o.value === value);
      if (!match) throw new Error(`${def.key}: "${String(value)}" is not a declared option`);
      out.push(`${def.key}="${match.value}"`);
    }
  }

  return out;
}

/** A stable, filesystem-safe suffix describing the settings, for the filename. */
export function describeValues(defs: ParamDef[], values: ParamValues): string {
  const parts: string[] = [];
  for (const def of defs) {
    const value = values[def.key];
    if (value === undefined) continue;
    if (def.kind === 'number') parts.push(String(value));
    else if (def.kind === 'bool') {
      if (value) parts.push(def.key);
    } else parts.push(String(value));
  }
  return parts.join('-').replace(/[^A-Za-z0-9._-]/g, '');
}
