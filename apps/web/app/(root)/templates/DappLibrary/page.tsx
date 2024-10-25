'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, Info } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

type Dapp = {
  id: number
  title: string
  description: string
  url: string
  imageUrl: string
  details?: string
}

const dapps: Dapp[] = [
  {
    id: 1,
    title: "MakerDAO",
    description: "Decentralized stablecoin and lending platform",
    url: "https://makerdao.com/en/",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "MakerDAO is a decentralized autonomous organization on the Ethereum blockchain that manages the DAI stablecoin."
  },
  {
    id: 2,
    title: "PancakeSwap",
    description: "Decentralized exchange on Binance Smart Chain",
    url: "https://pancakeswap.finance/",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "PancakeSwap is a popular decentralized exchange (DEX) on the Binance Smart Chain, known for its low fees and high liquidity."
  },
  {
    id: 3,
    title: "Axie Infinity",
    description: "NFT-based online video game",
    url: "https://axieinfinity.com/",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "Axie Infinity is a blockchain-based trading and battling game where players collect, breed, raise, battle, and trade creatures known as Axies."
  },
  {
    id: 4,
    title: "Uniswap",
    description: "Decentralized exchange protocol",
    url: "https://uniswap.org/",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "Uniswap is a popular decentralized trading protocol, known for its role in facilitating automated trading of decentralized finance (DeFi) tokens."
  },
  {
    id: 5,
    title: "OpenSea",
    description: "NFT marketplace",
    url: "https://opensea.io/",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "OpenSea is the world's first and largest NFT marketplace, where you can discover, collect, and sell extraordinary NFTs."
  },
  {
    id: 6,
    title: "Aave",
    description: "Decentralized lending platform",
    url: "https://aave.com/",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "Aave is a decentralized non-custodial liquidity protocol where users can participate as depositors or borrowers."
  },
]

export default function DappsLibraryPage() {
  const [selectedDapp, setSelectedDapp] = useState<Dapp | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">Popular dApps Library</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dapps.map((dapp) => (
            <Card key={dapp.id} className="flex flex-col hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center space-x-4 pb-4">
                <Image
                  src={dapp.imageUrl}
                  alt={`${dapp.title} logo`}
                  width={50}
                  height={50}
                  className="rounded-full"
                />
                <CardTitle className="text-xl font-bold text-gray-100">{dapp.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-300">{dapp.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-4">
                <Link href={dapp.url} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 transition-all duration-300 hover:bg-primary hover:text-white border-gray-600 text-gray-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visit</span>
                  </Button>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 transition-all duration-300 hover:bg-gray-700 text-gray-300"
                      onClick={() => setSelectedDapp(dapp)}
                    >
                      <Info className="w-4 h-4" />
                      <span>Details</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 text-gray-100">
                    <DialogHeader>
                      <DialogTitle className="text-gray-100">{selectedDapp?.title}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] w-full rounded-md border border-gray-700 p-4">
                      <p className="text-gray-300">{selectedDapp?.details}</p>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}