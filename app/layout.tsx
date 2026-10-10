import type { Metadata, Viewport } from 'next';
import './globals.css';
import { asset } from '@/lib/format';

export const metadata: Metadata = {
  title: 'SuperPOS · Prototipo',
  description: 'Prototipo de SuperPOS: punto de venta, inventario y administración.',
  icons: { icon: asset('/logo.svg') },
};
export const viewport: Viewport = { themeColor: '#217fbc', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-page font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
