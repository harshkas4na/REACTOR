"use client";
import { useState } from "react";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  SparklesIcon,
  ShieldExclamationIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import React from "react";

// AUTOMATION CARDS (Only available ones)
const automationCards = [
  {
    id: 1,
    protocol: "Uniswap",
    version: "V2",
    featureName: "Stop Order",
    description: "Protect your tokens automatically with Uniswap stop orders to secure positions when prices drop",
    href: "/automations/stop-order",
    icon: ShieldExclamationIcon,
    gradient: "from-red-500/20 to-red-700/20",
    borderColor: "border-red-500/30",
    textColor: "text-red-300",
    logo: "/images/hero/Uniswap-logo.jpg",
  },
  {
    id: 2,
    protocol: "Aave",
    version: "V3",
    featureName: "Liquidation Protection",
    description: "Automatically manage your Aave health factor to avoid costly liquidations",
    href: "/automations/aave-protection",
    icon: ShieldExclamationIcon,
    gradient: "from-cyan-500/20 to-purple-500/20",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-300",
    logo: "/images/hero/Aave-logo.jpg",
  },
];

export default function Hero() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <section className="relative py-12 sm:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">
          
          {/* LEFT COLUMN */}
          <div className="lg:w-1/2 lg:pr-8 mb-10 lg:mb-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Automate DeFi Without Code
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-zinc-300 mb-6">
              Deploy powerful DeFi automations in minutes with ready-to-use templates
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                as="a"
                href="#featured-automations"
                color="primary"
                variant="shadow"
                size="lg"
                startContent={<RocketLaunchIcon className="h-5 w-5" />}
                className="w-full sm:w-auto rounded-md"
              >
                Use Automations
              </Button>
              <Button
                as={Link}
                href="/deploy-reactive-contract"
                className="w-full sm:w-auto rounded-md"
                variant="bordered"
                size="lg"
                startContent={<SparklesIcon className="h-5 w-5" />}
              >
                For Developers
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN - DESKTOP CIRCULAR CARDS */}
          <div className="hidden lg:flex lg:w-1/2 lg:justify-center lg:space-x-12">
            {automationCards.map((card) => {
              const CardIcon = card.icon;
              const isHovered = hoveredCard === card.id;
              
              return (
                <Link key={card.id} href={card.href}>
                  <motion.div
                    className="relative"
                    onMouseEnter={() => setHoveredCard(card.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className={`w-64 h-64 rounded-full bg-gradient-to-br ${card.gradient} border ${card.borderColor} flex flex-col items-center justify-center p-8 cursor-pointer relative overflow-hidden`}
                      animate={{
                        boxShadow: isHovered ? "0 25px 50px rgba(0,0,0,0.4)" : "0 15px 30px rgba(0,0,0,0.2)",
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Card Content */}
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 relative">
                          <Image
                            src={card.logo}
                            alt={`${card.protocol} Logo`}
                            fill
                            className="object-contain rounded-full"
                          />
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">
                          {card.featureName}
                        </h3>
                        <p className={`${card.textColor} font-semibold text-sm mb-4`}>
                          {card.protocol} {card.version}
                        </p>

                        <div className="bg-white/10 p-3 rounded-full mx-auto w-12 h-12 flex items-center justify-center mb-3">
                          <CardIcon className="h-6 w-6 text-white" />
                        </div>

                        {/* Hover additional info */}
                        {/* <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ 
                            opacity: isHovered ? 1 : 0,
                            height: isHovered ? "auto" : 0
                          }}
                          transition={{ duration: 0.3 }}
                          className="text-center"
                        >
                          <div className="text-xs text-white/70 mb-1">
                            Automate DeFi Operations
                          </div>
                          <div className="text-xs text-white/60">
                            Click to setup →
                          </div>
                        </motion.div> */}
                      </div>
                    </motion.div>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* MOBILE/TABLET VERTICAL CARDS */}
          <div className="lg:hidden space-y-6">
            {automationCards.map((card) => {
              const CardIcon = card.icon;
              
              return (
                <Link key={card.id} href={card.href}>
                  <motion.div
                    className={`bg-gradient-to-r ${card.gradient} rounded-xl border ${card.borderColor} my-8 p-6 cursor-pointer`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 relative flex-shrink-0">
                        <Image
                          src={card.logo}
                          alt={`${card.protocol} Logo`}
                          fill
                          className="object-contain rounded-full"
                        />
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-bold text-white">
                            {card.featureName}
                          </h3>
                          <CardIcon className="h-5 w-5 text-white/70" />
                        </div>
                        <p className={`${card.textColor} font-semibold text-sm mb-2`}>
                          {card.protocol} {card.version}
                        </p>
                        <p className="text-sm text-white/80">
                          {card.description}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <span className="text-white/60 text-sm">→</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}