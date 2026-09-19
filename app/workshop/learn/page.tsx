import WorkshopLearn from '@/components/WorkshopLearn';

export const metadata = {
  title: "Workshop: Learn Step by Step | Appy's Studio",
  description: 'Learn how 3D printing works, then design your own clicker keychain with AI, step by step.',
  alternates: { canonical: 'https://appysstudio.com/workshop/learn' },
  // A tool for the room, not a landing page.
  robots: { index: false, follow: false },
};

export default function WorkshopLearnPage() {
  return <WorkshopLearn />;
}
