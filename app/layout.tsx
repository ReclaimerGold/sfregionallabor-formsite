import type { Metadata } from "next";
import { Bitter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

/**
 * The Figma reference uses a heavy slab serif for display type and a text serif
 * for body copy. These are the closest Google Fonts matches — swap the imports
 * here if the design calls for a specific licensed family.
 */
const bitter = Bitter({
  variable: "--font-bitter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Get Involved | Sioux Falls Regional Labor Federation",
  description:
    "Connect with the Sioux Falls Regional Labor Federation. Tell us about yourself and how you'd like to get involved — volunteering, committees, or partnering with us.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bitter.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
