// components/templates/TemplatesGrid.tsx
import { Suspense } from 'react'
import TemplateCard from './TemplateCard'
import { TEMPLATE_CARDS } from '@/data/constants'
import LoadingCard from './LoadingCard' // You'll need to create this

export default function TemplatesGrid() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {TEMPLATE_CARDS.map((card, index) => (
        <Suspense key={index} fallback={<LoadingCard />}>
          <TemplateCard data={card} index={index} />
        </Suspense>
      ))}
    </div>
  );
}
