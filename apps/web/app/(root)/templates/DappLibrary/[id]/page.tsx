"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent, TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs"
import { ChevronRight, Clock, Code, FileText, GitFork, LineChart, User, Zap } from 'lucide-react'

interface Template {
    id: number
    title: string
    description: string
    type: string
    author: string
    lastUpdated: string
    metrics: {
        successRate: string
        gasCost: string
        usageCount: number
    }
    overview: string
    technicalDetails: string
    implementation: string
    code: string
    performanceMetrics: {
        averageExecutionTime: string
        failureRate: string
        averageGasUsage: string
    }
}


// Mock data for multiple templates
const templatesData: Template[] = [
    {
      id: 1,
      title: "Uniswap V3 Liquidity Provision",
      description: "Automate liquidity provision on Uniswap V3 with dynamic fee tier selection.",
      type: "liveData",
      author: "John Doe",
      lastUpdated: "2023-05-15",
      metrics: {
        successRate: "98%",
        gasCost: "0.005 ETH",
        usageCount: 1500
      },
      overview: "This template automates the process of providing liquidity to Uniswap V3 pools. It dynamically selects the optimal fee tier based on current market conditions and your risk preferences.",
      technicalDetails: "The template uses Uniswap V3's smart contract interfaces to interact with the protocol. It implements a custom algorithm to determine the best fee tier and price range for liquidity provision.",
      implementation: "1. Connect to Ethereum network\n2. Fetch current pool data\n3. Calculate optimal fee tier and price range\n4. Approve token spending\n5. Call mint() function on Uniswap V3 pool contract",
      code: `
  import { ethers } from 'ethers'
  import { Pool } from '@uniswap/v3-sdk'
  import { Token } from '@uniswap/sdk-core'
  
  async function provideLiquidity(tokenA, tokenB, amount, provider) {
    // Implementation details...
    const pool = new Pool(
      tokenA,
      tokenB,
      FeeAmount.MEDIUM,
      sqrtPriceX96.toString(),
      liquidity.toString(),
      tickCurrent
    )
    
    // Mint position
    const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, {
      slippageTolerance: new Percent(50, 10_000),
      recipient: address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    })
    
    // Send transaction
    const transaction = {
      data: calldata,
      to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      value: value,
      from: address,
      gasPrice: await provider.getGasPrice(),
    }
    
    const response = await wallet.sendTransaction(transaction)
    await response.wait()
  }
      `,
      performanceMetrics: {
        averageExecutionTime: "2.3 seconds",
        failureRate: "2%",
        averageGasUsage: "150,000 gas"
      }
    },
    {
      id: 2,
      title: "Cross-Chain Token Bridge",
      description: "Facilitate token transfers between Ethereum and Polygon networks.",
      type: "crossChain",
      author: "Jane Smith",
      lastUpdated: "2023-06-20",
      metrics: {
        successRate: "99%",
        gasCost: "0.008 ETH",
        usageCount: 2200
      },
      overview: "This template enables seamless transfer of ERC20 tokens between Ethereum and Polygon networks. It handles all the complexities of cross-chain communication and ensures secure, atomic transactions.",
      technicalDetails: "The template utilizes a combination of smart contracts on both Ethereum and Polygon, along with a relayer service to facilitate cross-chain message passing. It implements a lock-and-mint mechanism for token transfers.",
      implementation: "1. Lock tokens on source chain\n2. Emit event with transfer details\n3. Relayer picks up event and submits proof to destination chain\n4. Destination chain verifies proof and mints equivalent tokens\n5. User claims tokens on destination chain",
      code: `
  // Ethereum contract
  contract EthereumBridge {
      function lockTokens(address token, uint256 amount, address recipient) external {
          // Transfer tokens to this contract
          IERC20(token).transferFrom(msg.sender, address(this), amount);
          
          // Emit event for relayer
          emit TokensLocked(token, amount, recipient, block.number);
      }
  }
  
  // Polygon contract
  contract PolygonBridge {
      function claimTokens(bytes memory proof) external {
          // Verify proof
          require(verifyProof(proof), "Invalid proof");
          
          // Mint tokens to recipient
          address recipient = extractRecipient(proof);
          uint256 amount = extractAmount(proof);
          mintToken(recipient, amount);
      }
  }
      `,
      performanceMetrics: {
        averageExecutionTime: "5 minutes",
        failureRate: "1%",
        averageGasUsage: "Ethereum: 100,000 gas, Polygon: 80,000 gas"
      }
    },
    {
      id: 3,
      title: "Aave-Compound Yield Optimizer",
      description: "Automatically move funds between Aave and Compound for optimal yields.",
      type: "crossDapp",
      author: "Alex Johnson",
      lastUpdated: "2023-07-10",
      metrics: {
        successRate: "97%",
        gasCost: "0.006 ETH",
        usageCount: 1800
      },
      overview: "This template optimizes yield farming by automatically moving funds between Aave and Compound lending protocols based on the best available interest rates.",
      technicalDetails: "The template uses Aave and Compound's smart contract interfaces to interact with both protocols. It implements a custom algorithm to compare interest rates and determine the optimal allocation of funds.",
      implementation: "1. Fetch current interest rates from Aave and Compound\n2. Calculate optimal fund allocation\n3. Withdraw funds from the lower-yield protocol\n4. Deposit funds into the higher-yield protocol\n5. Update internal accounting and emit events",
      code: `
  import { ethers } from 'ethers'
  import { AaveProtocolDataProvider } from '@aave/protocol-js'
  import { Compound } from '@compound-finance/compound-js'
  
  async function optimizeYield(amount, provider) {
    const aaveRate = await getAaveRate()
    const compoundRate = await getCompoundRate()
    
    if (aaveRate > compoundRate) {
      await withdrawFromCompound(amount)
      await depositToAave(amount)
    } else {
      await withdrawFromAave(amount)
      await depositToCompound(amount)
    }
  }
  
  // Implementation of getAaveRate, getCompoundRate, withdrawFromCompound, depositToAave, etc.
      `,
      performanceMetrics: {
        averageExecutionTime: "30 seconds",
        failureRate: "3%",
        averageGasUsage: "200,000 gas"
      }
    },
    {
      id: 4,
      title: "Chainlink Price Feed Integration",
      description: "Integrate Chainlink price feeds for real-time asset pricing in your DApp.",
      type: "external",
      author: "Sarah Lee",
      lastUpdated: "2023-08-05",
      metrics: {
        successRate: "99.5%",
        gasCost: "0.002 ETH",
        usageCount: 3000
      },
      overview: "This template provides a simple way to integrate Chainlink's decentralized price feeds into your DApp, ensuring you have access to accurate and up-to-date asset prices.",
      technicalDetails: "The template interacts with Chainlink's Price Feed contracts to fetch the latest price data. It includes error handling and fallback mechanisms to ensure reliability.",
      implementation: "1. Deploy Price Consumer contract\n2. Configure Chainlink aggregator addresses\n3. Implement getLatestPrice function\n4. Set up update frequency and deviation thresholds\n5. Integrate price feed into your DApp logic",
      code: `
  pragma solidity ^0.8.0;
  
  import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
  
  contract PriceConsumerV3 {
      AggregatorV3Interface internal priceFeed;
  
      constructor() {
          priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
      }
  
      function getLatestPrice() public view returns (int) {
          (
              uint80 roundID, 
              int price,
              uint startedAt,
              uint timeStamp,
              uint80 answeredInRound
          ) = priceFeed.latestRoundData();
          return price;
      }
  }
      `,
      performanceMetrics: {
        averageExecutionTime: "1 second",
        failureRate: "0.5%",
        averageGasUsage: "50,000 gas"
      }
    },
    {
      id: 5,
      title: "NFT Minting Bot",
      description: "Automate the process of minting NFTs on popular marketplaces.",
      type: "liveData",
      author: "Chris Wong",
      lastUpdated: "2023-09-01",
      metrics: {
        successRate: "96%",
        gasCost: "0.01 ETH",
        usageCount: 1200
      },
      overview: "This template automates the process of minting NFTs on popular marketplaces. It handles the complexities of interacting with NFT smart contracts and can be customized for various NFT standards.",
      technicalDetails: "The template uses ERC721 and ERC1155 standards for NFT minting. It includes gas optimization techniques and supports batch minting for improved efficiency.",
      implementation: "1. Connect to Ethereum network\n2. Load NFT metadata and artwork\n3. Estimate gas costs and set appropriate gas price\n4. Call mint function on the NFT contract\n5. Verify minting success and emit events",
      code: `
  import { ethers } from 'ethers'
  import { ERC721__factory, ERC1155__factory } from './typechain'
  
  async function mintNFT(contractAddress, tokenId, metadata, recipient) {
    const signer = provider.getSigner()
    const nftContract = ERC721__factory.connect(contractAddress, signer)
    
    const tx = await nftContract.mint(recipient, tokenId, metadata)
    await tx.wait()
    
    console.log(\`NFT minted: Token ID \${tokenId}\`)
  }
  
  // Implementation for batch minting, gas estimation, etc.
      `,
      performanceMetrics: {
        averageExecutionTime: "15 seconds",
        failureRate: "4%",
        averageGasUsage: "120,000 gas"
      }
    }
  ]

export default function TemplateDetailPage() {
  const { id } = useParams()
  console.log(id)
  const [template, setTemplate] = useState<Template>()

  useEffect(() => {
    // In a real application, this would be an API call
    const fetchedTemplate = templatesData.find(template => template.id === Number(id))
    console.log(fetchedTemplate)
    setTemplate(fetchedTemplate)
  }, [id])

  if (!template) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-8">
        <ol className="flex text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-primary">Home</Link></li>
          <li className="mx-2"><ChevronRight className="h-4 w-4" /></li>
          <li><Link href="/templates/library" className="hover:text-primary">Template Library</Link></li>
          <li className="mx-2"><ChevronRight className="h-4 w-4" /></li>
          <li>{template.title}</li>
        </ol>
      </nav>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">{template.title}</h1>
          <div className="flex gap-2">
            <Button variant="outline">
              <GitFork className="mr-2 h-4 w-4" />
              Fork Template
            </Button>
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              Use Template
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <ArchitectureTypeBadge type={template.type} size="lg" />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <AuthorInfo author={template.author} />
            <DateInfo date={template.lastUpdated} />
            <MetricsPill metrics={template.metrics} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-12">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{template.overview}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{template.technicalDetails}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="implementation">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                {template.implementation.split('\n').map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Code Sample</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
                <code>{template.code}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-muted p-4 rounded-lg">
                  <dt className="text-sm font-medium text-muted-foreground">Average Execution Time</dt>
                  <dd className="mt-1 text-2xl font-semibold">{template.performanceMetrics.averageExecutionTime}</dd>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <dt className="text-sm font-medium text-muted-foreground">Failure Rate</dt>
                  <dd className="mt-1 text-2xl font-semibold">{template.performanceMetrics.failureRate}</dd>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <dt className="text-sm font-medium text-muted-foreground">Average Gas Usage</dt>
                  <dd className="mt-1 text-2xl font-semibold">{template.performanceMetrics.averageGasUsage}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const ArchitectureTypeBadge = ({ type, size = "md" }: { type: string, size?: "md" | "lg" }) => {
  const colors: { [key: string]: string } = {
    liveData: "bg-green-100 text-green-800",
    crossDapp: "bg-purple-100 text-purple-800",
    crossChain: "bg-orange-100 text-orange-800",
    external: "bg-pink-100 text-pink-800"
  }

  return (
    <span className={`
      ${colors[type]}
      ${size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs"}
      rounded-full font-medium
    `}>
      {type}
    </span>
  )
}

const AuthorInfo = ({ author }: { author: string }) => (
  <div className="flex items-center">
    <User className="h-4 w-4 mr-1" />
    {author}
  </div>
)

const DateInfo = ({ date }: { date: string }) => (
  <div className="flex items-center">
    <Clock className="h-4 w-4 mr-1" />
    Last updated: {date}
  </div>
)

const MetricsPill = ({ metrics }: { metrics: { successRate: string, gasCost: string, usageCount: number } }) => (
  <div className="bg-muted px-3 py-1 rounded-full text-xs">
    {metrics.successRate} success • {metrics.gasCost} avg. gas • {metrics.usageCount} uses
  </div>
)