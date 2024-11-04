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
  { id: 4, title: 'External DApp Automation', description: 'Automate functions on one of your famous Dapps', complexity: 'Advanced', icon: '🔌',link:"/external-dapp-integration" },
  { id: 5, title: 'Coming Soon', description: 'New template under development', complexity: 'N/A', icon: '🚧', comingSoon: true },
]

export default function Component() {
  // const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [complexity, setComplexity] = useState('All')


  // const toggleTheme = () => {
  //   setIsDarkMode(!isDarkMode)
  //   document.documentElement.classList.toggle('dark')
  // }

  const filteredTemplates = templates.filter(template => 
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (complexity === 'All' || template.complexity === complexity)
  )

  return (
    <div className={`min-h-screen  dark:bg-slate-900 dark:text-white bg-white text-slate-900`}>
      {/* <header className="flex justify-between items-end p-4 bg-slate-800 text-white">        
          <Button variant="ghost" className="items-end space-x-4" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </Button>
      </header> */}

      <main className="container mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">DApp Automation Templates</h1>
          <p className="text-xl text-muted-foreground">Streamline your blockchain development with our pre-built templates</p>
        </section>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="relative w-full md:w-64 mb-4 md:mb-0">
            <Input
              type="text"
              placeholder="Search templates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <Select value={complexity} onValueChange={setComplexity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by complexity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Complexities</SelectItem>
              <SelectItem value="Basic">Basic</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className={`relative overflow-hidden transition-all duration-200 dark:bg-slate-800 bg-gray-50 hover:shadow-lg`}>
              <CardHeader>
                <div className="text-4xl mb-2">{template.icon}</div>
                <CardTitle>{template.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{template.description}</p>
                <div className={`mt-2 inline-block px-2 py-1 rounded-full text-xs ${
                  template.complexity === 'Basic' ? 'bg-green-100 text-green-800' :
                  template.complexity === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  template.complexity === 'Advanced' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {template.complexity}
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/dapp-automation${template.link}`}>
                <Button className="w-full" disabled={template.comingSoon}>
                  {template.comingSoon ? 'Coming Soon' : 'Get Started'}
                </Button>
                </Link>
              </CardFooter>
              {template.comingSoon && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">Coming Soon</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>

      <footer className={`mt-12 py-6  dark:bg-slate-800 bg-gray-100`}>
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2023 DApp Automation System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}