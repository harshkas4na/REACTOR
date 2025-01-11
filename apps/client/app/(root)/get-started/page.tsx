'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, BookOpen,BoltIcon , PlusCircle } from 'lucide-react'

const options = [
  {
    title: 'Deploy Reactive Contract',
    description: 'Create and deploy a reactive contract for your origin and destination contracts.',
    icon: Zap,
    color: 'bg-blue-500',
    route: '/deploy-reactive-contract'
  },
  {
    title: 'Use Templates',
    description: 'Explore and use pre-built templates for Smart Contracts or DApps.',
    icon: BookOpen,
    color: 'bg-green-500',
    route: '/templates'
  },
  {
    title: 'Apply DApp Automation',
    description: 'Set up automated actions and triggers for your decentralized applications.',
    icon: BoltIcon,
    color: 'bg-purple-500',
    route: '/dapp-automation'
  },
  {
    title: 'Contribute Templates',
    description: 'Share your Smart Contract or DApp templates with the community.',
    icon: PlusCircle,
    color: 'bg-orange-500',
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
        className="text-4xl font-bold text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Welcome to RSC Platform
      </motion.h1>
      <motion.p 
        className="text-xl text-center mb-12 text-muted-foreground"
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
          >
            <Card 
              className="cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick(option.route)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center mb-4`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {hoveredCard === index ? 'Click to get started' : 'Hover for more info'}
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  Select
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}