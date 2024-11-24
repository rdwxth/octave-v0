import type { Metadata, Viewport } from 'next'
import { SpotifyClone } from "@/components/main"

export const metadata: Metadata = {
  title: 'Streamflix Music',
  description: 'Made by Custom',
  openGraph: {
    type: 'website',
    title: 'Streamflix Music',
    description: 'Made by Custom',
    siteName: 'Streamflix Music',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function SpotifyPage() {
  return (
    <main className="min-h-screen bg-black">
      <SpotifyClone />
    </main>
  )
}