import { KnowledgeBase } from '../types/ai';

export const REACTOR_KNOWLEDGE_BASE: KnowledgeBase = {
  platform: {
    name: "REACTOR",
    description: "DeFi automation platform powered by Reactive Smart Contracts",
    website: "https://app.thereactor.in",
    documentation: "https://app.thereactor.in/about"
  },

  reactiveNetwork: {
    name: "Reactive Network",
    description: "The world's first event-driven blockchain for autonomous smart contracts",
    documentation: "https://dev.reactive.network",
    mainnet: {
      chainId: 1597,
      name: "Reactive Mainnet",
      currency: "REACT",
      explorer: "https://reactscan.net"
    },
    testnet: {
      chainId: 5318008,
      name: "Kopli Testnet", 
      currency: "KOPLI",
      explorer: "https://kopli.reactscan.net"
    },
    features: [
      "Event-driven smart contracts",
      "Cross-chain event monitoring",
      "Autonomous contract execution",
      "Inversion of Control paradigm",
      "Gas-efficient operations"
    ]
  },

  automations: {
    stopOrders: {
      name: "Stop Orders",
      description: "Automatically sell tokens when price drops below a specified threshold",
      status: "active",
      features: [
        "24/7 price monitoring",
        "Instant execution when triggered",
        "Cross-chain support",
        "Gas-optimized operations"
      ],
      supportedChains: [1, 11155111, 43114],
      costEstimate: "0.03-0.05 ETH + 0.05 REACT tokens",
      useCase: "Protect investments from market crashes and volatility"
    },
    
    feeCollectors: {
      name: "Fee Collectors", 
      description: "Automatically collect earned fees from Uniswap V3 positions",
      status: "inactive",
      features: [
        "Automatic fee collection",
        "Direct transfer to wallet",
        "Cooldown period optimization",
        "Gas-efficient collection"
      ],
      supportedChains: [11155111],
      costEstimate: "Minimal gas fees",
      useCase: "Maximize earnings from Uniswap V3 liquidity provision"
    },

    rangeManagers: {
      name: "Range Managers",
      description: "Automatically adjust Uniswap V3 position ranges for optimal fee generation", 
      status: "inactive",
      features: [
        "Smart range calculation",
        "Volatility-based adjustments",
        "Fee optimization",
        "Three-step gas-efficient process"
      ],
      supportedChains: [11155111],
      costEstimate: "Gas fees for adjustment transactions",
      useCase: "Keep Uniswap V3 positions in profit-generating ranges"
    },

    customRSCs: {
      name: "Custom Reactive Smart Contracts",
      description: "Create custom event-driven automation contracts",
      status: "active", 
      features: [
        "Custom event monitoring",
        "Flexible automation logic",
        "Cross-chain capabilities",
        "Advanced conditional triggers"
      ],
      supportedChains: [1597, 5318008],
      costEstimate: "Variable based on complexity",
      useCase: "Advanced users and developers creating custom automations"
    }
  },

  networks: {
    ethereum: {
      chainId: 1,
      name: "Ethereum Mainnet",
      currency: "ETH",
      dex: "Uniswap V2",
      status: "active"
    },
    sepolia: {
      chainId: 11155111,
      name: "Ethereum Sepolia",
      currency: "ETH", 
      dex: "Uniswap V2",
      status: "active"
    },
    avalanche: {
      chainId: 43114,
      name: "Avalanche C-Chain",
      currency: "AVAX",
      dex: "Pangolin",
      status: "active"
    }
  },

  faq: {
    "what is reactive smart contract": {
      answer: "Reactive Smart Contracts (RSCs) are event-driven contracts that automatically monitor blockchain events and trigger actions without manual intervention. Unlike traditional smart contracts that require users to call functions, RSCs use an Inversion of Control paradigm to autonomously react to on-chain events.",
      relatedTopics: ["reactive network", "automation", "event-driven"]
    },
    
    "how do stop orders work": {
      answer: "Stop orders monitor token pair prices 24/7 and automatically sell your tokens when the price drops below your specified threshold. They deploy two contracts: a destination contract on your chosen chain and an RSC on Reactive Network kopli(for testnet) & React Mainnet(for mainnet) that monitors prices and triggers the sale.",
      relatedTopics: ["price protection", "automation", "cross-chain"]
    },

    "what is reactive network": {
      answer: "Reactive Network is the world's first event-driven blockchain designed specifically for autonomous smart contracts. It enables RSCs to monitor events across multiple chains and execute cross-chain actions automatically. Learn more at dev.reactive.network",
      relatedTopics: ["rsc", "cross-chain", "automation"]
    },

    "gas costs and fees": {
      answer: "Costs vary by automation type: Stop Orders need ~0.03-0.05 ETH for deployment plus 0.05 REACT tokens for RSC operation. Fee Collectors and Range Managers primarily use gas for transactions. All automations are optimized for gas efficiency.",
      relatedTopics: ["costs", "gas optimization", "funding"]
    }
  },

  responseTemplates: {
    greeting: "Hi! I'm Reactor AI 🤖\n\nI can help you with:\n• Create Stop Orders - Protect tokens from price drops\n• Deploy RSCs - Custom automation contracts\n• Setup Automations - Fee Collectors & Range Managers\n• Answer Questions - Learn about DeFi automation\n\nWhat would you like to do?",
    
    rscRedirect: "For custom RSC development, I'll guide you to our specialized deployment page where you can create advanced event-driven contracts. RSCs are powered by Reactive Network - check out dev.reactive.network for more details!",
    
    feeCollectorRedirect: "Fee Collectors automatically harvest your Uniswap V3 fees and send them directly to your wallet. They're perfect for maximizing your yield from liquidity provision!",
    
    rangeManagerRedirect: "Range Managers keep your Uniswap V3 positions in optimal fee-earning ranges by automatically adjusting them as prices move. Great for maximizing returns!",

    networkInfo: "Reactor supports multiple networks:\n• Ethereum Mainnet - Full stop order support\n• Avalanche C-Chain - Stop orders with Pangolin DEX\n• Sepolia Testnet - All features for testing\n\nRSCs run on Reactive Network (dev.reactive.network)"
  },

  routes: {
    stopOrder: "/automations/stop-order",
    feeCollector: "/automations/fee-collector", 
    rangeManager: "/automations/range-manager",
    deployRSC: "/deploy-reactive-contract",
    docs: "https://app.thereactor.in/about",
    reactiveNetwork: "https://dev.reactive.network"
  }
}; 