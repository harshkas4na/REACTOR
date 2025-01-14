'use client'

import { AutomationProvider } from '@/app/_context/AutomationContext';
import { Web3Provider } from '@/app/_context/Web3Context';
import ConvexClerkProvider from '@/app/ConvexClerkProvider';
import { NextUIProvider } from '@nextui-org/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <Web3Provider>
        <AutomationProvider>
          <ConvexClerkProvider>
              <NextThemesProvider attribute="class" defaultTheme="dark">
                {children}
              </NextThemesProvider>
          </ConvexClerkProvider>
        </AutomationProvider>
      </Web3Provider>
    </NextUIProvider>
  )
}

