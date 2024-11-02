'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ExternalLink, Info, Star } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

const CATEGORIES = ['All', 'Finance', 'Gaming', 'Social', 'Productivity', 'Marketplace', 'Governance']

type Dapp = {
  id: number
  name: string
  description: string
  category: string
  users: number
  rating: number
  url: string
  imageUrl: string
  details: string
}

const SAMPLE_DAPPS: Dapp[] = [
  {
    id: 1,
    name: 'DeFi Swap',
    description: "Decentralized exchange for swapping tokens",
    category: 'Finance',
    users: 50000,
    rating: 4.8,
    url: "https://defiswap.example.com",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "DeFi Swap is a decentralized exchange that allows users to swap various tokens with low fees and high liquidity. It uses an automated market maker (AMM) model to facilitate trades."
  },
  {
    id: 2,
    name: 'CryptoKitties',
    description: "Collect and breed digital cats",
    category: 'Gaming',
    users: 100000,
    rating: 4.7,
    url: "https://www.cryptokitties.co",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "CryptoKitties is a blockchain game on Ethereum that allows players to purchase, collect, breed and sell virtual cats. It's one of the earliest examples of non-fungible tokens (NFTs) and blockchain gaming."
  },
  {
    id: 3,
    name: 'Decentraland',
    description: "Virtual reality platform powered by Ethereum",
    category: 'Social',
    users: 75000,
    rating: 4.6,
    url: "https://decentraland.org",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "Decentraland is a decentralized virtual reality platform powered by the Ethereum blockchain. Users can create, experience, and monetize content and applications in this virtual world."
  },
  {
    id: 4,
    name: 'Gitcoin',
    description: "Grow open source software with incentivization tools",
    category: 'Productivity',
    users: 30000,
    rating: 4.5,
    url: "https://gitcoin.co",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "Gitcoin is a platform for developers to get paid for working on open-source software. It provides tools for bounties, grants, and other incentives to grow open source projects."
  },
  {
    id: 5,
    name: 'OpenSea',
    description: "Marketplace for NFTs",
    category: 'Marketplace',
    users: 200000,
    rating: 4.9,
    url: "https://opensea.io",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "OpenSea is the world's first and largest NFT marketplace. Users can discover, collect, and sell extraordinary NFTs on this platform."
  },
  {
    id: 6,
    name: 'Snapshot',
    description: "Decentralized voting system",
    category: 'Governance',
    users: 25000,
    rating: 4.4,
    url: "https://snapshot.org",
    imageUrl: "/placeholder.svg?height=100&width=100",
    details: "Snapshot is a decentralized voting system that allows DAOs and DeFi projects to make decisions in a gasless, off-chain manner. It's widely used for governance proposals in the DeFi ecosystem."
  },
]

export default function DAppLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDapp, setSelectedDapp] = useState<Dapp | null>(null)

  const filteredDApps = SAMPLE_DAPPS.filter(dapp => 
    dapp.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'All' || dapp.category === selectedCategory)
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">DApp Library</h1>
        
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
          <div className="relative flex-grow w-full md:w-auto">
            <Input
              type="text"
              placeholder="Search DApps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 text-gray-100 border-gray-700"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px] bg-gray-800 text-gray-100 border-gray-700">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 text-gray-100 border-gray-700">
              {CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="mb-4 bg-gray-800">
            <TabsTrigger value="grid" className="data-[state=active]:bg-gray-700">Grid View</TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-gray-700">List View</TabsTrigger>
          </TabsList>
          <TabsContent value="grid">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDApps.map((dapp) => (
                <Card key={dapp.id} className="flex flex-col hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-gray-800 border-gray-700">
                  <CardHeader className="flex flex-row items-center space-x-4 pb-4">
                    <Image
                      src={dapp.imageUrl}
                      alt={`${dapp.name} logo`}
                      width={50}
                      height={50}
                      className="rounded-full"
                    />
                    <CardTitle className="text-xl font-bold text-gray-100">{dapp.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-gray-300 mb-2">{dapp.description}</p>
                    <Badge className="bg-gray-700 text-gray-300">{dapp.category}</Badge>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-gray-400">Users: {dapp.users.toLocaleString()}</span>
                      <div className="flex items-center">
                        <Star className="text-yellow-400 fill-current" size={16} />
                        <span className="ml-1 text-gray-300">{dapp.rating}/5</span>
                      </div>
                    </div>
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
                          <DialogTitle className="text-gray-100">{selectedDapp?.name}</DialogTitle>
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
          </TabsContent>
          <TabsContent value="list">
            <div className="space-y-4">
              {filteredDApps.map((dapp) => (
                <Card key={dapp.id} className="bg-gray-800 border-gray-700 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <Image
                          src={dapp.imageUrl}
                          alt={`${dapp.name} logo`}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <CardTitle className="text-xl font-bold text-gray-100">{dapp.name}</CardTitle>
                      </div>
                      <Badge className="bg-gray-700 text-gray-300">{dapp.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-2">{dapp.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Users: {dapp.users.toLocaleString()}</span>
                      <div className="flex items-center">
                        <Star className="text-yellow-400 fill-current" size={16} />
                        <span className="ml-1 text-gray-300">{dapp.rating}/5</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
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
                          <DialogTitle className="text-gray-100">{selectedDapp?.name}</DialogTitle>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}