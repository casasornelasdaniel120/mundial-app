import type { Metadata } from "next";
import { russo, chakra } from '@/lib/fonts'
import "./globals.css";

export const metadata: Metadata = {
  title: "Mundial Fantasy 2026",
  description: "Liga fantasy para el Mundial FIFA 2026 en México. Crea tu equipo, arma tu once y compite con tus amigos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${russo.variable} ${chakra.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-chakra), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
