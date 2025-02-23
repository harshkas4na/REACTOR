"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Book, Workflow, Shield, Code, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const features = [
  {
    icon: Zap,
    title: "No-Code Solution",
    description: "Create sophisticated DeFi automations without writing a single line of code",
    color: "bg-indigo-500"
  },
  {
    icon: Shield,
    title: "Security First",
    description: "Built-in protections and validations ensure your assets remain safe",
    color: "bg-emerald-500"
  },
  {
    icon: Workflow,
    title: "Cross-Chain Capability",
    description: "Seamlessly operate across different blockchain networks",
    color: "bg-violet-500"
  }
];

const tools = [
  {
    title: "Smart Contract Automation",
    description: "Deploy and manage automated DeFi operations through our intuitive interface",
    capabilities: [
      "Template-based deployment",
      "Visual configuration",
      "Built-in safety checks",
      "Real-time monitoring"
    ]
  },
  {
    title: "DApp Automation Tools",
    description: "Create automated workflows between your favorite DeFi applications",
    capabilities: [
      "Live Data Integration",
      "Cross-Chain Bridge",
      "Cross-DApp Automation",
      "External DApp Integration"
    ]
  },
  {
    title: "Community Libraries",
    description: "Access and contribute to our growing collection of automation templates",
    capabilities: [
      "Smart Contracts Library",
      "DApp Library",
      "Implementation Examples",
      "Best Practices"
    ]
  }
];

export default function AboutPage() {
  return (
    <div className="container  mx-auto py-12 px-4">
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
          REACTOR is revolutionizing DeFi automation by making powerful blockchain functionality accessible to everyone, regardless of their technical background.
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
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative pointer-events-auto z-10 border-zinc-800">
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

      {/* Tools Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative pointer-events-auto z-10 border-zinc-800 mb-16">
          <CardHeader>
            <CardTitle className="text-zinc-100">Our Tools</CardTitle>
            <CardDescription className="text-zinc-300">
              Comprehensive suite of automation tools for DeFi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tools.map((tool, index) => (
                <div key={tool.title} className="space-y-4">
                  <h3 className="text-lg font-medium text-zinc-100">{tool.title}</h3>
                  <p className="text-sm text-zinc-300">{tool.description}</p>
                  <ul className="space-y-2">
                    {tool.capabilities.map((capability) => (
                      <li key={capability} className="text-sm text-zinc-400 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
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
                  REACTOR is a revolutionary platform that enables anyone to create and manage automated DeFi operations without coding knowledge. Built on the Reactive Network (KOPLI), it provides powerful tools for cross-chain automation and DeFi strategy implementation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How does it work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  REACTOR uses Reactive Smart Contracts (RSCs) to enable event-driven automation across blockchain networks. Users can select from pre-built templates or create custom automations through our intuitive interface, which handles all the complex blockchain interactions behind the scenes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="get-started" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How do I get started?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  Getting started with REACTOR is easy. Simply connect your wallet, choose an automation template or create a custom one, configure your parameters, and deploy. Our step-by-step interface guides you through the entire process.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}