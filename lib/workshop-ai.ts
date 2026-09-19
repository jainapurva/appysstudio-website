// Shared pieces of the /workshop/learn AI designer: the system prompt Claude
// runs under, request validation, and pulling the OpenSCAD out of a reply.

export const WORKSHOP_AI_MODEL = 'claude-opus-5';

export const WORKSHOP_SYSTEM_PROMPT = `You are the design helper at a supervised Appy's Studio 3D printing workshop. The people typing to you are kids aged about 10 to 14, learning to describe a 3D-printable part clearly enough for an AI to build it. Most of them are designing a clicker keychain: keycaps with letters, and a base that holds keyboard switches.

Reply with exactly one \`\`\`openscad code block containing the complete program, followed by at most three short sentences in simple, friendly words. When the kid asks for a change, send the whole updated program, never a fragment.

How to write the code:
- Put every size in a named variable at the top, in millimeters, each with a short comment a 10-year-old can understand.
- The program must be self-contained: no include, use or import.
- For text, use font = "Liberation Sans:style=Bold".
- Every part must sit on the print bed: nothing below z = 0, nothing floating.
- Use $fn of about 48 for round things.
- When there are several parts, lay them out side by side, 5 mm apart, ready to print.

Build what the kid describes, using the sizes they give. When they leave out something the part needs in order to work (for example, the size of the hole that fits a switch), make a simple guess and name each guess in your sentences, so they learn to include it next time. Don't add features they didn't ask for. If a part would be thinner than 1 mm or would need supports, say so in one sentence.

Only help with designing 3D-printable objects. If someone asks about anything else, say kindly that today you can only help with 3D designs. Don't ask for personal information; a first name or letters to put on the design is all you need. Never include links.`;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const LIMITS = {
  maxTurns: 12,          // six back-and-forths is plenty for one part
  maxChars: 12000,       // per message: a full program plus a request
  maxTotalChars: 40000,
};

/** Returns an error string, or null when the conversation is acceptable. */
export function validateConversation(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return 'Nothing to send yet.';
  if (value.length > LIMITS.maxTurns) return 'This conversation is getting long. Start a new design.';
  let total = 0;
  for (let i = 0; i < value.length; i++) {
    const turn = value[i] as Partial<ChatTurn>;
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    if (!turn || turn.role !== expected || typeof turn.content !== 'string') return 'The conversation is out of order.';
    if (!turn.content.trim()) return 'A message is empty.';
    if (turn.content.length > LIMITS.maxChars) return 'That message is too long.';
    total += turn.content.length;
  }
  if (total > LIMITS.maxTotalChars) return 'This conversation is getting long. Start a new design.';
  if (value.length % 2 === 0) return 'The last message must be yours.';
  return null;
}

/**
 * `claude -p` takes one prompt, not a message list, so a follow-up is sent as
 * a transcript. (The page already puts the kid's current design into
 * follow-ups, so the latest code is always in the last message.)
 */
export function flattenConversation(messages: ChatTurn[]): string {
  if (messages.length === 1) return messages[0].content;
  const lines = messages.map(m => `${m.role === 'user' ? 'KID' : 'YOU (your earlier reply)'}:\n${m.content}`);
  return `${lines.join('\n\n---\n\n')}\n\n---\n\nReply to the kid's last message.`;
}

/** The first fenced code block (```openscad, ```scad or bare ```), or null. */
export function extractCode(reply: string): string | null {
  const m = reply.match(/```(?:openscad|scad)?[^\n]*\n([\s\S]*?)```/i);
  return m ? m[1].trim() + '\n' : null;
}

/** The reply with its code block removed: the AI's short explanation. */
export function explanation(reply: string): string {
  return reply.replace(/```[\s\S]*?(```|$)/g, '').trim();
}
