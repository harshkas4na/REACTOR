"use client";
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from 'next/link'

const CallToAction = () => {
  return (
    <section className="py-24 bg-primary dark:bg-gray-800 text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2 
          className="text-3xl font-extrabold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Build the Future of DeFi Automation
        </motion.h2>
        <motion.p 
          className="text-xl mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Harness the power of Reactive Smart Contracts to create seamless, cross-chain DeFi automations. Join developers building the next generation of DeFi infrastructure.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
              Start Building
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default CallToAction