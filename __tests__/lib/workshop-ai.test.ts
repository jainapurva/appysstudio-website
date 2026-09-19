import { describe, it, expect } from 'vitest';
import { validateConversation, extractCode, explanation, LIMITS } from '@/lib/workshop-ai';
import { findNumbers, setNumber } from '@/lib/playground';

describe('validateConversation', () => {
  it('accepts a single kid message', () => {
    expect(validateConversation([{ role: 'user', content: 'Make a keycap' }])).toBeNull();
  });

  it('accepts a follow-up after an AI reply', () => {
    expect(validateConversation([
      { role: 'user', content: 'Make a keycap' },
      { role: 'assistant', content: '```openscad\ncube(17);\n```' },
      { role: 'user', content: 'Make it rounder' },
    ])).toBeNull();
  });

  it('rejects empty, out-of-order, or AI-last conversations', () => {
    expect(validateConversation([])).not.toBeNull();
    expect(validateConversation('hi')).not.toBeNull();
    expect(validateConversation([{ role: 'assistant', content: 'hi' }])).not.toBeNull();
    expect(validateConversation([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ])).not.toBeNull();
    expect(validateConversation([{ role: 'user', content: '   ' }])).not.toBeNull();
  });

  it('rejects oversized messages and histories', () => {
    expect(validateConversation([{ role: 'user', content: 'x'.repeat(LIMITS.maxChars + 1) }])).not.toBeNull();
    const long = Array.from({ length: LIMITS.maxTurns + 1 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'hi',
    }));
    expect(validateConversation(long)).not.toBeNull();
  });
});

describe('extractCode / explanation', () => {
  const reply = 'Here you go!\n```openscad\nwidth = 17; // how wide\ncube(width);\n```\nI guessed the hole size.';

  it('pulls the code out of an openscad fence', () => {
    expect(extractCode(reply)).toBe('width = 17; // how wide\ncube(width);\n');
  });

  it('accepts a bare fence and returns null when there is none', () => {
    expect(extractCode('```\ncube(1);\n```')).toBe('cube(1);\n');
    expect(extractCode('no code here')).toBeNull();
  });

  it('keeps the words and drops the code', () => {
    expect(explanation(reply)).toBe('Here you go!\n\nI guessed the hole size.');
  });
});

describe('findNumbers / setNumber', () => {
  const code = [
    'width = 17;      // how wide the keycap is',
    'letter = "M";    // the letter on top',
    '$fn = 48;',
    'module cap() {',
    '  inner = 2;     // indented: not a top-level knob',
    '}',
    'cube(width);',
  ].join('\n');

  it('finds top-level numbers and strings, skipping $ variables and indented lines', () => {
    const found = findNumbers(code);
    expect(found.map(n => n.name)).toEqual(['width', 'letter']);
    expect(found[0]).toMatchObject({ value: '17', isText: false, comment: 'how wide the keycap is' });
    expect(found[1]).toMatchObject({ value: '"M"', isText: true });
  });

  it('rewrites only the chosen line and keeps its comment', () => {
    const [width, letter] = findNumbers(code);
    const once = setNumber(code, width, '20');
    expect(once.split('\n')[0]).toBe('width = 20; // how wide the keycap is');
    const twice = setNumber(once, letter, 'A"B');
    expect(twice.split('\n')[1]).toBe('letter = "AB"; // the letter on top');
    expect(twice.split('\n').slice(2)).toEqual(code.split('\n').slice(2));
  });
});
