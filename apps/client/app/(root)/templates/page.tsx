import { Suspense } from 'react'
import TemplatesGrid from '@/components/templates/TemplateGrid'
import LoadingCard from '@/components/templates/LoadingCard'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">Our Templates</h1>
        <Suspense fallback={<div className="grid md:grid-cols-2 gap-8">
          <LoadingCard />
          <LoadingCard />
        </div>}>
          <TemplatesGrid />
        </Suspense>
      </div>
    </div>
  );
}