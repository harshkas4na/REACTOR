'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Github, Code, Zap } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Template = {
  id: number
  title: string
  description: string
  sourceCode: string
  reactiveTemplate: string
  githubRepo: string
}

const templates: Template[] = [
  {
    id: 1,
    title: "Supply Chain Tracker",
    description: "A supply chain management tool that uses Reactive Smart Contracts to autonomously track and verify the authenticity and condition of goods as they move through the supply chain, improving transparency and accountability.",
    sourceCode: "// Supply Chain Tracker Smart Contract\n\n// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract SupplyChainTracker {\n    // Contract code here\n}",
    reactiveTemplate: "// Reactive Template for Supply Chain Tracker\n\nimport { createReactiveContract } from '@reactive-contracts/core';\n\nconst SupplyChainTracker = createReactiveContract({\n  // Reactive contract logic here\n});",
    githubRepo: "https://github.com/example/supply-chain-tracker"
  },
  {
    id: 2,
    title: "Decentralized Event Ticketing",
    description: "Utilize Reactive Smart Contracts to create a decentralized event ticketing platform that automatically issues, transfers, and settles tickets upon event-related triggers, reducing fraud and ensuring a seamless experience for both organizers and attendees.",
    sourceCode: "// Decentralized Event Ticketing Smart Contract\n\n// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract EventTicketing {\n    // Contract code here\n}",
    reactiveTemplate: "// Reactive Template for Event Ticketing\n\nimport { createReactiveContract } from '@reactive-contracts/core';\n\nconst EventTicketing = createReactiveContract({\n  // Reactive contract logic here\n});",
    githubRepo: "https://github.com/example/event-ticketing"
  },
  {
    id: 3,
    title: "Automated Legal Contracts",
    description: "A platform that uses Reactive Smart Contracts for the execution of legal agreements, automatically enforcing terms based on predefined conditions and on-chain events, streamlining dispute resolution and contract management.",
    sourceCode: "// Automated Legal Contracts Smart Contract\n\n// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract LegalContracts {\n    // Contract code here\n}",
    reactiveTemplate: "// Reactive Template for Legal Contracts\n\nimport { createReactiveContract } from '@reactive-contracts/core';\n\nconst LegalContracts = createReactiveContract({\n  // Reactive contract logic here\n});",
    githubRepo: "https://github.com/example/legal-contracts"
  },
  {
    id: 4,
    title: "Dynamic NFT Marketplace",
    description: "A marketplace for NFTs that uses Reactive Smart Contracts to enable dynamic pricing and traits based on external data sources and on-chain events, enhancing the interactivity and value of digital collectibles.",
    sourceCode: "// Dynamic NFT Marketplace Smart Contract\n\n// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract DynamicNFTMarketplace {\n    // Contract code here\n}",
    reactiveTemplate: "// Reactive Template for Dynamic NFT Marketplace\n\nimport { createReactiveContract } from '@reactive-contracts/core';\n\nconst DynamicNFTMarketplace = createReactiveContract({\n  // Reactive contract logic here\n});",
    githubRepo: "https://github.com/example/dynamic-nft-marketplace"
  },
  {
    id: 5,
    title: "Decentralized Insurance Protocol",
    description: "An insurance protocol that leverages Reactive Smart Contracts to automatically process claims and payouts based on verified on-chain events, reducing the need for intermediaries and improving trust and efficiency.",
    sourceCode: "// Decentralized Insurance Protocol Smart Contract\n\n// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract InsuranceProtocol {\n    // Contract code here\n}",
    reactiveTemplate: "// Reactive Template for Insurance Protocol\n\nimport { createReactiveContract } from '@reactive-contracts/core';\n\nconst InsuranceProtocol = createReactiveContract({\n  // Reactive contract logic here\n});",
    githubRepo: "https://github.com/example/insurance-protocol"
  },
  {
    id: 6,
    title: "Automated DAO Governance",
    description: "A governance platform for DAOs that automates proposals, voting, and execution of decisions based on predefined rules and on-chain events, streamlining the decision-making process.",
    sourceCode: "// Automated DAO Governance Smart Contract\n\n// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract DAOGovernance {\n    // Contract code here\n}",
    reactiveTemplate: "// Reactive Template for DAO Governance\n\nimport { createReactiveContract } from '@reactive-contracts/core';\n\nconst DAOGovernance = createReactiveContract({\n  // Reactive contract logic here\n});",
    githubRepo: "https://github.com/example/dao-governance"
  },
]

export function AllTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">All Templates</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300 bg-gray-800 border-gray-700">
              <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white rounded-t-lg">
                <CardTitle className="text-xl font-bold">{template.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-6">
                <p className="text-gray-300">{template.description}</p>
              </CardContent>
              <CardFooter className="flex justify-center p-6 bg-gray-700 rounded-b-lg">
                <TooltipProvider>
                  <div className="flex space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-gray-600 border-gray-500 text-gray-200"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <Code className="w-5 h-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl bg-gray-800 text-gray-100">
                            <DialogHeader>
                              <DialogTitle>{selectedTemplate?.title} - Source Code</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[400px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
                              <pre className="text-sm text-gray-300">
                                <code>{selectedTemplate?.sourceCode}</code>
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Source Code</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-gray-600 border-gray-500 text-gray-200"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <Zap className="w-5 h-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl bg-gray-800 text-gray-100">
                            <DialogHeader>
                              <DialogTitle>{selectedTemplate?.title} - Reactive Template</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[400px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
                              <pre className="text-sm text-gray-300">
                                <code>{selectedTemplate?.reactiveTemplate}</code>
                              </pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Reactive Template</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-gray-600 border-gray-500 text-gray-200"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <Github className="w-5 h-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 text-gray-100">
                            <DialogHeader>
                              <DialogTitle>{selectedTemplate?.title} - GitHub Repository</DialogTitle>
                            </DialogHeader>
                            <p className="text-center py-4">
                              <a
                                href={selectedTemplate?.githubRepo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline"
                              >
                                {selectedTemplate?.githubRepo}
                              </a>
                            </p>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View GitHub Repo</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}