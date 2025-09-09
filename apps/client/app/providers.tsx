// app/providers.tsx
'use client';

import { ThemeProvider } from "@/components/theme-provider";
import { Web3Provider } from "@/app/_context/Web3Context";
import { AutomationProvider } from "./_context/AutomationContext";
import { ConvexProvider } from "convex/react";
import { convex } from "@/app/convexClient";

export function Providers({ children }: { children: React.ReactNode }) {
  // All providers that require "use client" are wrapped here
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Web3Provider>
        <AutomationProvider>
          <ConvexProvider client={convex}>
            {children}
          </ConvexProvider>
        </AutomationProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}