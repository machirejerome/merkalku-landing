import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Ads-Landingpage: nur für bezahlte Anzeigen, nie im Suchindex.
        // Header + Meta-Robots (in der Seite) statt robots.txt-Sperre, damit Google die
        // noindex-Anweisung auch tatsächlich lesen kann.
        source: "/ausschreibung",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
