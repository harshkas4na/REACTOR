import { Lock, Zap, Repeat } from 'lucide-react'

const features = [
  {
    name: 'Automated Risk Management.',
    description:
      'Set up Stop Orders and Aave Liquidation Protection to safeguard your assets 24/7. Protect your portfolio from market volatility without constant monitoring.',
    icon: Lock,
  },
  {
    name: 'Maximize Your Yield.',
    description:
      'Deploy our automated Fee Collector and Range Manager for your Uniswap V3 positions. Keep your liquidity active and earning fees, effortlessly.',
    icon: Zap,
  },
  {
    name: 'Build Custom Solutions.',
    description:
      'Leverage our developer tools to deploy bespoke Reactive Smart Contracts. If you can define an on-chain event, you can automate the reaction.',
    icon: Repeat,
  },
]

export default function WhyReactor() {
  return (
    <section className='relative' aria-labelledby="why-reactor-heading">
      <div className="mx-auto max-w-2xl sm:text-center">
        <h2 id="why-reactor-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Why Automate with REACTOR?
        </h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          DeFi is complex and moves 24/7. REACTOR gives you the power to automate your strategy, save time, and secure your assets so you can stay ahead of the curve.
        </p>
      </div>
      <div className="mt-16 max-w-lg sm:mx-auto md:max-w-none">
        <div className="grid grid-cols-1 gap-y-16 md:grid-cols-3 md:gap-x-12 md:gap-y-16">
          {features.map((feature) => (
            <div key={feature.name} className="relative flex flex-col gap-6 sm:flex-row md:flex-col lg:flex-row">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:shrink-0">
                <feature.icon className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="sm:min-w-0 sm:flex-1">
                <p className="text-lg font-semibold leading-8 text-foreground">{feature.name}</p>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}