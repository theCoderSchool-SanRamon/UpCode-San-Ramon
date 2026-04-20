import type { Metadata, Viewport } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "theCoderSchool",
  description:
    "Evaluate theCoderSchool franchise expansion locations across the United States.",
}

export const viewport: Viewport = {
  themeColor: "#047857",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      style={
        {
          "--font-inter":
            '"SF Pro Text", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
          "--font-jetbrains-mono":
            '"SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        } as React.CSSProperties
      }
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
