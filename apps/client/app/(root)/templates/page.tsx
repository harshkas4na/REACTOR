import { Suspense } from 'react'
import TemplatesGrid from '@/components/templates/TemplateGrid'
import LoadingCard from '@/components/templates/LoadingCard'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-100">
          Our Templates
        </h1>
        <Suspense 
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <LoadingCard />
              <LoadingCard />
            </div>
          }
        >
          <TemplatesGrid />
        </Suspense>
      </div>
    </div>
  );
}