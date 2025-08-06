"use client"

import { ShieldCheck, Zap, Code2 } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    name: 'Automate Your Risk Management',
    description:
      'Protect your DeFi portfolio from market volatility with on-chain Stop Orders. Safeguard your Aave loans from liquidation by automatically managing your Health Factor, 24/7.',
    icon: ShieldCheck,
    status: 'live',
  },
  {
    name: 'Effortless Yield Optimization',
    description:
      'Deploy automated strategies for Uniswap V3. Our Fee Collector and Range Manager will maximize your liquidity provider (LP) earnings and help reduce impermanent loss without constant monitoring.',
    icon: Zap,
    status: 'coming_soon',
  },
  {
    name: 'Build Custom Automations',
    description:
      'Leverage our powerful SDK and Reactive Smart Contracts to build bespoke, event-driven solutions. If you can define an on-chain event, REACTOR can automate the reaction across chains.',
    icon: Code2,
    status: 'live',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut"
    }
  }
}

export default function WhyReactor() {
  return (
    <section className='relative' aria-labelledby="why-reactor-heading">
      <div className="mx-auto max-w-2xl sm:text-center">
        <h2 id="why-reactor-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Why Automate with REACTOR?
        </h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          DeFi never sleeps, but you can. REACTOR gives you the tools to execute your automated trading strategies, secure your crypto assets, and save valuable time, all with gas-efficient, on-chain security.
        </p>
      </div>
      <div className="mt-16 max-w-lg sm:mx-auto md:max-w-none">
        <motion.div 
          className="grid grid-cols-1 gap-y-16 md:grid-cols-3 md:gap-x-12 md:gap-y-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature) => (
            <motion.div 
              key={feature.name} 
              className="relative flex flex-col gap-6 sm:flex-row md:flex-col lg:flex-row"
              variants={itemVariants}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:shrink-0">
                <feature.icon className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="sm:min-w-0 sm:flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-lg font-semibold leading-8 text-foreground">{feature.name}</p>
                  {feature.status === 'coming_soon' && (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}