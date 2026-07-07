import type { Metadata } from "next";
import { Special_Elite, Oswald, IM_Fell_English, Caveat } from "next/font/google";
import "./globals.css";

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-special-elite",
  display: "swap",
});

const oswald = Oswald({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const imFell = IM_Fell_English({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-im-fell",
  display: "swap",
});

const caveat = Caveat({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arquivo Sombrio — Dossiês de Investigação",
  description:
    "Fichário de personagens para a campanha de investigação paranormal (sistema 2d6).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body
        className={`${specialElite.variable} ${oswald.variable} ${imFell.variable} ${caveat.variable} min-h-full antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
