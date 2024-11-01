"use client";
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { motion } from "framer-motion"

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black text-white py-24 sm:py-32 overflow-hidden">
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black opacity-75"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center"></div>
      </motion.div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Build Reactive Smart Contracts
          </motion.h1>
          <motion.p 
            className="mt-3 max-w-md mx-auto text-xl sm:text-2xl md:mt-5 md:max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Create, deploy, and share automated smart contract templates
          </motion.p>
          <motion.div 
            className="mt-10 flex justify-center space-x-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Link href="/get-started">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="bg-background/10 text-white hover:bg-background/20">
              View Templates
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero