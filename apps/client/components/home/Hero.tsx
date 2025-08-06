"use client";
import { useState } from "react";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  SparklesIcon,
  ShieldExclamationIcon,
  RocketLaunchIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import React from "react";

const slides = [
  // Default welcome screen
  {
    id: 0,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Automate DeFi Without Code
        </span>
      </>
    ),
    subtitle: "Deploy powerful DeFi automations in minutes with ready-to-use templates",
    primaryButton: {
      text: "Use Automations",
      href: "#featured-automations",
      icon: RocketLaunchIcon,
      isAnchor: true
    },
    status: null
  },
  // Uniswap V2 Stop Orders
  {
    id: 1,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700">
          Protect Your Tokens Automatically
        </span>
      </>
    ),
    subtitle: "Set up Uniswap stop orders to secure your positions when prices drop",
    image: "/Uniswap-stop-order.jpg",
    primaryButton: {
      text: "Create Stop Order",
      href: "/automations/stop-order",
      icon: ShieldExclamationIcon
    },
    status: null
  },
  // Uniswap V3 Fee Collection
  {
    id: 2,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-500">
          Collect Fees Without Effort
        </span>
      </>
    ),
    subtitle: "Automatically collect earned fees from your Uniswap V3 positions 24/7",
    image: "/fee-collector-9.jpg",
    primaryButton: {
      text: "Setup Fee Collector",
      href: "/automations/fee-collector",
      icon: CurrencyDollarIcon
    },
    status: "Coming Soon"
  },
  // Uniswap V3 Range Management
  {
    id: 3,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-600">
          Optimize Your Liquidity Positions
        </span>
      </>
    ),
    subtitle: "Keep your Uniswap V3 positions in optimal fee-generating ranges automatically",
    image: "/range-manager-7.jpg",
    primaryButton: {
      text: "Setup Range Manager",
      href: "/automations/range-manager",
      icon: ChartBarIcon
    },
    status: "Coming Soon"
  },
  // Aave V3 Protection
  {
    id: 4,
    title: (
      <>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Prevent Liquidations Automatically
        </span>
      </>
    ),
    subtitle: "Automatically manage your Aave health factor to avoid costly liquidations",
    image: "/aave-protection.jpeg",
    primaryButton: {
      text: "Setup Aave Protection",
      href: "/automations/aave-protection",
      icon: ShieldExclamationIcon
    },
    status: null
  },
];

// Protocol card configurations
const protocolCards = [
  {
    id: 1,
    protocol: "Uniswap",
    version: "V2",
    featureName: "On chain Stop order",
    slideIndex: 1,
    gradient: "from-red-500/20 to-red-700/20",
    borderColor: "border-red-500/30",
    textColor: "text-red-300",
    logo: "/images/hero/Uniswap-logo.jpg",
  },
  {
    id: 2,
    protocol: "Uniswap",
    version: "V3",
    featureName: "Fee Collector",
    slideIndex: 2,
    gradient: "from-blue-400/20 to-green-500/20",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-300",
    logo: "/images/hero/Uniswap-logo.jpg",
  },
  {
    id: 3,
    protocol: "Uniswap",
    version: "V3",
    featureName: "Range Manager",
    slideIndex: 3,
    gradient: "from-purple-500/20 to-blue-600/20",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-300",
    logo: "/images/hero/Uniswap-logo.jpg",
  },
  {
    id: 4,
    protocol: "Aave",
    version: "V3",
    featureName: "Liquidation protection",
    slideIndex: 4,
    gradient: "from-cyan-500/20 to-purple-500/20",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-300",
    logo: "/images/hero/Aave-logo.jpg",
  },
];

export default function Hero() {
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const handleCardClick = (cardId: number) => {
    if (activeCard === cardId) {
      setActiveCard(null);
    } else {
      setActiveCard(cardId);
    }
  };

  const getCurrentSlide = () => {
    if (activeCard) {
      const card = protocolCards.find(c => c.id === activeCard);
      return slides[card?.slideIndex || 0];
    }
    return slides[0];
  };

  const currentSlide = getCurrentSlide();
  const CurrentIcon = currentSlide.primaryButton.icon;

  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:gap-12">
          
          {/* Left Column - Dynamic Text Content */}
          <motion.div className="lg:w-1/2 lg:pr-8">
            {/* Fixed height container for text */}
            <div className="h-[200px] sm:h-[240px] md:h-[280px] relative mb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, y: 20, position: 'absolute' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full"
                >
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4">
                    {currentSlide.title}
                  </h1>
                  <p className="text-xl sm:text-2xl sm:mb-1 mb-8 text-zinc-300">
                    {currentSlide.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Fixed position buttons */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="w-full sm:w-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        as={currentSlide.primaryButton.isAnchor ? "a" : Link}
                        href={currentSlide.primaryButton.href}
                        color={currentSlide.status === "Coming Soon" ? "default" : "primary"}
                        variant="shadow"
                        size="lg"
                        isDisabled={currentSlide.status === "Coming Soon"}
                        startContent={<CurrentIcon className="h-5 w-5" />}
                        className="w-full sm:w-auto hover:bg-primary/80 rounded-md scroll-smooth"
                      >
                        {currentSlide.primaryButton.text}
                      </Button>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <Button
                  as={Link}
                  href="/deploy-reactive-contract"
                  className="w-full rounded-md sm:w-auto hover:bg-blue-950/70"
                  variant="bordered"
                  size="lg"
                  startContent={<SparklesIcon className="h-5 w-5" />}
                >
                  For Developers
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column - Interactive Protocol Grid */}
          <motion.div className="lg:w-1/2 mt-12 lg:mt-0">
            {/* Protocol Cards Grid - 2x2 */}
            <div className="grid grid-cols-2 grid-rows-2 gap-4">
              {protocolCards.map((card) => (
                <motion.div
                  key={card.id}
                  className="relative cursor-pointer group"
                  onClick={() => handleCardClick(card.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="w-full aspect-square rounded-xl relative"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ 
                      rotateY: activeCard === card.id ? 180 : 0 
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  >
                    {/* Front Face */}
                    <motion.div
                      className={`absolute inset-0 w-full h-full bg-gradient-to-br ${card.gradient} rounded-xl border ${card.borderColor} flex items-center justify-center transition-colors group-hover:border-opacity-70`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="text-center space-y-3 p-4">
                        <div className="w-32 h-24 mx-auto mb-3 relative">
                          <Image
                            src={card.protocol === "Uniswap" ? "/images/hero/Uniswap-logo.jpg" : "/images/hero/Aave-logo.jpg"}
                            alt={`${card.protocol} Logo`}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className={`${card.textColor} font-bold text-base`}>
                            {card.protocol}
                          </p>
                          <div className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70 inline-block">
                            {card.version}
                          </div>
                        </div>
                        <p className="text-sm text-white font-medium leading-tight px-2">
                          {card.featureName}
                        </p>
                      </div>
                    </motion.div>

                    {/* Back Face */}
                    <motion.div
                      className={`absolute inset-0 w-full h-full bg-gradient-to-br ${card.gradient.replace('/20', '/30')} rounded-xl border ${card.borderColor.replace('/30', '/50')} flex items-center justify-center`}
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      {currentSlide.image && activeCard === card.id ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={currentSlide.image}
                            alt={`${card.protocol} ${card.version}`}
                            fill
                            className="object-cover rounded-xl opacity-90"
                          />
                          
                          {/* Coming Soon Overlay - only shown on back face */}
                          {currentSlide.status === "Coming Soon" && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                              <div className="text-center">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full mb-3 mx-auto w-12 h-12 flex items-center justify-center">
                                  <ClockIcon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Coming Soon</h3>
                                <p className="text-zinc-300 text-xs">In development</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto mb-2 relative">
                            <Image
                              src={card.protocol === "Uniswap" ? "/images/hero/Uniswap-logo.jpg" : "/images/hero/Aave-logo.jpg"}
                              alt={`${card.protocol} Logo`}
                              width={32}
                              height={32}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <p className={`${card.textColor} font-bold text-sm`}>
                            {card.protocol} {card.version}
                          </p>
                          <p className="text-white/60 text-xs mt-1">
                            Active
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Simple status indicator */}
            <div className="text-center mt-6">
              <p className="text-sm text-zinc-500">
                {activeCard 
                  ? 'Feature selected' 
                  : 'Click cards to explore features'
                }
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}