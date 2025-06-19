export interface AutomationType {
  name: string;
  description: string;
  supportedChains: number[];
  costEstimate: string;
  features: string[];
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  currency: string;
  dex: string;
  explorerUrl: string;
}

export const REACTOR_KNOWLEDGE_BASE = {
  automations: {
    STOP_ORDER: {
      name: 'Stop Orders',
      description: 'Automatically sell tokens when price drops to protect from losses',
      supportedChains: [1, 11155111, 43114],
      costEstimate: '• Ethereum: ~0.03 ETH + 0.05 REACT\n• Avalanche: ~0.01 AVAX + 0.05 REACT\n• Sepolia: ~0.03 ETH + 0.05 KOPLI',
      features: [
        '24/7 price monitoring',
        'Instant execution on trigger',
        'No manual intervention needed',
        'Cross-chain compatible'
      ]
    },
    FEE_COLLECTOR: {
      name: 'Fee Collectors',
      description: 'Automatically collect and compound Uniswap V3 liquidity fees',
      supportedChains: [1, 43114],
      costEstimate: 'Coming soon',
      features: [
        'Auto-harvest fees',
        'Compound into positions',
        'Gas-efficient batch collection',
        'Multi-position support'
      ]
    },
    RANGE_MANAGER: {
      name: 'Range Managers',
      description: 'Optimize Uniswap V3 position ranges based on market conditions',
      supportedChains: [1, 43114],
      costEstimate: 'Coming soon',
      features: [
        'Dynamic range adjustment',
        'Maximize fee collection',
        'Risk management',
        'Market-aware positioning'
      ]
    }
  },
  
  networks: {
    ethereum: {
      chainId: 1,
      name: 'Ethereum Mainnet',
      currency: 'ETH',
      dex: 'Uniswap V2',
      explorerUrl: 'https://etherscan.io'
    },
    sepolia: {
      chainId: 11155111,
      name: 'Ethereum Sepolia',
      currency: 'ETH',
      dex: 'Uniswap V2',
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    avalanche: {
      chainId: 43114,
      name: 'Avalanche C-Chain',
      currency: 'AVAX',
      dex: 'Pangolin',
      explorerUrl: 'https://snowtrace.io'
    }
  },
  
  reactiveNetwork: {
    mainnet: {
      chainId: 1597,
      name: 'Reactive Mainnet',
      currency: 'REACT',
      gasPrice: '0.05',
      explorerUrl: 'https://explorer.reactive.network'
    },
    testnet: {
      chainId: 5318008,
      name: 'Kopli Testnet',
      currency: 'KOPLI',
      gasPrice: '0.05',
      explorerUrl: 'https://testnet.explorer.reactive.network'
    }
  },
  
  platform: {
    name: 'REACTOR',
    description: 'DeFi automation platform powered by Reactive Smart Contracts',
    features: [
      'Event-driven automation',
      'Cross-chain operations',
      'No-code interface',
      'Community templates'
    ],
    website: 'https://reactor.xyz',
    documentation: 'https://docs.reactor.xyz'
  },
  
  faq: {
    'what is reactor': {
      answer: `**REACTOR** is a revolutionary DeFi automation platform that makes blockchain automation accessible to everyone! 🚀

**Key Features:**
• **Event-Driven Automation**: Smart contracts that react to blockchain events automatically
• **Cross-Chain Operations**: Seamless automation across multiple networks
• **User-Friendly Interface**: No coding required - just configure and deploy
• **24/7 Monitoring**: Your automations work round the clock

**Popular Use Cases:**
• Stop Orders - Protect investments from price drops
• Fee Collection - Auto-harvest DeFi yields
• Portfolio Rebalancing - Maintain optimal allocations

Ready to automate your DeFi strategy? Let's get started! 🎯`,
      relatedTopics: ['How do RSCs work?', 'Create a stop order', 'View pricing']
    },
    
    'what are rscs': {
      answer: `**Reactive Smart Contracts (RSCs)** are the revolutionary technology powering REACTOR! 🧠

**Traditional vs Reactive:**
• **Traditional**: You → Contract (manual)
• **Reactive**: Event → Contract → Action (automatic)

**How They Work:**
1. **Subscribe** to blockchain events (like price changes)
2. **Monitor** conditions 24/7 automatically
3. **React** instantly when conditions are met
4. **Execute** actions across different chains

**Key Benefits:**
• No manual monitoring needed
• Instant reaction to market conditions
• Cross-chain execution capabilities
• Gas-efficient operation

RSCs make your DeFi strategies truly autonomous! ⚡`,
      relatedTopics: ['Technical details', 'Create an RSC', 'View examples']
    },
    
    'how much does it cost': {
      answer: `**REACTOR Pricing** is transparent and one-time only! 💰

**Stop Orders:**
• **Ethereum**: ~0.03 ETH + 0.05 REACT
• **Avalanche**: ~0.01 AVAX + 0.05 REACT
• **Testnet**: Minimal amounts for testing

**What You're Paying For:**
1. **Destination Contract**: Executes your trades (~0.01-0.03 native token)
2. **RSC Deployment**: 24/7 monitoring on Reactive Network (~0.05 REACT)

**Important:**
• One-time deployment cost only
• No recurring fees or subscriptions
• Automation runs forever once deployed
• Gas fees only when trades execute

Get lifetime automation for less than a typical transaction fee! 🎯`,
      relatedTopics: ['Network comparison', 'Get REACT tokens', 'Calculate costs']
    },
    
    'how to get started': {
      answer: `**Getting Started with REACTOR** is easy! 🚀

**Step 1: Connect Your Wallet**
• Use MetaMask, WalletConnect, or any Web3 wallet
• Ensure you have funds for deployment

**Step 2: Choose Your Automation**
• **Stop Orders**: Protect against price drops
• **Fee Collectors**: Auto-harvest yields (coming soon)
• **Range Managers**: Optimize LP positions (coming soon)

**Step 3: Configure Parameters**
• Select tokens and amounts
• Set trigger conditions
• Choose your network

**Step 4: Deploy**
• Review configuration
• Approve tokens if needed
• Deploy contracts

Your automation is now live and working 24/7! 🎉`,
      relatedTopics: ['Create stop order', 'View templates', 'Join community']
    },
    
    'what networks are supported': {
      answer: `**REACTOR supports multiple blockchain networks!** 🌐

**Production Networks:**
• **Ethereum Mainnet** - Uniswap V2 integration
• **Avalanche C-Chain** - Pangolin DEX integration

**Test Networks:**
• **Sepolia Testnet** - For Ethereum testing
• **Kopli Testnet** - Reactive Network testnet

**Coming Soon:**
• Arbitrum
• Polygon
• Base
• More chains based on community demand!

**Each Network Offers:**
• Native DEX integration
• Optimized gas costs
• Full RSC capabilities
• Cross-chain operations

Choose the network that best fits your needs! 🎯`,
      relatedTopics: ['Network costs', 'Cross-chain guide', 'Request new network']
    }
  },
  
  responseTemplates: {
    welcome: "👋 Welcome to REACTOR! I'm here to help you automate your DeFi strategies. What would you like to do today?",
    
    helpMenu: `I can help you with:
• **Create Automations** - Stop orders, fee collectors, and more
• **Learn About REACTOR** - RSCs, features, and capabilities  
• **Check Blockchain Data** - Balances, pairs, prices
• **Get Technical Help** - Integration and development

What interests you? 🚀`,
    
    errorGeneric: "❌ Oops! Something went wrong. Let's try again or try a different approach.",
    
    notConnected: "🔗 Please connect your wallet first to access this feature!",
    
    comingSoon: "🚧 This feature is coming soon! Stay tuned for updates.",
    
    success: "✅ Success! Your automation is being deployed. You can track its progress in the dashboard."
  },
  
  routes: {
    stopOrders: '/automations/stop-order',
    feeCollectors: '/automations/fee-collector',
    rangeManagers: '/automations/range-manager',
    templates: '/templates',
    deployRsc: '/deploy-reactive-contract',
    getStarted: '/get-started'
  }
};