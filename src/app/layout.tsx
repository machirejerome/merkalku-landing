import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display face for headlines — full Latin-ext coverage (ä ö ü ß), loaded with swap so it
// never blocks the LCP poster. Body text stays on Inter.
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const SITE_URL = "https://merkalku.de";

export const metadata: Metadata = {
  // ── Core SEO ──
  title: {
    default: "MerKalku – Mehr Aufträge. Weniger Büro.",
    template: "%s | MerKalku",
  },
  description:
    "KI-gestützte Kalkulationsplattform für Gebäudereiniger. Objektdaten hochladen – egal ob PDF, Bauplan, Excel oder Fließtext. Die KI erkennt alles, rechnet alles, liefert das fertige Angebot. Ohne Abtippen.",
  keywords: [
    "Gebäudereinigung Kalkulation",
    "Reinigungskalkulation Software",
    "Kalkulationssoftware Gebäudereiniger",
    "Angebotskalkulation Reinigung",
    "Leistungsverzeichnis Gebäudereinigung",
    "Revierplanung Software",
    "KI Kalkulation",
    "Gebäudereiniger Software",
    "Ausschreibung Gebäudereinigung",
    "Reinigungsangebot erstellen",
    "MerKalku",
    "Kalkulationstool Reinigung",
    "Unterhaltsreinigung Kalkulation",
  ],
  authors: [{ name: "Jerome Machire" }],
  creator: "Jerome Machire Leadgainers Agency e.K.",
  publisher: "MerKalku",

  // ── Canonical + Alternates ──
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "de-DE": "/",
    },
  },

  // ── Open Graph (Facebook, LinkedIn) ──
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_URL,
    siteName: "MerKalku",
    title: "MerKalku – Mehr Aufträge. Weniger Büro.",
    description:
      "Fehlerfreie Kalkulationen in Minuten statt Stunden. Mehr Angebote rausschicken, mehr Aufträge gewinnen – ohne zusätzliches Personal.",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 278,
        alt: "MerKalku – Mehr Aufträge. Weniger Büro.",
      },
    ],
  },

  // ── Twitter Card ──
  twitter: {
    card: "summary_large_image",
    title: "MerKalku – Mehr Aufträge. Weniger Büro.",
    description:
      "KI-gestützte Kalkulationsplattform für Gebäudereiniger. PDF hochladen, KI rechnet, Angebot fertig.",
    images: ["/og-image.png"],
  },

  // ── Robots ──
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Icons ──
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },

  // ── Verification (fill in when available) ──
  // verification: {
  //   google: "YOUR_GOOGLE_VERIFICATION_CODE",
  // },
};

// ── JSON-LD Structured Data: LocalBusiness + SoftwareApplication ──
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "MerKalku",
      legalName: "Jerome Machire Leadgainers Agency e.K.",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description:
        "KI-gestützte Kalkulationsplattform für Gebäudereiniger. Mehr Aufträge. Weniger Büro.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Schmalzgasse 4",
        addressLocality: "Ispringen",
        postalCode: "75228",
        addressRegion: "Baden-Württemberg",
        addressCountry: "DE",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "info@merkalku.de",
        contactType: "sales",
        availableLanguage: ["German"],
      },
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "MerKalku",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "KI-gestützte Kalkulationsplattform für Gebäudereiniger. Objektdaten hochladen – egal ob PDF, Bauplan, Excel oder Fließtext. Automatische Raumerkennung, Kalkulation und Angebotserstellung.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "Kostenloser 30-Minuten-Praxischeck",
      },
      provider: {
        "@id": `${SITE_URL}/#organization`,
      },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Gebäudereinigungsunternehmen",
        numberOfEmployees: {
          "@type": "QuantitativeValue",
          minValue: 50,
        },
      },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "MerKalku – Mehr Aufträge. Weniger Büro.",
      description:
        "In 30 Minuten zeigen wir Ihnen, wie Gebäudereiniger Ausschreibungen und Objektdaten in einem Bruchteil der Zeit kalkulieren.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "de-DE",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "MerKalku",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "de-DE",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} ${sora.variable}`}>
      <head>
        {/* Preload hero poster for instant LCP */}
        <link rel="preload" as="image" href="/hero-poster.webp" type="image/webp" />
        {/* Preconnect to LeadConnector (saves ~360ms LCP per Lighthouse) */}
        <link rel="preconnect" href="https://stcdn.leadconnectorhq.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="geo.region" content="DE-BW" />
        <meta name="geo.placename" content="Ispringen" />
        <meta name="geo.position" content="48.9123;8.6628" />
        <meta name="ICBM" content="48.9123, 8.6628" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
