import Hero from '@/components/home/Hero'
import AutomationCards from '@/components/home/AutomationCards'
import DeveloperCTA from '@/components/home/DeveloperCTA'
import Footer from '@/components/home/Footer'
import WaveBackground from '@/components/WaveBackground'
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen  text-gray-900 dark:text-gray-100">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* <WaveBackground /> */}
          <Hero />
          <AutomationCards />
          <DeveloperCTA />
        </div>
      </main>
      <Footer />
    </div>
  )
  }

