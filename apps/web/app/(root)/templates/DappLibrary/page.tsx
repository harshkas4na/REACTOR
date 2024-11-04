"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronDown, Grid, List, Search } from 'lucide-react'

// Extended mock data for templates
const allTemplates = [
  {
    id: 1,
    title: "Uniswap V3 Liquidity Provision",
    description: "Automate liquidity provision on Uniswap V3 with dynamic fee tier selection.",
    type: "liveData",
    complexity: "Medium",
    successRate: "98%",
    gasCost: "0.005 ETH",
    tags: ["DeFi", "Liquidity", "Uniswap"]
  },
  {
    id: 2,
    title: "Cross-Chain Token Bridge",
    description: "Facilitate token transfers between Ethereum and Polygon networks.",
    type: "crossChain",
    complexity: "High",
    successRate: "99%",
    gasCost: "0.008 ETH",
    tags: ["Bridge", "Cross-Chain", "Ethereum", "Polygon"]
  },
  {
    id: 3,
    title: "Aave-Compound Yield Optimizer",
    description: "Automatically move funds between Aave and Compound for optimal yields.",
    type: "crossDapp",
    complexity: "Medium",
    successRate: "97%",
    gasCost: "0.006 ETH",
    tags: ["DeFi", "Yield", "Aave", "Compound"]
  },
  {
    id: 4,
    title: "Chainlink Price Feed Integration",
    description: "Integrate Chainlink price feeds for real-time asset pricing in your DApp.",
    type: "external",
    complexity: "Low",
    successRate: "99.5%",
    gasCost: "0.002 ETH",
    tags: ["Oracle", "Chainlink", "Price Feed"]
  },
  {
    id: 5,
    title: "NFT Minting Bot",
    description: "Automate the process of minting NFTs on popular marketplaces.",
    type: "liveData",
    complexity: "Medium",
    successRate: "96%",
    gasCost: "0.01 ETH",
    tags: ["NFT", "Minting", "Marketplace"]
  }
]

export default function LibraryHomepage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [templates, setTemplates] = useState(allTemplates)
  const router = useRouter()

  useEffect(() => {
    const filtered = allTemplates.filter(template => 
      (searchTerm === '' || template.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
       template.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTypes.length === 0 || selectedTypes.includes(template.type))
    )
    setTemplates(filtered)
  }, [searchTerm, selectedTypes])

  const handleTypeChange = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleViewDetails = (id: number) => {
    router.push(`/templates/DappLibrary/${id}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-8">
        <ol className="flex text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-primary">Home</Link></li>
          <li className="mx-2">/</li>
          <li>Template Library</li>
        </ol>
      </nav>

      <section className="mb-12">
        <h1 className="text-4xl font-bold mb-4">DApp Automation Library</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search templates" 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            Advanced Filters
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Architecture Type</h3>
                  <div className="space-y-2">
                    {['liveData', 'crossDapp', 'crossChain', 'external'].map((type) => (
                      <div key={type} className="flex items-center">
                        <Checkbox 
                          id={type} 
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => handleTypeChange(type)}
                        />
                        <Label htmlFor={type} className="ml-2">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="flex-grow">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              {['All', 'Live Data', 'Cross-DApp', 'Cross-Chain', 'External'].map((category) => (
                <Button key={category} variant="outline" size="sm">
                  {category}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {templates.map(template => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <ArchitectureTypeBadge type={template.type} />
                    <ComplexityLevel level={template.complexity} />
                  </div>
                  <CardTitle>{template.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <MetricRow label="Success Rate" value={template.successRate} />
                    <MetricRow label="Gas Cost" value={template.gasCost} />
                    <TagList tags={template.tags} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="mr-2">Quick View</Button>
                  <Button onClick={() => handleViewDetails(template.id)}>View Details</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

const ArchitectureTypeBadge = ({ type }: { type: string }) => {
  const colors: { [key: string]: string } = {
    liveData: "bg-green-100 text-green-800",
    crossDapp: "bg-purple-100 text-purple-800",
    crossChain: "bg-orange-100 text-orange-800",
    external: "bg-pink-100 text-pink-800"
  }

  return (
    <span className={`${colors[type]} px-2.5 py-1 text-xs rounded-full font-medium`}>
      {type}
    </span>
  )
}

const ComplexityLevel = ({ level }: { level: string }) => (
  <span className="text-xs font-medium text-muted-foreground">
    {level} Complexity
  </span>
)

const MetricRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
)

const TagList = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {tags.map(tag => (
      <span key={tag} className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
        {tag}
      </span>
    ))}
  </div>
)