"use client";
import { Button } from "@nextui-org/react"
import Link from 'next/link'
import { motion } from "framer-motion"
import { RocketLaunchIcon, SparklesIcon } from '@heroicons/react/24/solid'
import Image from "next/image";

const Hero = () => {
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:gap-12">
        <motion.div 
            className="lg:w-1/2 lg:pr-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Build Reactive Smart Contracts
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-zinc-300">
              Create, deploy, and share automated smart contract templates
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                as={Link}
                href="/dapp-automation"
                color="primary"
                variant="shadow"
                size="lg"
                startContent={<RocketLaunchIcon className="h-5 w-5" />}
                className="w-full sm:w-auto"
              >
                Use Automations
              </Button>
              <Button
                as={Link}
                href="/generate-reactive-contract"
               className="w-full sm:w-auto  hover:bg-blue-950/50"
                variant="bordered"
                size="lg"
                startContent={<SparklesIcon className="h-5 w-5" />}
              >
                Generate Automations
              </Button>
            </div>
          </motion.div>
          <motion.div 
            className="lg:w-1/2 mt-12 lg:mt-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-3xl shadow-2xl">
              <Image src="/Background2.jpg" alt="Reactor Logo" width={500} height={500} className="object-cover w-full h-full" /> 
              {/* <div className="absolute inset-0 bg-[url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-nWbtLyKBEQ72R4nNytSIq5lnYcTzIx.png')] bg-cover bg-center opacity-75"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20"></div> */}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero



