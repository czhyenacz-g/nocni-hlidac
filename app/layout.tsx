import type { Metadata } from "next";
import "./globals.css";
import "@/styles/pixel.css";
import "@/styles/atmosphere.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOATCOUNTER_CODE } from "./config/analytics";

export const metadata: Metadata = {
  title: "Noční hlídač — Objekt 13: První směna",
  description: "Klaustrofobická lekací hra v prohlížeči. Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
  openGraph: {
    title: "Noční hlídač — Objekt 13: První směna",
    description: "Klaustrofobická lekací hra v prohlížeči. Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
    url: "https://nocni-hlidac.cz",
    siteName: "Noční hlídač",
    locale: "cs_CZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noční hlídač — Objekt 13: První směna",
    description: "Klaustrofobická lekací hra v prohlížeči. Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body className="bg-gray-900 text-white antialiased">
        {children}
        <Analytics />
        {GOATCOUNTER_CODE && (
          <Script
            data-goatcounter={`https://${GOATCOUNTER_CODE}.goatcounter.com/count`}
            src="//gc.zgo.at/count.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
