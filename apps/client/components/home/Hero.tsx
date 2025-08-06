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

// SLIDES
const slides = [
  {
    id: 0,
    title: (
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
        Automate DeFi Without Code
      </span>
    ),
    subtitle:
      "Deploy powerful DeFi automations in minutes with ready-to-use templates",
    primaryButton: {
      text: "Use Automations",
      href: "#featured-automations",
      icon: RocketLaunchIcon,
      isAnchor: true,
    },
    status: null,
  },
  {
    id: 1,
    title: (
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700">
        Protect Your Tokens Automatically
      </span>
    ),
    subtitle:
      "Set up Uniswap stop orders to secure your positions when prices drop",
    image: "/Uniswap-stop-order.jpg",
    primaryButton: {
      text: "Create Stop Order",
      href: "/automations/stop-order",
      icon: ShieldExclamationIcon,
    },
    status: null,
  },
  {
    id: 2,
    title: (
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-500">
        Collect Fees Without Effort
      </span>
    ),
    subtitle:
      "Automatically collect earned fees from your Uniswap V3 positions 24/7",
    image: "/fee-collector-9.jpg",
    primaryButton: {
      text: "Setup Fee Collector",
      href: "/automations/fee-collector",
      icon: CurrencyDollarIcon,
    },
    status: "Coming Soon",
  },
  {
    id: 3,
    title: (
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-600">
        Optimize Your Liquidity Positions
      </span>
    ),
    subtitle:
      "Keep your Uniswap V3 positions in optimal fee-generating ranges automatically",
    image: "/range-manager-7.jpg",
    primaryButton: {
      text: "Setup Range Manager",
      href: "/automations/range-manager",
      icon: ChartBarIcon,
    },
    status: "Coming Soon",
  },
  {
    id: 4,
    title: (
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
        Prevent Liquidations Automatically
      </span>
    ),
    subtitle:
      "Automatically manage your Aave health factor to avoid costly liquidations",
    image: "/aave-protection.jpeg",
    primaryButton: {
      text: "Setup Aave Protection",
      href: "/automations/aave-protection",
      icon: ShieldExclamationIcon,
    },
    status: null,
  },
];

// PROTOCOL CARDS (Desktop)
const protocolCards = [
  {
    id: 1,
    protocol: "Uniswap",
    version: "V2",
    featureName: "Stop Order",
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
    featureName: "Liquidation Protection",
    slideIndex: 4,
    gradient: "from-cyan-500/20 to-purple-500/20",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-300",
    logo: "/images/hero/Aave-logo.jpg",
  },
];

// PROTOCOL TABS (Mobile)
const protocolTabs = protocolCards.map((c) => ({
  id: c.id,
  label: `${c.protocol} ${c.version} – ${c.featureName}`,
  slideIndex: c.slideIndex,
}));

export default function Hero() {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const getCurrentSlide = () => {
    if (activeCard) {
      const card = protocolCards.find((c) => c.id === activeCard);
      return slides[card?.slideIndex || 0];
    }
    if (activeTab) {
      const tab = protocolTabs.find((t) => t.id === activeTab);
      return slides[tab?.slideIndex || 0];
    }
    return slides[0];
  };

  const currentSlide = getCurrentSlide();
  const CurrentIcon = currentSlide.primaryButton.icon;

  return (
    <section className="relative py-12 sm:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* MOBILE TABS */}
        <div className="lg:hidden mb-6 overflow-x-auto">
          <div className="flex space-x-3 min-w-max">
            {protocolTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-800"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">
          
          {/* LEFT COLUMN */}
          <motion.div className="lg:w-1/2 lg:pr-8 mb-10 lg:mb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
                  {currentSlide.title}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-zinc-300 mb-6">
                  {currentSlide.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                as={currentSlide.primaryButton.isAnchor ? "a" : Link}
                href={currentSlide.primaryButton.href}
                color={
                  currentSlide.status === "Coming Soon" ? "default" : "primary"
                }
                variant="shadow"
                size="lg"
                isDisabled={currentSlide.status === "Coming Soon"}
                startContent={<CurrentIcon className="h-5 w-5" />}
                className="w-full sm:w-auto rounded-md"
              >
                {currentSlide.primaryButton.text}
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
          </motion.div>

          {/* RIGHT COLUMN - DESKTOP CARDS */}
          <motion.div className="hidden lg:block lg:w-1/2">
            <div className="grid grid-cols-2 gap-4">
              {protocolCards.map((card) => (
                <motion.div
                  key={card.id}
                  className="relative cursor-pointer group"
                  onClick={() =>
                    setActiveCard(activeCard === card.id ? null : card.id)
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="w-full aspect-square rounded-xl relative"
                    style={{ transformStyle: "preserve-3d" }}
                    animate={{
                      rotateY: activeCard === card.id ? 180 : 0,
                    }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                  >
                    {/* FRONT */}
                    <motion.div
                      className={`absolute inset-0 w-full h-full bg-gradient-to-br ${card.gradient} rounded-xl border ${card.borderColor} flex items-center justify-center`}
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div className="text-center p-3">
                        <div className="w-20 h-20 mx-auto mb-3 relative">
                          <Image
                            src={card.logo}
                            alt={`${card.protocol} Logo`}
                            fill
                            className="object-contain rounded-full"
                          />
                        </div>
                        <p className={`${card.textColor} font-bold`}>
                          {card.protocol}
                        </p>
                        <div className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70 inline-block mt-1">
                          {card.version}
                        </div>
                        <p className="text-sm text-white mt-2">
                          {card.featureName}
                        </p>
                      </div>
                    </motion.div>

                    {/* BACK */}
                    <motion.div
                      className={`absolute inset-0 w-full h-full bg-gradient-to-br ${card.gradient.replace(
                        "/20",
                        "/30"
                      )} rounded-xl border ${card.borderColor.replace(
                        "/30",
                        "/50"
                      )} flex items-center justify-center`}
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      {currentSlide.image && activeCard === card.id ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={currentSlide.image}
                            alt={`${card.protocol} ${card.version}`}
                            fill
                            className="object-cover rounded-xl"
                          />
                          {currentSlide.status === "Coming Soon" && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                              <div className="text-center">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full mb-3 mx-auto w-12 h-12 flex items-center justify-center">
                                  <ClockIcon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                  Coming Soon
                                </h3>
                                <p className="text-zinc-300 text-xs">
                                  In development
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-white/70">Active</p>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
