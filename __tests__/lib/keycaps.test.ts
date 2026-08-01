import { describe, it, expect, beforeAll } from 'vitest';
import { unzip, zip, precompress } from '@/lib/keycaps/zip';
import {
  ALPHABET,
  MIN_TEXT_SLOTS,
  autoBaseSlots,
  availableBaseSizes,
  generate,
  parseLetters,
} from '@/lib/keycaps/generator';
import { MAX_NAME_LENGTH, planFor, sanitiseName } from '@/lib/keycaps/spec';
import { rateLimit, resetRateLimits, clientIp } from '@/lib/keycaps/ratelimit';

/** Deterministic UUIDs so output is comparable across runs. */
function seqUuid() {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(n++).padStart(12, '0')}`;
}

describe('zip', () => {
  it('round-trips stored and deflated members', async () => {
    const small = Buffer.from('hello keycaps');
    const big = Buffer.from('A'.repeat(200_000));
    const archive = await zip([
      { name: 'a.txt', data: small },
      { name: 'nested/b.bin', data: big },
    ]);
    const back = unzip(archive);
    expect(back.get('a.txt')).toEqual(small);
    expect(back.get('nested/b.bin')).toEqual(big);
  });

  it('reuses a precompressed member without changing its bytes', async () => {
    const data = Buffer.from('B'.repeat(100_000));
    const pre = await precompress(data);
    const archive = await zip([{ name: 'x', pre }]);
    expect(unzip(archive).get('x')).toEqual(data);
  });

  it('rejects an entry with neither data nor pre', async () => {
    await expect(zip([{ name: 'oops' }])).rejects.toThrow(/neither data nor pre/);
  });

  it('rejects a buffer that is not a zip', () => {
    expect(() => unzip(Buffer.alloc(64))).toThrow(/not a zip archive/);
  });
});

describe('parseLetters', () => {
  it('keeps a word in order, repeats included', () => {
    expect(parseLetters('HELLO')).toEqual(['H', 'E', 'L', 'L', 'O']);
  });

  it('uppercases and drops separators', () => {
    expect(parseLetters('ny-esha')).toEqual(['N', 'Y', 'E', 'S', 'H', 'A']);
  });

  it('reads explicit counts', () => {
    expect(parseLetters('A:3,B:2,Z')).toEqual(['A', 'A', 'A', 'B', 'B', 'Z']);
  });

  it('rejects non-letters and empties', () => {
    expect(() => parseLetters('A1')).toThrow(/A–Z/);
    expect(() => parseLetters('   ')).toThrow(/Enter a name/);
  });
});

describe('spec', () => {
  it('sanitises the way the page and the API both expect', () => {
    expect(sanitiseName('  ny esha ')).toBe('NYESHA');
    expect(sanitiseName("O'Brien")).toBe('OBRIEN');
  });

  it('sizes the tray to the name', () => {
    expect(planFor('ABC').bases).toEqual([{ slots: 3, text: false }]);
    expect(planFor('NYESHA').bases).toEqual([{ slots: 6, text: false }]);
  });

  it('never engraves the tray, at any length', () => {
    // "Our Hero" is a personal inscription from the original project and must
    // not end up on a visitor's name plate.
    for (const name of ['A', 'ABC', 'ABCD', 'NYESHA', 'ABCDEFGHIJ']) {
      expect(planFor(name).bases.every((b) => !b.text), name).toBe(true);
    }
  });

  it('never plans a tray bigger than the library carries', () => {
    const largest = availableBaseSizes().slice(-1)[0];
    expect(MAX_NAME_LENGTH).toBeLessThanOrEqual(largest);
  });
});

describe('autoBaseSlots', () => {
  it('splits past the largest tray', () => {
    expect(autoBaseSlots(26)).toEqual([10, 10, 6]);
    expect(autoBaseSlots(6)).toEqual([6]);
  });
});

describe('generate', () => {
  let file: Buffer;
  let members: Map<string, Buffer>;

  beforeAll(async () => {
    // exactly what the site asks for
    const plan = planFor('NYESHA');
    const result = await generate({
      letters: plan.letters,
      bases: plan.bases,
      onePlate: true,
      uuid: seqUuid(),
    });
    file = result.file;
    members = unzip(file);
  });

  it('emits the members Bambu Studio needs', () => {
    for (const name of [
      '[Content_Types].xml',
      '_rels/.rels',
      '3D/_rels/3dmodel.model.rels',
      '3D/3dmodel.model',
      '3D/Objects/body.model',
      '3D/Objects/parts.model',
      'Metadata/model_settings.config',
      'Metadata/project_settings.config',
    ]) {
      expect(members.has(name), `missing ${name}`).toBe(true);
    }
  });

  it('declares every sub-model file as a relationship', () => {
    // Without these, Bambu loads the project with zero facets and no error.
    const rels = members.get('3D/_rels/3dmodel.model.rels')!.toString();
    expect(rels).toContain('/3D/Objects/body.model');
    expect(rels).toContain('/3D/Objects/parts.model');
  });

  it('claims to come from Bambu Studio', () => {
    // Any other Application value sends the loader down an imported-foreign-model
    // path that re-resolves extruder variants and then refuses to slice.
    const model = members.get('3D/3dmodel.model')!.toString();
    expect(model).toMatch(/<metadata name="Application">BambuStudio/);
  });

  it('puts one object per keycap plus the tray on a single plate', () => {
    const settings = members.get('Metadata/model_settings.config')!.toString();
    expect(settings.match(/<object id=/g)).toHaveLength(7);
    expect(settings.match(/<plate>/g)).toHaveLength(1);
    expect(settings.match(/<model_instance>/g)).toHaveLength(7);
    expect(settings).toContain('Base 6-slot');
  });

  it('ships a tray with nothing cut into it', () => {
    const settings = members.get('Metadata/model_settings.config')!.toString();
    expect(settings).not.toContain('Our Hero');
    expect(settings).not.toContain('negative_part');
  });

  it('matches every model_settings part id to a component objectid', () => {
    const model = members.get('3D/3dmodel.model')!.toString();
    const settings = members.get('Metadata/model_settings.config')!.toString();
    const partIds = [...settings.matchAll(/<part id="(\d+)"/g)].map((m) => m[1]);
    const componentIds = new Set(
      [...model.matchAll(/objectid="(\d+)"/g)].map((m) => m[1])
    );
    expect(partIds.length).toBeGreaterThan(0);
    for (const id of partIds) expect(componentIds.has(id)).toBe(true);
  });

  it('shares one body mesh across every keycap', () => {
    const bodyModel = members.get('3D/Objects/body.model')!.toString();
    expect(bodyModel.match(/<object id=/g)).toHaveLength(1);
    // 6 keycaps but only one copy of the 13 MB mesh keeps the file small
    expect(file.length).toBeLessThan(4_000_000);
  });

  it('is deterministic given the same uuid source', async () => {
    const plan = planFor('NYESHA');
    const again = await generate({
      letters: plan.letters,
      bases: plan.bases,
      onePlate: true,
      uuid: seqUuid(),
    });
    expect(again.file.equals(file)).toBe(true);
  });

  it('reports what it built', async () => {
    const r = await generate({
      letters: parseLetters('AB'),
      bases: [{ slots: 4, text: false }],
      onePlate: true,
      uuid: seqUuid(),
    });
    expect(r.keycapCount).toBe(2);
    expect(r.plates).toEqual(['All']);
    expect(r.bases[0]).toMatchObject({ slots: 4, text: false });
    expect(r.bases[0].length).toBeGreaterThan(70);
  });

  it('can still cut the engraving when asked directly', async () => {
    // The capability stays for the standalone CLI; only the site declines it.
    const r = await generate({
      letters: ['A'],
      bases: [{ slots: MIN_TEXT_SLOTS, text: true }],
      uuid: seqUuid(),
    });
    const settings = unzip(r.file).get('Metadata/model_settings.config')!.toString();
    expect(settings).toContain('Our Hero');
    expect(settings).toContain('negative_part');
  });

  it('carries every letter of the alphabet', async () => {
    const r = await generate({
      letters: ALPHABET.split(''),
      bases: [],
      uuid: seqUuid(),
    });
    expect(r.keycapCount).toBe(26);
  });

  it('refuses an engraving on a tray too short to carry it', async () => {
    await expect(
      generate({ letters: ['A'], bases: [{ slots: 3, text: true }], uuid: seqUuid() })
    ).rejects.toThrow(/too short/);
  });

  it('refuses a tray size the library does not have', async () => {
    await expect(
      generate({ letters: ['A'], bases: [{ slots: 99, text: false }], uuid: seqUuid() })
    ).rejects.toThrow(/available sizes/);
  });

  it('refuses to cram more onto one plate than fits', async () => {
    await expect(
      generate({
        letters: Array(200).fill('A'),
        bases: [{ slots: 10, text: false }],
        onePlate: true,
        uuid: seqUuid(),
      })
    ).rejects.toThrow(/single plate/);
  });
});

describe('rateLimit', () => {
  beforeAll(() => resetRateLimits());

  it('allows up to the limit then blocks', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 60_000).ok).toBe(true);
    const blocked = rateLimit('k', 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('counts each key separately', () => {
    expect(rateLimit('other', 1, 60_000).ok).toBe(true);
  });

  it('reads the first hop of x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
    expect(clientIp(new Headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
