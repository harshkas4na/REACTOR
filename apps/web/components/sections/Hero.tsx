
"use client";
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { motion } from "framer-motion"

const Hero = () => {
  return (
    <div>
        <section className="relative bg-gradient-to-r from-gray-800 to-gray-900 text-white py-24 sm:py-32 overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 opacity-75"></div>
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
              You Think, We Automate
            </motion.h1>
            <motion.p 
              className="mt-3 max-w-md mx-auto text-xl sm:text-2xl md:mt-5 md:max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              A tech that works on top of Reactive Network
            </motion.p>
            <motion.div 
              className="mt-10 flex justify-center space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Link href="/generate">
                <Button size="lg" className="bg-primary text-white hover:bg-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  Get Started
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 ease-in-out transform hover:scale-105">
                Read Docs
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Hero