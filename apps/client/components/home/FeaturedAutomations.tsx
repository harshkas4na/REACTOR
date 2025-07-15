import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, Zap, SlidersHorizontal, Shield, Clock } from 'lucide-react'

const automations = [
  {
    name: 'Stop Orders',
    description:
      'Protect your assets from market volatility across multiple DEXs. Our automated stop-loss orders execute 24/7, securing your portfolio so you don`t have to watch the charts.',
    imageSrc: '/unicorn.jpeg',
    imageAlt: 'A unicorn representing Uniswap in a trading interface for stop orders.',
    features: [
      { name: 'Multi-Chain Protection', icon: Shield },
      { name: '24/7 Price Monitoring', icon: CheckCircle },
      { name: 'Gas-Efficient Execution', icon: Zap },
    ],
    cta: {
      href: '/automations/stop-order',
      text: 'Try Stop Orders',
      primary: true,
    },
  },
  {
    name: 'Aave Liquidation Protection',
    description:
      'Safeguard your borrowed positions on Aave from liquidation. Our protection service automatically manages your health factor by repaying debt or adding collateral when you approach risk thresholds.',
    imageSrc: '/racoon.jpeg',
    imageAlt: 'A racoon character in futuristic gear, representing Aave liquidation protection.',
    features: [
      { name: '24/7 Health Factor Monitoring', icon: Shield },
      { name: 'Automatic Debt Repayment', icon: CheckCircle },
      { name: 'Smart Collateral Top-Ups', icon: Zap },
    ],
    cta: {
      href: '/automations/aave-protection',
      text: 'Try Aave Protection',
      primary: true,
    },
  },
  {
    name: 'Fee Collector',
    description:
      'Automatically compound your earnings. Our Fee Collector for Uniswap V3 monitors your positions and claims your earned fees when it`s most profitable, sending them directly to your wallet.',
    imageSrc: '/gryfin.jpeg',
    imageAlt: 'A griffin guarding a collection of glowing coins, representing fee collection.',
    features: [
      { name: 'Automatic Fee Compounding', icon: Zap },
      { name: 'Gas-Cost Optimization', icon: CheckCircle },
      { name: 'Direct-to-Wallet Transfers', icon: Shield },
    ],
    cta: {
      href: '/automations/fee-collector',
      text: 'Coming Soon',
      primary: false,
    },
  },
  {
    name: 'Range Manager',
    description:
      'Keep your Uniswap V3 liquidity in the optimal fee-earning range. The Range Manager intelligently adjusts your position based on market movements to maximize your capital efficiency.',
    imageSrc: '/dragon.jpeg',
    imageAlt: 'A serpentine dragon interacting with a futuristic UI, representing liquidity range management.',
    features: [
      { name: 'Dynamic Range Adjustments', icon: SlidersHorizontal },
      { name: 'Maximized Fee Generation', icon: Zap },
      { name: 'Reduced Impermanent Loss', icon: Shield },
    ],
    cta: {
      href: '/automations/range-manager',
      text: 'Coming Soon',
      primary: false,
    },
  },
   
]

export default function FeaturedAutomations() {
  return (
<section id="featured-automations" className='relative' aria-labelledby="featured-automations-heading">      <div className="space-y-24 sm:space-y-32">
        {automations.map((automation, index) => (
          <div key={automation.name} className="mx-auto max-w-2xl lg:max-w-none lg:mx-0">
            <div className={`grid items-center grid-cols-1 gap-y-16 gap-x-8 lg:grid-cols-2`}>
              <div className={index % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}>
                <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{automation.name}</h3>
                <p className="mt-4 text-lg text-muted-foreground">{automation.description}</p>
                <dl className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1">
                  {automation.features.map((feature) => (
                    <div key={feature.name} className="flex items-start">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <feature.icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-lg font-medium leading-6 text-foreground">{feature.name}</dt>
                      </div>
                    </div>
                  ))}
                </dl>
                <div className="mt-8">
                  {automation.cta.primary ? (
                    <Link
                      href={automation.cta.href}
                      className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {automation.cta.text}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-semibold shadow-sm bg-secondary text-secondary-foreground opacity-60 cursor-not-allowed"
                    >
                      {automation.cta.text}
                    </button>
                  )}
                </div>
              </div>
              <div className={`mt-12 sm:mt-16 lg:mt-0 ${index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}`}>
                <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                   <Image
                    src={automation.imageSrc}
                    alt={automation.imageAlt}
                    width={800}
                    height={800}
                    className={`object-cover w-full h-full ${
                      !automation.cta.primary ? 'blur-sm' : ''
                    }`}
                  />
                  
                  {/* Coming Soon Overlay */}
                  {!automation.cta.primary && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                          <Clock className="h-8 w-8 text-white" />
                        </div>
                        <h4 className="text-2xl font-bold text-white mb-2">Coming Soon</h4>
                        <p className="text-zinc-300 text-sm">This feature is in development</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}