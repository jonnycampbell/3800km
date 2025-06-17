import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { logger } from '@/lib/logger'

// Startup logging
logger.info('Application starting up', {
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
  nextVersion: process.env.NEXT_RUNTIME || 'unknown'
}, 'app-layout')

// Environment validation at startup
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'STRAVA_ACCESS_TOKEN',
  'STRAVA_REFRESH_TOKEN'
]

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  logger.error('Missing critical environment variables at startup', undefined, {
    missing: missingEnvVars,
    total: requiredEnvVars.length,
    environment: process.env.NODE_ENV,
    severity: 'CRITICAL'
  }, 'app-layout')
} else {
  logger.info('All required environment variables present', {
    checkedVars: requiredEnvVars.length,
    environment: process.env.NODE_ENV
  }, 'app-layout')
}

// Log optional environment variables
const optionalEnvVars = [
  'NEXT_PUBLIC_BASE_URL',
  'STRAVA_REDIRECT_URI'
]

const presentOptionalVars = optionalEnvVars.filter(varName => !!process.env[varName])

logger.debug('Optional environment variables status', {
  present: presentOptionalVars,
  missing: optionalEnvVars.filter(varName => !process.env[varName]),
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not_set'
}, 'app-layout')

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

logger.debug('Font loaded successfully', {
  fontFamily: 'Geist',
  variable: '--font-geist-sans'
}, 'app-layout')

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

logger.info('Metadata configured', {
  title: metadata.title,
  hasDescription: !!metadata.description,
  hasKeywords: !!metadata.keywords
}, 'app-layout')

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  logger.debug('Root layout rendering', {
    hasChildren: !!children,
    environment: process.env.NODE_ENV
  }, 'app-layout')

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
        {/* Development indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-0 left-0 z-50 bg-yellow-400 text-black px-2 py-1 text-xs font-bold">
            DEV
          </div>
        )}
        
        {/* Main app content */}
        <main>
          {children}
        </main>
        
        {/* Footer with build info in development */}
        {process.env.NODE_ENV === 'development' && (
          <footer className="fixed bottom-0 right-0 z-50 bg-gray-800 text-white p-2 text-xs opacity-75">
            <div>Node: {process.env.NODE_ENV}</div>
            <div>Built: {new Date().toLocaleTimeString()}</div>
          </footer>
        )}
      </body>
    </html>
  );
}
