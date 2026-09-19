export const metadata = {
  title: 'Print station',
  // Open for the length of the workshop, so keep it out of search results.
  robots: { index: false, follow: false },
};

export default function StationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
