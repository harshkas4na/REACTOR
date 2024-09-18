'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"

export function TemplatesPage() {
  const [hoverCard1, setHoverCard1] = useState(false)
  const [hoverCard2, setHoverCard2] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-900">Our Templates</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Template Library Card */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            onHoverStart={() => setHoverCard1(true)}
            onHoverEnd={() => setHoverCard1(false)}
          >
            <Card className="h-full flex flex-col">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="Template Library"
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 ease-in-out"
                  style={{
                    transform: hoverCard1 ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Template Library</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="mb-4">
                  Provide a library of pre-built RSC templates for common use cases. Users could choose a template, customize it with parameters like wallet addresses, token types, or conditions, and deploy without needing to modify the underlying code.
                </p>
                <p className="font-semibold">Use Cases Examples:</p>
                <ul className="list-disc list-inside mb-4">
                  <li>Multi-signature wallets</li>
                  <li>Subscription services</li>
                  <li>Escrow services</li>
                </ul>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Link href="/all-templates">
                  <Button size="sm" className="bg-primary text-white hover:bg-primary-dark transition-colors duration-300">
                    <Link href={"/Templates/SmartContracts"}>
                      See All Templates
                    </Link>
                  </Button>
                </Link>
                <Link href="/contribute">
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white transition-colors duration-300">
                    Contribute
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Templates for Common dApps Card */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            onHoverStart={() => setHoverCard2(true)}
            onHoverEnd={() => setHoverCard2(false)}
          >
            <Card className="h-full flex flex-col">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="Templates for Common dApps"
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 ease-in-out"
                  style={{
                    transform: hoverCard2 ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Templates for Common dApps</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="mb-4">
                  Offer templates that integrate with common decentralized applications (e.g., Uniswap, Compound). Users can input parameters to automate actions on these dApps without modifying their code.
                </p>
                <p className="font-semibold">Features:</p>
                <ul className="list-disc list-inside mb-4">
                  <li>Pre-built dApp Integrations</li>
                  <li>Trigger Automation for Specific Use Cases</li>
                </ul>
                <p>
                  Automate RSCs for actions like swapping tokens on Uniswap after a certain threshold or automating yield farming operations based on specific market conditions.
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Link href="/all-templates">
                  <Button size="sm" className="bg-primary text-white hover:bg-primary-dark transition-colors duration-300">
                    <Link href={"/Templates/DappLibrary"}>
                      See All Templates
                    </Link>
                  </Button>
                </Link>
                <Link href="/contribute">
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white transition-colors duration-300">
                    Contribute
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}