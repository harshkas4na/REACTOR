"use client"

import { ShieldCheck, Zap, Layers, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

const stats = [
  { name: 'Audited Smart Contracts', value: '100%', icon: ShieldCheck },
  { name: 'Automations Executed', value: '500+', icon: Zap },
  { name: 'Core Protocols Live', value: '2', description: '(Uniswap & Aave)', icon: Layers },
  { name: 'Supported Networks', value: '3+', description: '(Ethereum, Avalanche, Reactive)', icon: Globe },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
}

export default function SocialProof() {
  return (
    <section className='relative' aria-labelledby="social-proof-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="grid grid-cols-1 items-center gap-y-16 gap-x-8 lg:grid-cols-2">
            <div>
              <h2
                id="social-proof-heading"
                className="text-4xl font-bold tracking-tight sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"
              >
                Secure, On-Chain Automation You Can Trust.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our audited smart contract architecture provides a secure foundation for your DeFi strategies. Automate your risk management and yield optimization with confidence, knowing your assets are handled by robust, on-chain logic.
              </p>
            </div>
            <motion.div 
              className="grid grid-cols-1 gap-8 sm:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {stats.map((stat) => (
                <motion.div
                  key={stat.name}
                  className="flex flex-col-reverse gap-y-2 border-l-4 border-primary/50 pl-6"
                  variants={itemVariants}
                >
                  <dt className="text-base leading-7 text-muted-foreground">
                    {stat.name}
                    {stat.description && (
                      <span className="block text-sm text-muted-foreground/70">
                        {stat.description}
                      </span>
                    )}
                  </dt>
                  <dd className="text-4xl font-semibold tracking-tight text-foreground">{stat.value}</dd>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}