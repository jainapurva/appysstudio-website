// Content for /workshop/learn — the kid-paced, step-by-step version of the
// workshop. Copy lives here (like lib/workshop.ts) so the page stays layout only.

export interface LearnStep {
  id: string;
  short: string;   // sidebar label
  title: string;
}

export const LEARN_STEPS: LearnStep[] = [
  { id: 'welcome',   short: 'Welcome',          title: 'Welcome, maker!' },
  { id: 'what',      short: 'What is 3D printing?', title: 'What is 3D printing?' },
  { id: 'printers',  short: 'Types of printers', title: 'Types of 3D printers' },
  { id: 'filaments', short: 'Filaments',        title: 'What do printers print with?' },
  { id: 'cad',       short: 'What is CAD?',     title: 'CAD: designing with shapes and numbers' },
  { id: 'snap',      short: 'Talking to AI',    title: 'How to talk to an AI designer' },
  { id: 'design',    short: 'Design with AI',   title: 'Design your clicker with AI' },
  { id: 'check',     short: 'Check the AI',     title: "Check the AI's work" },
  { id: 'print',     short: 'Send to print',    title: 'Send it to the printer' },
];

export const SAFETY_RULES = [
  'The nozzle is 220 °C, hotter than an oven. Never touch it.',
  'The bed is hot too. Only a grown-up takes prints off.',
  'Never reach into a printer while it is moving.',
  'Use cutters sitting down, pointed away from you.',
  'Ask before you touch any machine.',
];

export const MAKE_THREE_WAYS = [
  { name: 'Subtractive', how: 'Start with a block and cut away', example: 'Carving a statue out of stone' },
  { name: 'Formative',   how: 'Pour into a mold',               example: 'A Jell-O mold or a chocolate bunny' },
  { name: 'Additive',    how: 'Build up, one layer at a time',   example: 'Stacking LEGO, piping cake icing. This is 3D printing!' },
];

export const PRINT_JOURNEY = [
  { name: 'Design', what: 'Make the shape on a computer, with CAD or AI.' },
  { name: 'Export', what: 'Save it as an STL file: the shape, as thousands of tiny triangles.' },
  { name: 'Slice',  what: 'The slicer cuts it into layers and writes the printer\'s instructions (G-code).' },
  { name: 'Print',  what: 'The printer builds it, layer by layer, from the bottom up.' },
];

export const PRINTER_TYPES = [
  { name: 'FDM (our printers!)', how: 'Melts plastic string and squeezes it through a hot nozzle, line by line.', like: 'A robot hot-glue gun', good: 'Cheap, strong, big parts', bad: 'You can see the layer lines' },
  { name: 'Resin (SLA)', how: 'A UV light hardens liquid resin one layer at a time.', like: 'Gel nail polish hardening under a UV lamp', good: 'Tiny details: miniatures, jewelry, teeth', bad: 'Messy chemicals, needs gloves' },
  { name: 'SLS', how: 'A laser melts nylon powder together.', like: 'A laser gluing sand into a sandcastle', good: 'Strong parts, no supports needed', bad: 'Huge and very expensive' },
  { name: 'Metal', how: 'A laser melts metal powder.', like: 'The same trick, with metal', good: 'Rocket engine parts', bad: 'Costs as much as a house' },
  { name: 'The wild ones', how: 'Squeezing out concrete, chocolate, even living cells.', like: 'A giant icing bag', good: 'Houses, desserts, medical research', bad: 'Not in your bedroom (yet)' },
];

export const FILAMENTS = [
  { name: 'PLA',  feel: 'Made from plants like corn. Easiest to print.', where: 'Toys, models, your clicker', note: 'Goes soft in a hot car' },
  { name: 'PETG', feel: 'Water-bottle family. Tough, bends before it breaks.', where: 'Outdoor parts, the mobility chair frame', note: 'Handles heat and sun' },
  { name: 'TPU',  feel: 'Rubbery and bendy.', where: 'Phone cases, tires', note: 'Squishes and springs back' },
  { name: 'ABS',  feel: 'Strong and heat-proof, but smelly to print.', where: 'LEGO bricks (really!)', note: 'Needs a closed printer' },
  { name: 'Nylon', feel: 'Very tough and slippery.', where: 'Gears and hinges', note: 'Soaks up water from the air' },
  { name: 'Fun ones', feel: 'Silk (shiny), glow-in-the-dark, wood-fill, color-changing.', where: 'Gifts and decorations', note: 'Glow filament wears out nozzles' },
];

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const FILAMENT_QUIZ: QuizQuestion[] = [
  { q: 'Which plastic would you use for a phone case?', options: ['PLA', 'TPU', 'ABS'], answer: 1, why: 'TPU is rubbery, so it bends around the phone and soaks up drops.' },
  { q: 'A toy will be left in a hot car. Which plastic?', options: ['PLA', 'PETG', 'Resin'], answer: 1, why: 'PLA goes soft in a hot car. PETG handles heat much better.' },
  { q: 'What are LEGO bricks made of?', options: ['ABS', 'PLA', 'Nylon'], answer: 0, why: 'LEGO has used ABS since 1963.' },
  { q: 'You want a tiny figure with super-fine details. Which printer?', options: ['FDM', 'Resin', 'Concrete'], answer: 1, why: 'Resin printers harden very thin layers with light, so details come out sharp.' },
  { q: 'How thick is one layer on our printers?', options: ['About 2 sheets of paper', 'About a pencil', 'About a book'], answer: 0, why: 'A layer is about 0.2 mm. Your clicker keycap is about 40 layers tall.' },
];

export const SNAP = [
  { letter: 'S', word: 'Shape',       say: 'What is it, and what is on it?', example: '"a keycap with the letter M on top"' },
  { letter: 'N', word: 'Numbers',     say: 'Every size, in millimeters.', example: '"17 mm wide, 8 mm tall"' },
  { letter: 'A', word: 'Attaches to', say: 'What it has to fit onto.', example: '"it must fit on a keyboard switch"' },
  { letter: 'P', word: 'Print',       say: 'How it sits on the printer, with no supports.', example: '"print it upside down, top on the bed"' },
];

export const PROMPT_LEVELS = [
  { level: 1, prompt: 'Make a keycap with the letter M.', result: 'A solid block with an M on it. No hole underneath, so it can\'t go on a switch. The AI guessed everything.' },
  { level: 2, prompt: 'Make a keyboard keycap, 17 mm wide, with a big M on top. It has to fit on a keyboard switch.', result: 'Closer! But the AI still guesses the hole. It might be round, too small, or too shallow.' },
  { level: 3, prompt: 'The engineer\'s prompt: every size, what it fits, and how it prints. (It\'s the first template in the next step.)', result: 'The AI builds exactly what you described, and you can check every number.' },
];

export type DesignKind = 'keycap' | 'base' | 'clicker' | 'other';

export const DESIGN_TEMPLATES: Record<DesignKind, { label: string; prompt: string }> = {
  keycap: {
    label: 'A keycap',
    prompt: `Write OpenSCAD code for a keycap for a clicker keychain.
- Shape: 17 mm square at the bottom, 13 mm square at the top, 8 mm tall, rounded corners.
- Hollow underneath with 1.5 mm walls, so it fits over a keyboard switch.
- Inside, in the middle: a round post 5.6 mm wide and 3.8 mm long coming down from the roof, with a plus-shaped hole in it. Each arm of the plus is 4.3 mm long and 1.3 mm wide, and the hole is 3.8 mm deep. This grips the switch.
- On top: the letter "M", bold, 9 mm tall, sunk 0.6 mm into the top.
- I will print it upside down (top on the bed), so nothing may need supports.
- Put every size in a variable at the top with a short comment.`,
  },
  base: {
    label: 'The base',
    prompt: `Write OpenSCAD code for the base of a clicker keychain.
- A hollow bar with a flat bottom, 20 mm wide, with 2 mm walls and a 2 mm floor.
- The top is a 1.5 mm thick plate with a row of 14 x 14 mm square holes, one per letter, 18 mm apart center to center. Keyboard switches snap into 14 mm holes in a 1.5 mm plate.
- Under the plate, leave 9 mm of empty space so the bottom of each switch fits.
- At one end, a flat tab 4 mm thick with a 5 mm hole going straight down through it, for a keyring.
- It prints standing the right way up on its flat bottom, with no supports.
- Make the number of letters a variable called letters, set to 4.
- Put every size in a variable at the top with a short comment.`,
  },
  clicker: {
    label: 'My whole clicker',
    prompt: `My name is MAYA. Write OpenSCAD code for a clicker keychain with my name.
The base:
- A hollow bar with a flat bottom, 20 mm wide, 2 mm walls, 2 mm floor.
- Top plate 1.5 mm thick with a row of 14 x 14 mm square holes, one per letter, 18 mm apart center to center, and 9 mm of empty space under the plate.
- A flat tab at one end, 4 mm thick, with a 5 mm keyring hole going straight down.
The keycaps (one for each letter of MAYA):
- 17 mm square at the bottom, 13 mm at the top, 8 mm tall, hollow with 1.5 mm walls.
- Inside: a 5.6 mm round post, 3.8 mm long, with a plus-shaped hole (arms 4.3 x 1.3 mm), 3.8 mm deep.
- The letter on top, bold, 9 mm tall, sunk 0.6 mm into the top.
Lay the base and all the keycaps next to each other, ready to print: base right way up, keycaps upside down, 5 mm apart.
Put every size in a variable at the top with a short comment.`,
  },
  other: {
    label: 'Something else',
    prompt: `Write OpenSCAD code for ...
- Shape:
- Numbers (mm):
- It attaches to:
- How it prints:
- Put every size in a variable at the top with a short comment.`,
  },
};

export const FOLLOW_UPS = [
  'The letters look thin. Make them bolder.',
  'Make the corners rounder.',
  'Explain what each number at the top does, like I\'m 10.',
  'Something is floating in the air. Make sure every part sits on z = 0.',
  'Add one more keycap at the end with a star instead of a letter.',
];

export const AI_CHECKLIST = [
  'Turn the keycap over. Is it hollow, with a plus-shaped hole in the middle?',
  'Do the numbers at the top match what you asked for?',
  'Can you read the letter from the top, the right way round?',
  'Do neighbouring keycaps have room? (17 mm keycaps, 18 mm apart = a 1 mm gap)',
  'Does everything sit flat on the bed, with nothing floating?',
  'Is anything thinner than 1 mm? That is too thin to print well.',
];

export const AFTER_PRINT = [
  { name: 'Slice', what: 'At the print station we slice your design and check the print time.' },
  { name: 'Print', what: 'It prints in PLA. Keycaps take about 3 minutes each, a base about 25.' },
  { name: 'Build', what: 'Press the switches into the base, press your keycaps on, add the keyring.' },
  { name: 'Click!', what: 'Take it home. You designed it, you checked it, you built it.' },
];
