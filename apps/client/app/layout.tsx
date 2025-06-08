import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AutomationProvider } from "./_context/AutomationContext";
import ConvexClerkProvider from "./ConvexClerkProvider";
import Navigation from "@/components/navigation/Navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3Provider } from "@/app/_context/Web3Context";
import ReactorAI from "@/components/ai/ReactorAI";

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
  title: "REACTOR",
  description: "Reactive Smart Contract Platform - Create, deploy, and share automated smart contract templates",
  icons: ['/Symbol/Color/DarkBg.png']
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      > 
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Web3Provider>
          <AutomationProvider >
            <ConvexClerkProvider>
            <div className="relative min-h-screen bg-[#1a0b2e] overflow-hidden">
                <Navigation />
                <main className="flex-grow px-4 sm:px-6 lg:px-8">
                
                  {children}
                </main>
                <ReactorAI />
              </div>
            </ConvexClerkProvider>
          </AutomationProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}