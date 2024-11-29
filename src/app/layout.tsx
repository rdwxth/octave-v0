import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
})

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
})

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  minimumScale: 1,
  interactiveWidget: "resizes-visual"
}

export const metadata: Metadata = {
  title: {
    default: "Octave Streaming",
    template: "%s | Octave Streaming",
  },
  description: "Made by Custom and Abdullah",
  keywords: ["music", "streaming", "spotify", "clone", "nextjs"],
  authors: [{ name: "Your Name" }],
  creator: "Your Name",
  publisher: "Your Name",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-domain.com",
    siteName: "Octave Streaming",
    title: "Octave Streaming",
    description: "Made by Custom and Abdullah",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Octave Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oactave Streaming",
    description: "Made by Custom and Abdullah",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html 
      lang="en" 
      className="dark h-full"
      suppressHydrationWarning
    >
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background min-h-[100dvh] overscroll-none`}>
        <main className="relative flex min-h-[100dvh] flex-col">
          {children}
        </main>

        {/* Skip to content button for accessibility */}
        <a
          href="#main-content"
          className="fixed top-0 left-0 p-2 -translate-y-full focus:translate-y-0 bg-background z-50"
        >
          Skip to content
        </a>
      </body>
    </html>
  )
}

// Optional: Analytics or other global scripts
export const runtime = "edge"
export const preferredRegion = "auto"