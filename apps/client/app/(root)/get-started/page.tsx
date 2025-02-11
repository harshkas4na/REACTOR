"use client";
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, BookOpen, BoltIcon, PlusCircle } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const options = [
  {
    title: 'Deploy Reactive Contract',
    description: 'Create and deploy a reactive contract for your origin and destination contracts.',
    icon: Zap,
    color: 'bg-indigo-500',
    route: '/deploy-reactive-contract'
  },
  {
    title: 'Use Templates',
    description: 'Explore and use pre-built templates for Smart Contracts or DApps.',
    icon: BookOpen,
    color: 'bg-emerald-500',
    route: '/templates'
  },
  {
    title: 'Apply DApp Automation',
    description: 'Set up automated actions and triggers for your decentralized applications.',
    icon: BoltIcon,
    color: 'bg-violet-500',
    route: '/dapp-automation'
  },
  {
    title: 'Contribute Templates',
    description: 'Share your Smart Contract or DApp templates with the community.',
    icon: PlusCircle,
    color: 'bg-amber-500',
    route: '/templates'
  }
]

export default function GetStartedPage() {
  const router = useRouter()
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const handleCardClick = (route: string) => {
    router.push(route)
  }

  return (
    <div className="container mx-auto py-12">
      <motion.h1 
        className="text-4xl font-bold text-center mb-8 text-zinc-100"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Welcome to REACTOR
      </motion.h1>
      <motion.p 
        className="text-xl text-center mb-12 text-zinc-300 font-medium"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        What would you like to do today?
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {options.map((option, index) => (
          <motion.div
            key={option.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="h-full"
          >
            <Card 
              className="cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 bg-gradient-to-br from-blue-900/90 to-purple-900/90 border-zinc-800 h-full flex flex-col"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick(option.route)}
            >
              <CardHeader className="flex-none">
                <div className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center mb-4`}>
                  <option.icon className="w-6 h-6 text-zinc-100" />
                </div>
                <CardTitle className="text-zinc-100">{option.title}</CardTitle>
                <CardDescription className="text-zinc-300 h-12 line-clamp-2 font-medium leading-relaxed">{option.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-zinc-400 font-medium">
                  {hoveredCard === index ? 'Click to get started' : 'Hover for more info'}
                </p>
              </CardContent>
              <CardFooter className="flex-none">
                <Button variant="default" className="w-full">
                  Select
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
      {/* Add new educational section at the bottom */}
      <motion.div 
        className="mt-20 max-w-4xl relative pointer-events-auto z-10 mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Understanding Reactive Smart Contracts</CardTitle>
            <CardDescription className="text-zinc-300">
              Learn about RSCs and how they can enhance your blockchain development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-are-rscs" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What are Reactive Smart Contracts?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Reactive Smart Contracts (RSCs) are a new type of smart contract that can autonomously monitor and react to blockchain events. They introduce event-driven capabilities to blockchain development, enabling automated interactions without direct user intervention.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Key Benefits:</h4>
                      <ul className="text-sm space-y-2">
                        <li>• Automated event monitoring across chains</li>
                        <li>• Self-executing functions based on conditions</li>
                        <li>• Optimized gas consumption</li>
                        <li>• Simplified cross-chain operations</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-they-work" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How Do RSCs Work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      RSCs operate through a specialized virtual machine that handles event monitoring and execution. The system consists of event listeners, an execution engine, and state management components.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Event Monitoring</h4>
                        <p className="text-sm">
                          Continuously watches for specific blockchain events and triggers defined actions
                        </p>
                      </div>
                      <div className="bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Execution</h4>
                        <p className="text-sm">
                          Automatically processes events and executes corresponding functions
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="use-cases" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Common Use Cases
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">DeFi Automation</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Automated trading strategies</li>
                          <li>• Liquidity management</li>
                          <li>• Yield optimization</li>
                        </ul>
                      </div>
                      <div className="bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Gaming & NFTs</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Cross-chain asset transfers</li>
                          <li>• Automated game mechanics</li>
                          <li>• NFT-triggered events</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="getting-started" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Getting Started with RSCs
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Ready to start building with RSCs? Check out the comprehensive documentation and guides on the Reactive Network.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Next Steps:</h4>
                      <p className="text-sm mb-4">
                        Visit the{' '}
                        <a 
                          href="https://dev.reactive.network/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Reactive Network Documentation
                        </a>
                        {' '}for:
                      </p>
                      <ul className="text-sm space-y-2">
                        <li>• Detailed technical guides</li>
                        <li>• Code examples and templates</li>
                        <li>• Best practices and patterns</li>
                        <li>• API references and tutorials</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}