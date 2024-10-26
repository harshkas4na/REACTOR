'use client'

import { useState } from 'react'
import { Search, Loader2, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const templates = [
  {
    id: 'single-dapp',
    title: 'Single DApp Automation',
    description: 'Automate actions within a single DApp based on its internal events',
    icon: (
      <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
        </svg>
      </div>
    ),
  },
  {
    id: 'chain-wide',
    title: 'Chain-Wide Triggers',
    description: 'Create automations that respond to blockchain-wide events',
    icon: (
      <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'cross-dapp',
    title: 'Cross-DApp Integration',
    description: 'Build automated workflows connecting multiple DApps',
    icon: (
      <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </div>
    ),
  },
]

export default function TemplateSelection() {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleTemplateSelect = (template) => {
    setLoading(true)
    setSelectedTemplate(null)
    setTimeout(() => {
      setSelectedTemplate(template)
      setLoading(false)
    }, 1000)
  }

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-gray-900 to-black text-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-100">DApp Automation Templates</h1>
      
      <Alert className="mb-8 bg-gray-800 border-gray-600 shadow-lg">
        <Info className="h-4 w-4 text-gray-400" />
        <AlertTitle className="text-gray-200">Welcome to DApp Automation Templates</AlertTitle>
        <AlertDescription className="text-gray-300">
          This page allows you to explore and select automation templates for your DApps. You can:
          <ul className="list-disc list-inside mt-2">
            <li>Browse different types of automation templates</li>
            <li>Search for specific templates using the search bar</li>
            <li>Select a template to view more details and customize it</li>
            <li>See popular templates that are coming soon</li>
          </ul>
          Choose a template that best fits your DApp's needs and start automating your blockchain workflows!
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <div className="relative max-w-md">
          <Input
            type="search"
            placeholder="Search templates..."
            className="pl-10 bg-gray-800 text-gray-100 border-gray-600 placeholder-gray-400 shadow-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-lg"
          >
            <CardHeader>
              <div className="flex justify-center mb-4">{template.icon}</div>
              <CardTitle className="text-gray-100">{template.title}</CardTitle>
              <CardDescription className="text-gray-300">{template.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-100 shadow-md"
                onClick={() => handleTemplateSelect(template)}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Select Template'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="mb-8 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-xl">
              <CardHeader>
                <CardTitle className="text-gray-100">Template Preview: {selectedTemplate.title}</CardTitle>
                <CardDescription className="text-gray-300">{selectedTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-200">Template configuration options will be displayed here.</p>
              </CardContent>
              <CardFooter>
                <Button className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-100 shadow-md">
                  Customize Template
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-100">Popular Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-50">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-100">Popular Template {i}</CardTitle>
                <CardDescription className="text-gray-300">This is a placeholder for a popular template.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button disabled className="bg-gray-700 text-gray-400 shadow-md">Coming Soon</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}