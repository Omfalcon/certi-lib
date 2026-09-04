import type { Metadata } from 'next';
import { Inter, Great_Vibes } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const greatVibes = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-great-vibes',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Workshop on Advanced LaTeX — Certificate Portal | UPES',
  description:
    'Download your Certificate of Participation for the Workshop on Advanced LaTeX for Research Writing and Publication — Dr. S. J. Chopra Centre for Learning, UPES.',
  keywords: [
    'LaTeX',
    'Workshop',
    'UPES',
    'Research Writing',
    'Publication',
    'Certificate',
    'Dr. S. J. Chopra Centre for Learning',
  ],
  openGraph: {
    title: 'Workshop on Advanced LaTeX — Certificate Portal | UPES',
    description: 'Download your Certificate of Participation.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${greatVibes.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
