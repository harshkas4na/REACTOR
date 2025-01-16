// components/templates/TemplatesGrid.tsx
import { Suspense } from 'react'
import TemplateCard from './TemplateCard'
import { TEMPLATE_CARDS } from '@/data/constants'
import LoadingCard from './LoadingCard' // You'll need to create this

export default function TemplatesGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
      {TEMPLATE_CARDS.map((card, index) => (
        <Suspense key={index} fallback={<LoadingCard />}>
          <TemplateCard data={card} index={index} />
        </Suspense>
      ))}
    </div>
  );
}