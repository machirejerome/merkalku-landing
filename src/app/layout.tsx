import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MerKalku – Mehr Aufträge. Weniger Büro.",
  description:
    "In 30 Minuten zeigen wir Ihnen, wie Gebäudereiniger Ausschreibungen in einem Bruchteil der Zeit kalkulieren – fehlerfrei und praxisnah.",
  openGraph: {
    title: "MerKalku – Mehr Aufträge. Weniger Büro.",
    description:
      "Ausschreibungen kalkulieren in Minuten statt Tagen. Kostenloser 30-Min-Praxischeck für Gebäudereiniger.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
