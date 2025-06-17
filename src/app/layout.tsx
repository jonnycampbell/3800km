import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3800km - Hiking Progress Tracker",
  description: "Track your hiking journey towards 3,800km using Strava data. Visualize progress, document adventures, and achieve your ambitious hiking goals.",
  keywords: ["hiking", "strava", "progress tracking", "3800km", "walking", "outdoor adventures"],
  authors: [{ name: "3800km" }],
  openGraph: {
    title: "3800km - Hiking Progress Tracker",
    description: "Track your hiking journey towards 3,800km using Strava data",
    type: "website",
    url: "https://www.3800km.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/iyl4rwl.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Debug font loading
              if (typeof document !== 'undefined') {
                document.addEventListener('DOMContentLoaded', function() {
                  // Check if acumin-pro font is loaded
                  if (document.fonts && document.fonts.check) {
                    const acuminLoaded = document.fonts.check('16px acumin-pro');
                    console.log('Acumin Pro font loaded:', acuminLoaded);
                    
                    // Wait for fonts to load
                    document.fonts.ready.then(function() {
                      console.log('All fonts loaded');
                      const acuminLoadedAfter = document.fonts.check('16px acumin-pro');
                      console.log('Acumin Pro font loaded after ready:', acuminLoadedAfter);
                    });
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-acumin`}
      >
        {children}
      </body>
    </html>
  );
}
