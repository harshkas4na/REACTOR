"use client";
import { Suspense } from 'react'
import Hero from '@/components/home/Hero'
import Features from '@/components/home/Features'
import Testimonials from '@/components/home/Testimonials'
import CallToAction from '@/components/home/CallToAction'
import Footer from '@/components/home/Footer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Suspense fallback={<LoadingSpinner />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <Features />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <Testimonials />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <CallToAction />
      </Suspense>
      <Footer />
    </div>
  )
}