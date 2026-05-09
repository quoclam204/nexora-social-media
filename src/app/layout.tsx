import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Nexora — Connect & Share',
    template: '%s | Nexora',
  },
  description: 'Nexora is a modern social media platform to connect with friends, share moments, and discover trending content.',
  keywords: ['social media', 'nexora', 'connect', 'share', 'community'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    title: 'Nexora — Connect & Share',
    description: 'A modern social media platform.',
    siteName: 'Nexora',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'custom-toast',
            duration: 4000,
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-sm)',
            },
          }}
        />
      </body>
    </html>
  );
}
