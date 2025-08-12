"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, DollarSign, Activity, Users, Lightbulb, TrendingDown, AlertTriangle, Code, Globe, Layers, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

// Featured automations data
const featuredAutomations = [
  {
    id: "stop-orders",
    title: "Stop Orders",
    description: "Protect your tokens from market crashes across multiple chains with zero technical knowledge",
    icon: TrendingDown,
    color: "from-indigo-900/30 to-purple-900/30",
    borderColor: "border-indigo-500/30",
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
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
    id: "aave-protection",
    title: "Aave Liquidation Protection",
    description: "Automatically protect your Aave positions from liquidation with smart health factor management",
    icon: Shield,
    color: "from-emerald-900/30 to-teal-900/30",
    borderColor: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    status: "Coming Soon",
    content: {
      what: "Aave Liquidation Protection continuously monitors your health factor and automatically executes protection strategies when you approach liquidation risk. The system can deposit additional collateral or repay debt to keep your position safe.",
      platforms: [
        { name: "Ethereum Sepolia (Live)", color: "bg-blue-500" },
        { name: "Ethereum Mainnet (Coming Soon)", color: "bg-zinc-500" },
        { name: "More Networks (Coming Soon)", color: "bg-zinc-500" }
      ],
      how: "Using Aave's native oracle for price data, our system monitors health factors via CRON events and executes protection strategies automatically when thresholds are reached.",
      steps: [
        "Connect wallet and check your Aave position",
        "Set health factor thresholds and protection strategy",
        "Approve tokens and subscribe to protection",
        "System monitors and protects your position 24/7"
      ],
      link: "/about#"
    }
  },
  {
    id: "fee-collector",
    title: "Fee Collector",
    description: "Automatically collect fees from your Uniswap V3 positions without manual intervention",
    icon: DollarSign,
    color: "from-blue-900/30 to-cyan-900/30",
    borderColor: "border-blue-500/30",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
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
    icon: Activity,
    color: "from-purple-900/30 to-blue-900/30",
    borderColor: "border-purple-500/30",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
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
        <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          About REACTOR
        </h1>
        <p className="text-xl text-foreground max-w-3xl mx-auto">
          REACTOR is a pioneering platform that makes DeFi automation accessible to everyone through Reactive Smart Contracts (RSCs) and intuitive, no-code interfaces.
        </p>
      </motion.div>

      {/* Mission & Vision */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-16"
      >
        <Card className="bg-card/70 relative pointer-events-auto z-10 border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90 text-lg leading-relaxed mb-6">
              REACTOR exists to democratize DeFi automation by removing technical barriers and making sophisticated blockchain operations accessible to traders, investors, and DeFi enthusiasts regardless of their programming knowledge.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              We believe that powerful automation shouldn't be limited to developers. Whether you're protecting your portfolio from market crashes, optimizing your yield farming strategies, or safeguarding lending positions from liquidation, REACTOR provides the tools you need with interfaces that anyone can understand and use.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* What We Do */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-16 relative"
      >
        <h2 className="text-3xl font-bold text-foreground mb-8 text-center">What We Do</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/70 border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-foreground">Risk Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                Automated protection tools like Stop Orders and Aave Liquidation Protection that safeguard your investments from market volatility and liquidation risks 24/7.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <CardTitle className="text-foreground">Yield Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                Automated yield strategies including Fee Collectors and Range Managers for Uniswap V3 that maximize your earnings without constant monitoring.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-foreground">Developer Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                Advanced tools for developers to create custom Reactive Smart Contracts and build sophisticated automation solutions on top of our platform.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* How We Work */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-16 relative"
      >
        <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-2xl">How REACTOR Works</CardTitle>
            <CardDescription className="text-zinc-300">
              Understanding the technology behind our automation platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-zinc-100">Reactive Smart Contracts (RSCs)</h3>
                <p className="text-zinc-300">
                  At the core of REACTOR are Reactive Smart Contracts - a revolutionary approach to blockchain automation that enables contracts to autonomously monitor and react to on-chain events without requiring manual intervention.
                </p>
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-zinc-100 mb-2">Key Features:</h4>
                  <ul className="text-sm text-zinc-300 space-y-1">
                    <li>• Event-driven architecture with Inversion-of-Control</li>
                    <li>• Cross-chain operations and monitoring</li>
                    <li>• Autonomous execution without user intervention</li>
                    <li>• Gas-efficient and reliable automation</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-zinc-100">User-Friendly Interface</h3>
                <p className="text-zinc-300">
                  While the underlying technology is sophisticated, our interface makes automation accessible to everyone. We provide step-by-step guides, pre-built templates, and intuitive configuration options.
                </p>
                <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20">
                  <h4 className="font-medium text-zinc-100 mb-2">User Experience:</h4>
                  <ul className="text-sm text-zinc-300 space-y-1">
                    <li>• No-code automation setup</li>
                    <li>• Visual configuration interfaces</li>
                    <li>• Real-time monitoring and alerts</li>
                    <li>• Comprehensive documentation and support</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Who We Serve */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mb-16"
      >
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative pointer-events-auto z-10 border-zinc-800">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-zinc-100" />
            </div>
            <CardTitle className="text-zinc-100">Who We Serve</CardTitle>
            <CardDescription className="text-zinc-300">REACTOR is designed for the entire DeFi ecosystem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-zinc-100">DeFi Traders</h4>
                <p className="text-sm text-zinc-300">
                  Active traders who need automated risk management and don't want to monitor markets 24/7
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-zinc-100">Yield Farmers</h4>
                <p className="text-sm text-zinc-300">
                  Liquidity providers looking to optimize their positions and maximize fee collection automatically
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-zinc-100">Developers</h4>
                <p className="text-sm text-zinc-300">
                  Blockchain developers who want to build custom automation solutions using our RSC framework
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Explore Our Automations
                </Button>
              </Link>
            </div>
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
          <Card className={`bg-gradient-to-br ${automation.color} relative pointer-events-auto z-10 ${automation.borderColor} border overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 z-0"></div>
            <CardHeader className="relative z-10 border-b border-zinc-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${automation.iconBg} flex items-center justify-center`}>
                    <automation.icon className={`w-6 h-6 ${automation.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-100">Featured Automation: {automation.title}</CardTitle>
                    <CardDescription className="text-zinc-300">
                      {automation.description}
                    </CardDescription>
                  </div>
                </div>
                {automation.status && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400 bg-amber-900/50 px-2 py-1 rounded-full">
                      {automation.status}
                    </span>
                  </div>
                )}
              </div>
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
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
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
                  <Button 
                    disabled={automation.status === 'Coming Soon'} 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {automation.status === 'Coming Soon' ? `${automation.title} Coming Soon` : `Try ${automation.title}`}
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
        transition={{ duration: 0.5, delay: 0.9 }}
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
                  automations like Stop Orders and Aave Liquidation Protection, with Fee Collectors and Range Managers coming soon. Our platform bridges 
                  the gap between complex blockchain technology and everyday traders.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="technical" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Do I need technical knowledge to use REACTOR?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  Not at all! REACTOR is designed for traders and DeFi users. You can start using our pre-built automations like Stop Orders and Aave Liquidation Protection even if you've never written a line of code. Just connect your wallet and follow our step-by-step guides.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How does REACTOR work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  REACTOR uses Reactive Smart Contracts (RSCs) to enable event-driven automation across blockchain networks. We provide simple interfaces to create automations that protect your tokens and maximize your earnings. Behind the scenes, we handle all the complex blockchain interactions, including deployment, monitoring, and execution, so you don't have to.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="chains" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Which blockchains does REACTOR support?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  REACTOR currently supports multiple chains including Ethereum Mainnet, Sepolia Testnet, and Avalanche C-Chain. Our Stop Order automations work with Uniswap V2 on Ethereum networks and Pangolin on Avalanche. Aave Liquidation Protection is live on Sepolia with Mainnet support coming soon. We're continuously expanding our blockchain and protocol support.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="aave-protection" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How does Aave Liquidation Protection work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <p>Aave Liquidation Protection continuously monitors your health factor and automatically executes protection strategies when you approach liquidation risk. The system offers three strategies:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Collateral Deposit: Automatically adds more collateral to improve your health factor</li>
                    <li>Debt Repayment: Automatically repays debt to reduce your liquidation risk</li>
                    <li>Combined Protection: Uses both strategies with your preferred order</li>
                  </ul>
                  <p className="mt-2">The system uses Aave's native oracle for accurate price data and triggers protection when your health factor drops below your configured threshold.</p>
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
                    <li>Choose an automation (like Stop Orders or Aave Protection)</li>
                    <li>Follow the simple step-by-step interface to configure your automation</li>
                    <li>Deploy with one click</li>
                  </ol>
                  <p className="mt-2">Our interface guides you through the entire process with clear explanations at every step.</p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="uniswap-v3" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What are your upcoming Uniswap V3 automations?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <p>We are launching two powerful automations for Uniswap V3 liquidity providers soon:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>
                      <span className="font-medium">Fee Collector:</span> Automatically collects trading fees from your Uniswap V3 positions without manual intervention, optimizing for gas costs.
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