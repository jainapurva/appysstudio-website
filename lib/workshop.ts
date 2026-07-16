export const WORKSHOP = {
  id: 'ws-2026-08-22',
  title: 'Idea to Object: AI-Powered 3D Printing',
  date: 'Saturday, August 22, 2026',
  isoDate: '2026-08-22',
  startTime: '2:00 PM',
  endTime: '6:00 PM',
  isoStart: '2026-08-22T14:00:00-07:00',
  isoEnd: '2026-08-22T18:00:00-07:00',
  durationHours: 4,
  pricePerSeat: 30,
  capacity: 10,
  minAge: 12,
  venue: {
    name: "Appy's Studio",
    address: '5804 Biddle Ave',
    city: 'Newark',
    state: 'CA',
    zip: '94560',
  },
} as const;

export const VENUE_ONE_LINE = `${WORKSHOP.venue.address}, ${WORKSHOP.venue.city}, ${WORKSHOP.venue.state} ${WORKSHOP.venue.zip}`;

export const VENUE_MAP_URL = `https://maps.google.com/?q=${encodeURIComponent(VENUE_ONE_LINE)}`;

export const AGENDA: Array<{ time: string; title: string; description: string }> = [
  {
    time: '2:00 — 2:30',
    title: 'How a 3D printer actually works',
    description:
      'Meet the machines. We break down what a 3D printer is doing when it turns a digital file into a physical object — layers, filament, and why some designs print beautifully and others fail.',
  },
  {
    time: '2:30 — 3:15',
    title: 'Designing with AI, from a plain-English idea',
    description:
      'The core of the workshop. You describe what you want in ordinary words, and we show you the AI tools that turn that description into a real 3D model. No CAD experience, no math, no design background needed.',
  },
  {
    time: '3:15 — 4:00',
    title: 'Refining your model so it prints',
    description:
      'AI gets you 80% of the way. We cover the last 20%: fixing wall thickness, adding tolerances so parts actually fit, and the handful of checks that separate a model that prints from one that flops.',
  },
  {
    time: '4:00 — 4:45',
    title: 'Slicing and sending it to the printer',
    description:
      'Turn your model into instructions a printer understands. Supports, infill, orientation, and the settings that matter — explained in terms of what they do to the object in your hand.',
  },
  {
    time: '4:45 — 5:30',
    title: 'Watch it print, live',
    description:
      'Your design goes on the bed and runs. We talk through what is happening as it builds, and troubleshoot in real time when something goes sideways — because it always does, and that is the useful part.',
  },
  {
    time: '5:30 — 6:00',
    title: 'Finishing, and take your goodie home',
    description:
      'Remove supports, clean up the print, and leave with the thing you designed today. We finish with where to go next if you want to keep making.',
  },
];

export const TAKEAWAYS: string[] = [
  'A finished 3D printed object you designed yourself — yours to take home',
  'A repeatable process for going from an idea to a physical product',
  'Hands-on fluency with the AI design tools we use, and free/low-cost ways to keep using them',
  'The judgement to tell a printable design from one that will fail — before you waste four hours of print time',
  'Slicer settings explained in plain language, not jargon',
];

export const REQUIREMENTS: string[] = [
  'Bring your own laptop — this is hands-on, and you will be designing on your own machine. Any Mac, Windows, or Chromebook that can run a browser is fine.',
  `Age ${WORKSHOP.minAge}+. Under 16 is welcome and encouraged, but should be accompanied by a parent or guardian.`,
  'No experience required. Zero design, CAD, or 3D printing background is assumed.',
  'Everything else — printers, filament, software, and materials — is provided.',
];

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'I have never designed anything in my life. Is this really for me?',
    a: 'Yes — that is exactly who this is built for. The whole point of using AI tools is that you describe what you want in plain English and the software does the modelling. If you can explain an idea out loud, you can do this workshop.',
  },
  {
    q: 'Do I need to bring a laptop?',
    a: 'Yes, and it is the one thing we genuinely need from you. You will be designing on your own machine so you can keep everything you make and pick it back up at home. Any Mac, Windows laptop, or Chromebook that runs a modern browser will work. If bringing one is a problem, email us before the workshop and we will try to sort something out.',
  },
  {
    q: 'Do I need to bring a 3D printer or buy software?',
    a: 'No. We provide the printers, the filament, and the software. The AI design tools we use are free or have generous free tiers, so you can keep working after the workshop without paying for anything.',
  },
  {
    q: 'What do I actually leave with?',
    a: 'A physical object that you designed during the session — printed on the day, in your hands when you go. It is included in the ticket, not an upsell.',
  },
  {
    q: 'What is the age requirement?',
    a: `The workshop is for ages ${WORKSHOP.minAge} and up. Younger teens are very welcome; if the attendee is under 16 we ask that a parent or guardian comes along. Parents do not need a separate ticket to accompany a child, but do need one to participate and print.`,
  },
  {
    q: 'Can I register more than one person?',
    a: 'Yes. Choose the number of seats on the registration form and pay for all of them at once. Each attendee gets their own seat, their own design time, and their own printed object — so please make sure each person brings a laptop.',
  },
  {
    q: 'What if I need to cancel?',
    a: 'Email us at appysstudioca@gmail.com at least 7 days before the workshop and we will refund you in full. Inside 7 days we cannot refund, since materials are bought and the seat is hard to fill — but you are welcome to send someone else in your place.',
  },
];
