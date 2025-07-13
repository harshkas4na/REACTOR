import Hero from '@/components/home/Hero'
import AutomationCards from '@/components/home/AutomationCards'
import DeveloperCTA from '@/components/home/DeveloperCTA'
import Footer from '@/components/home/Footer'
import { Suspense } from 'react'
import LoadingCard from '@/components/templates/LoadingCard'
import TemplatesGrid from '@/components/templates/TemplateGrid'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <main className="flex-grow">
        <div className="w-full">
          <Hero />
          <AutomationCards />
          
        </div>
      </main>
      <Footer />
    </div>
  )
}

