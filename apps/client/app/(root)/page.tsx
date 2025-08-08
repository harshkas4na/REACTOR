import Hero from '@/components/home/Hero'
import SocialProof from '@/components/home/SocialProof'
import WhyReactor from '@/components/home/WhyReactor'
import FeaturedAutomations from '@/components/home/FeaturedAutomations'
import Footer from '@/components/home/Footer'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen dark:text-foreground overflow-x-hidden">
      <main className="flex-grow">
        {/* The Hero section remains at the top */}
        <Hero />

        {/* NEW SECTIONS:
          This new structure aligns with our strategy to build trust and explain value.
          We will create these new components in the upcoming steps.
        */}
        <div className="container mx-auto px-4 py-12 sm:py-20 space-y-20 sm:space-y-28">
          <SocialProof />
          <WhyReactor />
          <FeaturedAutomations />
         
        </div>

      </main>
      <Footer />
    </div>
  )
}