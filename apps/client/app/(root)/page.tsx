import Hero from '@/components/home/Hero'
import AutomationCards from '@/components/home/AutomationCards'
import DeveloperCTA from '@/components/home/DeveloperCTA'
import Footer from '@/components/home/Footer'
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <main className="flex-grow">
        <div className="w-full">
          <Hero />
          <AutomationCards />
          <DeveloperCTA />
        </div>
      </main>
      <Footer />
    </div>
  )
}

