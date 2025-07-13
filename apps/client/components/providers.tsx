'use client'

import { AutomationProvider } from '@/app/_context/AutomationContext';
import { Web3Provider } from '@/app/_context/Web3Context';
import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <Web3Provider>
        <AutomationProvider>
            <NextThemesProvider attribute="class" defaultTheme="dark">
              {children}
            </NextThemesProvider>
        </AutomationProvider>
      </Web3Provider>
    </NextUIProvider>
  )
}

