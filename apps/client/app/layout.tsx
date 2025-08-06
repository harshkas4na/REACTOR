import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AutomationProvider } from "./_context/AutomationContext";
import Navigation from "@/components/navigation/Navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3Provider } from "@/app/_context/Web3Context";
import ReactorAIWrapper from "@/components/ai/ReactorAIWrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "REACTOR - DeFi Automation Made Simple",
    template: "%s | REACTOR"
  },
  description: "Automate your DeFi with no code. Protect Uniswap positions with stop orders, secure Aave loans from liquidation, and automate fee collection - all through simple conversation with our AI assistant.",
  keywords: [
    "DeFi automation",
    "Uniswap stop orders", 
    "Aave liquidation protection",
    "reactive smart contracts",
    "DeFi AI assistant",
    "automated trading",
    "crypto automation",
    "blockchain automation",
    "DeFi protection",
    "smart contract automation"
  ],
  authors: [{ name: "REACTOR Team" }],
  creator: "REACTOR",
  publisher: "REACTOR",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://thereactor.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thereactor.in',
    title: 'REACTOR - DeFi Automation Made Simple',
    description: 'Automate your DeFi with AI. Protect Uniswap positions, secure Aave loans, and automate fee collection through simple conversation.',
    siteName: 'REACTOR',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'REACTOR - DeFi Automation Platform',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REACTOR - DeFi Automation Made Simple',
    description: 'Automate your DeFi with AI. Protect Uniswap positions, secure Aave loans, and more.',
    creator: '@0xReactor',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/Symbol/Color/DarkBg.png',
    shortcut: '/Symbol/Color/DarkBg.png',
    apple: '/Symbol/Color/DarkBg.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="canonical" href="https://thereactor.in" />
        <meta name="theme-color" content="#1a0b2e" />
        <meta name="msapplication-TileColor" content="#1a0b2e" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "REACTOR",
              "description": "DeFi automation platform with AI assistant for creating stop orders, liquidation protection, and fee collection automations",
              "url": "https://thereactor.in",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "AI-powered DeFi automation",
                "Uniswap stop orders",
                "Aave liquidation protection",
                "Automated fee collection",
                "Reactive smart contracts"
              ]
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      > 
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Web3Provider>
            <AutomationProvider>
              <div className="relative min-h-screen bg-[#1a0b2e] overflow-hidden">
                <Navigation />
                <main className="flex-grow px-4 sm:px-6 lg:px-8">
                  {children}
                </main>
                <ReactorAIWrapper />
              </div>
            </AutomationProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}