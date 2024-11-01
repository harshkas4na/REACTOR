"use client";
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from 'next/link'

const CallToAction = () => {
  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2 
          className="text-3xl font-extrabold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Ready to Automate Your Smart Contracts?
        </motion.h2>
        <motion.p 
          className="text-xl mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join thousands of developers and businesses leveraging the power of reactive smart contracts.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
              Get Started Now
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default CallToAction