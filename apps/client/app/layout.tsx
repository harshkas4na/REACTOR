import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/navigation/Navigation";
import ReactorAIWrapper from "@/components/ai/ReactorAIWrapper";
import ReactorBackground from "@/components/ReactorBackground";
import { Providers } from "./providers"; // <-- Import your new component

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

// Your metadata export remains unchanged and works correctly here
export const metadata: Metadata = {
  title: {
    default: "REACTOR - DeFi Automation Made Simple",
    template: "%s | REACTOR"
  },
  // ... rest of your metadata object
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* You can keep any custom head tags here */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      > 
        {/* Use the Providers component to wrap your layout */}
        <Providers>
          <div className="relative min-h-screen bg-[#0b0b2e] overflow-x-hidden">
            <ReactorBackground />
            <Navigation />
            <main className="flex-grow px-4 sm:px-6 lg:px-8">
              {children}
            </main>
            <ReactorAIWrapper />
          </div>
        </Providers>
      </body>
    </html>
  );
}