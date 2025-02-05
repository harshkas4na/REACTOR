"use client";

import { useState } from 'react'
import { Search, Filter, Wallet, ChevronDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from 'next/link';

const templates = [
  { id: 1, title: 'Live Data Integration', description: 'Real-time data flow from famous DApps on any chain', complexity: 'Intermediate', icon: '📊',link:"/live-data-integration" },
  { id: 2, title: 'Cross-DApp Automation', description: 'Automate actions on your DApps on basis of other DApps reactions', complexity: 'Intermediate', icon: '🔗',link:"/cross-dapp-automation" },
  { id: 3, title: 'Cross-Chain Bridge', description: 'Seamless data transfer across different blockchains DApps', complexity: 'Easy', icon: '🌉',link:"/cross-chain-bridge" },
  { id: 4, title: 'External DApp Automation', description: 'Automate functions on one of your famous Dapps', complexity: 'Advanced', icon: '🔌',link:"/external-dapp-integration",comingSoon:true },
  
]

export default function Component() {
  const [searchTerm, setSearchTerm] = useState('')
  const [complexity, setComplexity] = useState('All')

  const filteredTemplates = templates.filter(template => 
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (complexity === 'All' || template.complexity === complexity)
  )

  return (
    <div className="min-h-screen ">
      <main className="container mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-zinc-100">
            DApp Automation Templates
          </h1>
          <p className="text-xl text-zinc-400">
            Streamline your blockchain development with our pre-built templates
          </p>
        </section>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full md:w-64">
            <Input
              type="text"
              placeholder="Search templates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
          </div>
          <Select value={complexity}  onValueChange={setComplexity}>
            <SelectTrigger className="w-[180px] bg-zinc-800/50 border-zinc-700 text-zinc-200">
              <SelectValue placeholder="Filter by complexity" />
            </SelectTrigger>
            <SelectContent className="bg-black border-zinc-700">
              <SelectItem value="All" className="text-zinc-200 z-10 focus:bg-blue-600/20">
                All Complexities
              </SelectItem>
              <SelectItem value="Easy" className="text-zinc-200 focus:bg-blue-600/20">
                Easy
              </SelectItem>
              <SelectItem value="Intermediate" className="text-zinc-200 focus:bg-blue-600/20">
                Intermediate
              </SelectItem>
              <SelectItem value="Advanced" className="text-zinc-200 focus:bg-blue-600/20">
                Advanced
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className="relative flex flex-col overflow-hidden transition-all duration-200 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 hover:shadow-lg hover:shadow-blue-900/20"
          >
            <CardHeader className="flex-none">
              <div className="text-4xl mb-2">{template.icon}</div>
              <CardTitle className="text-zinc-100">
                {template.title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-grow">
              <p className="text-zinc-400 mb-3">
                {template.description}
              </p>
              <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                template.complexity === 'Basic' ? 'bg-green-900/50 text-green-300 border border-green-800' :
                template.complexity === 'Intermediate' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800' :
                template.complexity === 'Advanced' ? 'bg-red-900/50 text-red-300 border border-red-800' :
                'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}>
                {template.complexity}
              </div>
            </CardContent>
            
            <CardFooter className="flex-none pt-4">
              <Link href={`/dapp-automation${template.link}`} className="w-full">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                  disabled={template.comingSoon}
                >
                  {template.comingSoon ? 'Coming Soon' : 'Get Started'}
                </Button>
              </Link>
            </CardFooter>
            
            {template.comingSoon && (
              <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center">
                <span className="text-zinc-200 text-lg font-bold">Coming Soon</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      </main>

     
    </div>
  )
}