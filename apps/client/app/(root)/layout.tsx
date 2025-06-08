import { ReactorBackground } from "@/components/ReactorBackground";

// layout.tsx
export default function RootLayout({ 
    children 
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-2 sm:px-4 md:px-6 py-4">
        <div className="w-full max-w-7xl mx-auto ">
        <ReactorBackground/>
          {children}
            
           
        </div>
      </main>
    )
  }