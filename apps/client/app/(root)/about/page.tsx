"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Shield, DollarSign, Gauge, Users, Lightbulb } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const features = [
  {
    icon: Zap,
    title: "No-Code Automations",
    description: "Ready-to-use DeFi automations like Stop Orders with zero coding required",
    color: "bg-indigo-500"
  },
  {
    icon: Shield,
    title: "Multi-Chain Support",
    description: "Deploy on Ethereum, Sepolia, Avalanche C-Chain, and more networks",
    color: "bg-emerald-500"
  },
  {
    icon: Lightbulb,
    title: "One-Stop Solution",
    description: "Your go-to platform for on-chain trading automations and liquidation protection.",
    color: "bg-sky-500"
  }
];

// Featured automations data
const featuredAutomations = [
  {
    id: "stop-orders",
    title: "Stop Orders",
    description: "Protect your tokens across multiple chains with zero technical knowledge",
    icon: Shield,
    color: "from-indigo-900/30 to-purple-900/30",
    content: {
      what: "Stop Orders automatically sell your tokens when prices drop below your specified threshold, protecting your investments 24/7 without requiring your intervention.",
      platforms: [
        { name: "Ethereum Mainnet (Uniswap V2)", color: "bg-emerald-500" },
        { name: "Sepolia Testnet (Uniswap V2)", color: "bg-blue-500" },
        { name: "Avalanche C-Chain (Pangolin)", color: "bg-red-500" }
      ],
      how: "Our platform uses Reactive Smart Contracts (RSCs) to monitor token prices and execute trades automatically when your conditions are met, without requiring any coding knowledge.",
      steps: [
        "Select your token pair and network",
        "Set your price threshold",
        "Deploy with one click",
        "Let the automation protect your tokens 24/7"
      ],
      link: "/automations/stop-order"
    }
  },
  {
    id: "fee-collector",
    title: "Fee Collector",
    description: "Automatically collect fees from your Uniswap V3 positions without manual intervention",
    icon: DollarSign,
    color: "from-blue-900/30 to-teal-900/30",
    status: "Coming Soon",
    content: {
      what: "Fee Collector automatically collects trading fees that your Uniswap V3 position has earned. Unlike manual collection, our system monitors your positions 24/7 and collects fees when economically beneficial, sending them directly to your wallet.",
      platforms: [
        { name: "Ethereum Mainnet (Coming Soon)", color: "bg-zinc-500" },
        { name: "Avalanche C-Chain (Coming Soon)", color: "bg-zinc-500" }
      ],
      how: "Our system uses an efficient event-based approach to collect fees at optimal times, ensuring you maximize your earnings without constant monitoring.",
      steps: [
        "Connect your wallet and select your blockchain network",
        "Enter your Uniswap V3 position token ID",
        "Approve & register your position with one click",
        "Fees are automatically collected and sent to your wallet"
      ],
      link: "#"
    }
  },
  {
    id: "range-manager",
    title: "Range Manager",
    description: "Keep your Uniswap V3 positions in optimal fee-generating ranges automatically",
    icon: Gauge,
    color: "from-purple-900/30 to-blue-900/30",
    status: "Coming Soon",
    content: {
      what: "Range Manager automatically adjusts your Uniswap V3 position's price range to ensure your liquidity remains active and earning fees. Unlike manual management, our system monitors market conditions 24/7 and optimizes your position for maximum earnings.",
      platforms: [
        { name: "Ethereum Mainnet (Coming Soon)", color: "bg-zinc-500" },
        { name: "Avalanche C-Chain (Coming Soon)", color: "bg-zinc-500" }
      ],
      how: "Our system uses a gas-efficient three-step process to adjust your position's range when prices move out of bounds, ensuring maximum fee collection without manual intervention.",
      steps: [
        "Connect your wallet and select your blockchain network",
        "Enter your Uniswap V3 position token ID",
        "Approve & register your position with one click",
        "Your position is automatically adjusted for optimal fee generation"
      ],
      link: "#"
    }
  }
];

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          About REACTOR
        </h1>
        <p className="text-xl text-zinc-300 max-w-3xl mx-auto">
          REACTOR is the one-stop shop for on-chain automation. We provide powerful, no-code tools like Stop Orders and Liquidation Protection to empower traders.
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative pointer-events-auto z-10 border-zinc-800 h-full">
              <CardHeader>
                <div className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-zinc-100" />
                </div>
                <CardTitle className="text-zinc-100">{feature.title}</CardTitle>
                <CardDescription className="text-zinc-300">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Who It's For Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-16"
      >
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative pointer-events-auto z-10 border-zinc-800">
          <CardHeader>
            <div className={`w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4`}>
              <Users className="w-6 h-6 text-zinc-100" />
            </div>
            <CardTitle className="text-zinc-100">For DeFi Traders</CardTitle>
            <CardDescription className="text-zinc-300">No technical knowledge required</CardDescription>
          </CardHeader>
          <CardContent>
            <h4 className="text-sm font-medium text-zinc-400 uppercase mb-3">Features</h4>
            <ul className="space-y-2 mb-6">
              {[
                "Pre-built automations like Stop Orders and Fee Collectors",
                "Easy-to-use interface with step-by-step guidance",
                "No coding required",
                "Works with popular platforms like Uniswap V2/V3 and Pangolin"
              ].map((capability) => (
                <li key={capability} className="text-sm text-zinc-300 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  {capability}
                </li>
              ))}
            </ul>
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Try Automations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Featured Automations Section */}
      {featuredAutomations.map((automation, index) => (
        <motion.div
          key={automation.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 + (index * 0.1) }}
          className="mb-16"
        >
          <Card className={`bg-gradient-to-br ${automation.color} relative pointer-events-auto z-10 border-zinc-800 overflow-hidden`}>
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 z-0"></div>
            <CardHeader className="relative z-10 border-b border-zinc-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-zinc-100">Featured Automation: {automation.title}</CardTitle>
                {automation.status && <span className="text-xs font-semibold text-sky-400 bg-sky-900/50 px-2 py-1 rounded-full">{automation.status}</span>}
              </div>
              <CardDescription className="text-zinc-300">
                {automation.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-zinc-100">What is {automation.title}?</h3>
                  <p className="text-zinc-300">
                    {automation.content.what}
                  </p>
                  <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700/30 space-y-2">
                    <h4 className="font-medium text-zinc-100">Available on:</h4>
                    <ul className="space-y-1">
                      {automation.content.platforms.map((platform, idx) => (
                        <li key={idx} className="text-zinc-300 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${platform.color}`}></div>
                          {platform.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-zinc-100">How It Works</h3>
                  <p className="text-zinc-300">
                    {automation.content.how}
                  </p>
                  <div className="flex flex-col space-y-3">
                    {automation.content.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <span className="text-blue-400 font-bold">{idx + 1}</span>
                        </div>
                        <p className="text-zinc-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link href={automation.content.link}>
                  <Button disabled={automation.status === 'Coming Soon'} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 disabled:opacity-50">
                    Try {automation.title}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative pointer-events-auto z-10 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Frequently Asked Questions</CardTitle>
            <CardDescription className="text-zinc-300">
              Learn more about REACTOR and how it works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is REACTOR?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  REACTOR is a platform that makes DeFi automation accessible to everyone. We offer ready-to-use
                  automations like Stop Orders, with Fee Collectors and Range Managers coming soon, that require zero technical knowledge. Our platform bridges 
                  the gap between complex blockchain technology and everyday traders.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="technical" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Do I need technical knowledge to use REACTOR?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <p>Not at all! REACTOR is designed for traders. You can start using our pre-built automations like Stop Orders, Fee Collectors, and Range Managers even if you've never written a line of code.</p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How does REACTOR work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  REACTOR uses Reactive Smart Contracts (RSCs) to enable event-driven automation across blockchain networks. We provide simple interfaces to create automations like Stop Orders and Fee Collectors that protect your tokens and maximize your earnings. Behind the scenes, we handle all the complex blockchain interactions, including deployment, monitoring, and execution, so you don't have to.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="chains" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Which blockchains does REACTOR support?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  REACTOR currently supports multiple chains including Ethereum Mainnet, Sepolia Testnet, and Avalanche C-Chain. Our Stop Order automations work with Uniswap V2 on Ethereum networks and Pangolin on Avalanche. Our Fee Collector and Range Manager automations are coming soon. We're continuously expanding our blockchain and protocol support.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="get-started" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How do I get started?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <p>Getting started with REACTOR is easy:</p>
                  <ol className="list-decimal pl-5 mt-2 space-y-1">
                    <li>Connect your wallet</li>
                    <li>Choose an automation (like Stop Orders)</li>
                    <li>Follow the simple step-by-step interface to configure your automation</li>
                    <li>Deploy with one click</li>
                  </ol>
                  <p className="mt-2">Our interface guides you through the entire process.</p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="uniswap-v3" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What are your Uniswap V3 automations?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <p>We are launching two powerful automations for Uniswap V3 liquidity providers soon:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>
                      <span className="font-medium">Fee Collector:</span> Automatically collects trading fees from your Uniswap V3 positions without manual intervention.
                    </li>
                    <li>
                      <span className="font-medium">Range Manager:</span> Automatically adjusts your Uniswap V3 position's price range to ensure your liquidity remains active and earning fees.
                    </li>
                  </ul>
                  <p className="mt-2">Both automations will require just a one-time setup and then work continuously to maximize your earnings without any further manual intervention.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}