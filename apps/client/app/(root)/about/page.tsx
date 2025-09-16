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
    color: "from-slate-900/50 to-slate-800/30",
    borderColor: "border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    content: {
      what: "Stop Orders automatically sell your tokens when prices drop below your specified threshold, protecting your investments 24/7 without requiring your intervention.",
      platforms: [
        { name: "Base Mainnet (Uniswap V2) - Live", color: "bg-blue-500" },
        { name: "Ethereum Sepolia (Uniswap V2)", color: "bg-slate-500" },
        { name: "More Networks Coming Soon", color: "bg-slate-400" }
      ],
      how: "Our platform uses Reactive Smart Contracts (RSCs) to monitor token prices and execute trades automatically when your conditions are met, without requiring any coding knowledge.",
      steps: [
        "Connect your wallet to Base network",
        "Select your token pair and set price threshold",
        "Deploy your stop order with one click",
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
    color: "from-slate-900/50 to-slate-800/30",
    borderColor: "border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    status: "Coming to Base",
    content: {
      what: "Aave Liquidation Protection continuously monitors your health factor and automatically executes protection strategies when you approach liquidation risk. The system can deposit additional collateral or repay debt to keep your position safe.",
      platforms: [
        { name: "Base Mainnet (Coming Soon)", color: "bg-slate-500" },
        { name: "Ethereum Sepolia (Live)", color: "bg-blue-500" },
        { name: "Ethereum Mainnet (Coming Soon)", color: "bg-slate-500" }
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
    color: "from-slate-900/50 to-slate-800/30",
    borderColor: "border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    status: "Coming Soon",
    content: {
      what: "Fee Collector automatically collects trading fees that your Uniswap V3 position has earned. Unlike manual collection, our system monitors your positions 24/7 and collects fees when economically beneficial, sending them directly to your wallet.",
      platforms: [
        { name: "Base Mainnet (Coming Soon)", color: "bg-slate-500" },
        { name: "Ethereum Mainnet (Coming Soon)", color: "bg-slate-500" }
      ],
      how: "Our system uses an efficient event-based approach to collect fees at optimal times, ensuring you maximize your earnings without constant monitoring.",
      steps: [
        "Connect your wallet to your preferred network",
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
    color: "from-slate-900/50 to-slate-800/30",
    borderColor: "border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    status: "Coming Soon",
    content: {
      what: "Range Manager automatically adjusts your Uniswap V3 position's price range to ensure your liquidity remains active and earning fees. Unlike manual management, our system monitors market conditions 24/7 and optimizes your position for maximum earnings.",
      platforms: [
        { name: "Base Mainnet (Coming Soon)", color: "bg-slate-500" },
        { name: "Ethereum Mainnet (Coming Soon)", color: "bg-slate-500" }
      ],
      how: "Our system uses a gas-efficient three-step process to adjust your position's range when prices move out of bounds, ensuring maximum fee collection without manual intervention.",
      steps: [
        "Connect your wallet to your preferred network",
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
        <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
          About ReacDEFI
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          ReacDEFI is a pioneering platform that makes DeFi automation accessible to everyone through Reactive Smart Contracts (RSCs) and intuitive, no-code interfaces.
        </p>
      </motion.div>

      {/* Mission & Vision */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-16"
      >
        <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              ReacDEFI exists to democratize DeFi automation by removing technical barriers and making sophisticated blockchain operations accessible to traders, investors, and DeFi enthusiasts regardless of their programming knowledge.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We believe that powerful automation shouldn't be limited to developers. Whether you're protecting your portfolio from market crashes, optimizing your yield farming strategies, or safeguarding lending positions from liquidation, ReacDEFI provides the tools you need with interfaces that anyone can understand and use.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* What We Do */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-16"
      >
        <h2 className="text-3xl font-bold text-foreground mb-8 text-center">What We Do</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
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

          <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-foreground">Yield Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">
                Automated yield strategies including Fee Collectors and Range Managers for Uniswap V3 that maximize your earnings without constant monitoring.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-blue-400" />
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
        className="mb-16"
      >
        <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-2xl">How ReacDEFI Works</CardTitle>
            <CardDescription className="text-muted-foreground">
              Understanding the technology behind our automation platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Reactive Smart Contracts (RSCs)</h3>
                <p className="text-muted-foreground">
                  At the core of ReacDEFI are Reactive Smart Contracts - a revolutionary approach to blockchain automation that enables contracts to autonomously monitor and react to on-chain events without requiring manual intervention.
                </p>
                <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-foreground mb-2">Key Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Event-driven architecture with Inversion-of-Control</li>
                    <li>• Cross-chain operations and monitoring</li>
                    <li>• Autonomous execution without user intervention</li>
                    <li>• Gas-efficient and reliable automation</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">User-Friendly Interface</h3>
                <p className="text-muted-foreground">
                  While the underlying technology is sophisticated, our interface makes automation accessible to everyone. We provide step-by-step guides, pre-built templates, and intuitive configuration options.
                </p>
                <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-foreground mb-2">User Experience:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
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

      {/* Now Live on Base */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mb-16"
      >
        <Card className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border-blue-500/30">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <CardTitle className="text-foreground text-xl">Now Live on Base Mainnet</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              ReacDEFI has officially launched on Base Mainnet, bringing secure and efficient DeFi automation to the Base ecosystem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">Why Base?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Low transaction costs for frequent automation</li>
                  <li>• Fast block times for responsive automation</li>
                  <li>• Strong DeFi ecosystem integration</li>
                  <li>• Enhanced security and reliability</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Available Now:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Stop Orders (Uniswap V2 integration)</li>
                  <li>• Cross-chain monitoring capabilities</li>
                  <li>• Professional-grade automation tools</li>
                  <li>• 24/7 autonomous protection</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  Start Using ReacDEFI on Base
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Who We Serve */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-16"
      >
        <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <CardTitle className="text-foreground">Who We Serve</CardTitle>
            <CardDescription className="text-muted-foreground">ReacDEFI is designed for the entire DeFi ecosystem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">DeFi Traders</h4>
                <p className="text-sm text-muted-foreground">
                  Active traders who need automated risk management and don't want to monitor markets 24/7
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Yield Farmers</h4>
                <p className="text-sm text-muted-foreground">
                  Liquidity providers looking to optimize their positions and maximize fee collection automatically
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Developers</h4>
                <p className="text-sm text-muted-foreground">
                  Blockchain developers who want to build custom automation solutions using our RSC framework
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
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
          transition={{ duration: 0.5, delay: 0.6 + (index * 0.1) }}
          className="mb-16"
        >
          <Card className={`bg-gradient-to-br ${automation.color} ${automation.borderColor} border backdrop-blur-sm`}>
            <CardHeader className="border-b border-slate-700/50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${automation.iconBg} flex items-center justify-center`}>
                    <automation.icon className={`w-6 h-6 ${automation.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Featured Automation: {automation.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {automation.description}
                    </CardDescription>
                  </div>
                </div>
                {automation.status && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-500/20">
                      {automation.status}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">What is {automation.title}?</h3>
                  <p className="text-muted-foreground">
                    {automation.content.what}
                  </p>
                  <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20 space-y-2">
                    <h4 className="font-medium text-foreground">Available on:</h4>
                    <ul className="space-y-1">
                      {automation.content.platforms.map((platform, idx) => (
                        <li key={idx} className="text-muted-foreground flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${platform.color}`}></div>
                          {platform.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">How It Works</h3>
                  <p className="text-muted-foreground">
                    {automation.content.how}
                  </p>
                  <div className="flex flex-col space-y-3">
                    {automation.content.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                          <span className="text-blue-400 font-bold text-sm">{idx + 1}</span>
                        </div>
                        <p className="text-muted-foreground text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link href={automation.content.link}>
                  <Button 
                    disabled={automation.status === 'Coming Soon' || automation.status === 'Coming to Base'} 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {automation.status ? `${automation.title} ${automation.status}` : `Try ${automation.title}`}
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
        transition={{ duration: 0.5, delay: 1.0 }}
      >
        <Card className="bg-slate-900/30 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Frequently Asked Questions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Learn more about ReacDEFI and how it works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  What is ReacDEFI?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  ReacDEFI is a platform that makes DeFi automation accessible to everyone. We offer ready-to-use
                  automations like Stop Orders and Aave Liquidation Protection, with Fee Collectors and Range Managers coming soon. Our platform bridges 
                  the gap between complex blockchain technology and everyday traders.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="technical" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  Do I need technical knowledge to use ReacDEFI?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Not at all! ReacDEFI is designed for traders and DeFi users. You can start using our pre-built automations like Stop Orders and Aave Liquidation Protection even if you've never written a line of code. Just connect your wallet and follow our step-by-step guides.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="how-it-works" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  How does ReacDEFI work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  ReacDEFI uses Reactive Smart Contracts (RSCs) to enable event-driven automation across blockchain networks. We provide simple interfaces to create automations that protect your tokens and maximize your earnings. Behind the scenes, we handle all the complex blockchain interactions, including deployment, monitoring, and execution, so you don't have to.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="chains" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  Which blockchains does ReacDEFI support?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  ReacDEFI is now live on Base Mainnet with Stop Order automations working with Uniswap V2. We also support Ethereum Sepolia for testing purposes. Aave Liquidation Protection is currently available on Sepolia with Base Mainnet support coming soon. We're continuously expanding our blockchain and protocol support based on community needs.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="base-mainnet" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  Why did you choose Base Mainnet?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>We launched on Base Mainnet because it offers the perfect combination of features for DeFi automation:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Low transaction costs make frequent automation economical</li>
                    <li>Fast block times ensure responsive automation triggers</li>
                    <li>Strong security inherited from Ethereum L1</li>
                    <li>Growing DeFi ecosystem with excellent protocol integrations</li>
                    <li>Developer-friendly environment for building advanced automations</li>
                  </ul>
                  <p className="mt-2">This allows us to provide reliable, cost-effective automation for all users.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="aave-protection" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  How does Aave Liquidation Protection work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>Aave Liquidation Protection continuously monitors your health factor and automatically executes protection strategies when you approach liquidation risk. The system offers three strategies:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Collateral Deposit: Automatically adds more collateral to improve your health factor</li>
                    <li>Debt Repayment: Automatically repays debt to reduce your liquidation risk</li>
                    <li>Combined Protection: Uses both strategies with your preferred order</li>
                  </ul>
                  <p className="mt-2">The system uses Aave's native oracle for accurate price data and triggers protection when your health factor drops below your configured threshold.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="get-started" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  How do I get started on Base Mainnet?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>Getting started with ReacDEFI on Base is easy:</p>
                  <ol className="list-decimal pl-5 mt-2 space-y-1">
                    <li>Connect your wallet and switch to Base network</li>
                    <li>Choose an automation (Stop Orders are live now)</li>
                    <li>Follow the simple step-by-step interface to configure your automation</li>
                    <li>Deploy with one click and let it protect your tokens 24/7</li>
                  </ol>
                  <p className="mt-2">Our interface guides you through the entire process with clear explanations at every step. You'll need some ETH on Base for gas fees.</p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="uniswap-v3" className="border-slate-700/50">
                <AccordionTrigger className="text-foreground hover:text-blue-400">
                  What are your upcoming Uniswap V3 automations?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>We are launching two powerful automations for Uniswap V3 liquidity providers:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>
                      <span className="font-medium">Fee Collector:</span> Automatically collects trading fees from your Uniswap V3 positions without manual intervention, optimizing for gas costs.
                    </li>
                    <li>
                      <span className="font-medium">Range Manager:</span> Automatically adjusts your Uniswap V3 position's price range to ensure your liquidity remains active and earning fees.
                    </li>
                  </ul>
                  <p className="mt-2">Both automations will require just a one-time setup and then work continuously to maximize your earnings without any further manual intervention. These will be available on Base Mainnet first.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}