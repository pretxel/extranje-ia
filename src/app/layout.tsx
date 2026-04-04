import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Extranjería.ai — Resuelve tus dudas de NIE, TIE y visados",
  description:
    "Consultas sobre NIE, TIE, visados y permisos en España respondidas en segundos con fuentes oficiales verificadas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${playfair.variable} ${plusJakarta.variable}`}>
        <body className="min-h-screen bg-[#070B14] text-[#F0ECE4] font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
