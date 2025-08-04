"use client";
import { useState } from "react";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  SparklesIcon,
  ShieldExclamationIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import React from "react";

const slides = [
  // USE THIS AS THE DEFAULT WELCOME TEXT
  {
    id: 0,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Automate DeFi, Without Code
        </span>{" "}
      </>
    ),
    subtitle: "Protect your assets 24/7 with fully on-chain, autonomous automations. Set your strategy once and let Reactor handle the rest.",
  },
  // USE THIS FOR STOP ORDERS (UNISWAP)
  {
    id: 1,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700 ">
          Protect Your Tokens Automatically
        </span>{" "}
      </>
    ),
    subtitle: "Set up Uniswap stop orders to secure your positions when prices drop",
    primaryButton: {
      text: "Create Stop Order",
      href: "/automations/stop-order",
      icon: ShieldExclamationIcon
    }
  },
  // USE THIS FOR AAVE PROTECTION
  {
    id: 2,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Prevent Liquidations Automatically
        </span>{" "}
      </>
    ),
    subtitle: "Automatically manage your Aave health factor to avoid costly liquidations",
    primaryButton: {
      text: "Setup Aave Protection",
      href: "/automations/aave-protection",
      icon: ShieldExclamationIcon
    },
  },
];

export default function Hero() {
  const [activeFeature, setActiveFeature] = useState<'stop-order' | 'aave' | null>(null);

  const handleCardClick = (feature: 'stop-order' | 'aave') => {
    if (activeFeature === feature) {
      setActiveFeature(null);
    } else {
      setActiveFeature(feature);
    }
  };

  const getCurrentSlide = () => {
    if (activeFeature === 'stop-order') return slides[1];
    if (activeFeature === 'aave') return slides[2];
    return slides[0];
  };

  const currentSlide = getCurrentSlide();

  return (
    <section className="relative min-h-screen  overflow-hidden">
      
      <div className="relative z-10 container mx-auto px-4 py-16 h-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left Column - Dynamic Text Content */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  {currentSlide.title}
                </h1>
                
                <p className="text-xl lg:text-2xl text-slate-300 leading-relaxed max-w-2xl">
                  {currentSlide.subtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {currentSlide.primaryButton ? (
                    <Link href={currentSlide.primaryButton.href}>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 text-lg"
                        startContent={<currentSlide.primaryButton.icon className="w-5 h-5" />}
                      >
                        {currentSlide.primaryButton.text}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/docs">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 text-lg"
                        startContent={<CodeBracketIcon className="w-5 h-5" />}
                      >
                        For Developers
                      </Button>
                    </Link>
                  )}
                  
                  <Button
                    variant="bordered"
                    size="lg"
                    className="border-purple-400 text-purple-400 hover:bg-purple-400/10 font-semibold px-8 py-3 text-lg"
                    startContent={<SparklesIcon className="w-5 h-5" />}
                  >
                    Learn More
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Feature Status Indicator */}
            <motion.div 
              className="flex items-center gap-2 text-sm text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className={`w-2 h-2 rounded-full ${activeFeature ? 'bg-green-400' : 'bg-purple-400'} animate-pulse`}></div>
              {activeFeature ? `${activeFeature} feature active` : 'Click a card to explore features'}
            </motion.div>
          </motion.div>

          {/* Right Column - Interactive Quadrant System */}
          <motion.div 
            className="relative h-[600px] w-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Glowing Grid Background */}
            <div className="absolute inset-0 opacity-30">
              <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl"></div>
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_24%,rgba(168,85,247,0.1)_25%,rgba(168,85,247,0.1)_26%,transparent_27%,transparent_74%,rgba(168,85,247,0.1)_75%,rgba(168,85,247,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent)] bg-[length:60px_60px]"></div>
            </div>

            {/* 2x2 Quadrant Grid */}
            <div className="relative grid grid-cols-2 grid-rows-2 gap-4 h-full p-4">
              
              {/* Quadrant 1 - Stop Order (Top-Left) */}
              <motion.div
                className="relative cursor-pointer group"
                onClick={() => handleCardClick('stop-order')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="w-full h-full rounded-xl relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ 
                    rotateY: activeFeature === 'stop-order' ? 180 : 0 
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  {/* Front Face */}
                  <motion.div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-xl border border-red-500/30 flex items-center justify-center group-hover:border-red-400/50 transition-colors"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="text-center space-y-4">
                      <Image
                        src="/images/hero/uniswap-logo.png"
                        alt="Uniswap Logo"
                        width={80}
                        height={80}
                        className="mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <p className="text-red-300 font-medium">Stop Orders</p>
                    </div>
                  </motion.div>

                  {/* Back Face */}
                  <motion.div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-red-600/30 to-red-800/30 rounded-xl border border-red-400/50 flex items-center justify-center"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <Image
                      src="/images/hero/stop-order-scene.png"
                      alt="Stop Order Scene"
                      fill
                      className="object-cover rounded-xl opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 to-transparent rounded-xl"></div>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Quadrant 2 - Decorative (Top-Right) */}
              <motion.div 
                className="bg-gradient-to-br from-slate-800/30 to-slate-700/30 rounded-xl border border-slate-600/20 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="text-center space-y-2 opacity-40">
                  <SparklesIcon className="w-12 h-12 text-purple-400 mx-auto" />
                  <p className="text-slate-400 text-sm">More Features</p>
                  <p className="text-slate-500 text-xs">Coming Soon</p>
                </div>
              </motion.div>

              {/* Quadrant 3 - Decorative (Bottom-Left) */}
              <motion.div 
                className="bg-gradient-to-br from-slate-800/30 to-slate-700/30 rounded-xl border border-slate-600/20 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <div className="text-center space-y-2 opacity-40">
                  <CodeBracketIcon className="w-12 h-12 text-blue-400 mx-auto" />
                  <p className="text-slate-400 text-sm">Custom Logic</p>
                  <p className="text-slate-500 text-xs">Coming Soon</p>
                </div>
              </motion.div>

              {/* Quadrant 4 - Aave Protection (Bottom-Right) */}
              <motion.div
                className="relative cursor-pointer group"
                onClick={() => handleCardClick('aave')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="w-full h-full rounded-xl relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ 
                    rotateY: activeFeature === 'aave' ? 180 : 0 
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  {/* Front Face */}
                  <motion.div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-400/50 transition-colors"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="text-center space-y-4">
                      <Image
                        src="/images/hero/aave-logo.png"
                        alt="Aave Logo"
                        width={80}
                        height={80}
                        className="mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <p className="text-cyan-300 font-medium">Aave Protection</p>
                    </div>
                  </motion.div>

                  {/* Back Face */}
                  <motion.div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-cyan-600/30 to-purple-600/30 rounded-xl border border-cyan-400/50 flex items-center justify-center"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <Image
                      src="/images/hero/aave-protection-scene.png"
                      alt="Aave Protection Scene"
                      fill
                      className="object-cover rounded-xl opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent rounded-xl"></div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Interaction Hint */}
            <motion.div
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <p className="text-sm text-slate-400">
                Click the cards to explore features
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}