import Link from 'next/link'
import { Shield, Zap, DollarSign, SlidersHorizontal } from 'lucide-react'
import { FC } from 'react'

const icons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Shield,
  Zap,
  DollarSign,
  SlidersHorizontal,
}

interface AutomationCardProps {
  name: string
  description: string
  href: string
  icon: string
  status?: string
}

const AutomationCard: FC<AutomationCardProps> = ({ name, description, href, icon, status }) => {
  const Icon = icons[icon]
  const isComingSoon = status === 'Coming Soon'

  const cardContent = (
    <div className={`group relative flex flex-col h-full rounded-2xl border border-border bg-card p-6 shadow-lg transition-shadow duration-300 ${isComingSoon ? 'cursor-not-allowed' : 'hover:shadow-primary/20'}`}>
        {isComingSoon && (
            <span className="absolute top-4 right-4 inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
            Coming Soon
            </span>
        )}
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ${isComingSoon && 'opacity-50'}`}>
            {Icon && <Icon className="h-8 w-8" aria-hidden="true" />}
        </div>
        <div className="mt-6 flex-grow">
            <h3 className="text-lg font-semibold leading-8 text-foreground">
                {name}
            </h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
                {description}
            </p>
        </div>
        {!isComingSoon && (
            <div className="mt-6">
                <span className="text-sm font-semibold text-primary group-hover:underline">
                    Learn More &rarr;
                </span>
            </div>
        )}
    </div>
  )
    
  if (isComingSoon) {
    return cardContent;
  }

  return (
    <Link href={href} className="h-full">
      {cardContent}
    </Link>
  )
}

export default AutomationCard