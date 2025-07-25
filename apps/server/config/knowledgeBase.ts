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
    AAVE_PROTECTION: {
      name: 'Aave Liquidation Protection',
      description: 'Automatically protect your Aave positions from liquidation with smart collateral management and debt repayment strategies',
      supportedChains: [11155111], // Currently Sepolia only, expandable
      costEstimate: '• Sepolia: ~0.03 ETH + 0.05 KOPLI\n• Ethereum Mainnet: Coming soon\n• Avalanche: Coming soon',
      features: [
        'Real-time health factor monitoring',
        'Automated collateral deposits',
        'Automated debt repayment',
        'Combined protection strategies',
        'Customizable thresholds',
        'Multi-asset support'
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
    website: 'https://thereactor.in',
    documentation: 'https://thereactor.in/about'
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
• Aave Protection - Guard against liquidation
• Fee Collection - Auto-harvest DeFi yields
• Portfolio Rebalancing - Maintain optimal allocations

Ready to automate your DeFi strategy? Let's get started! 🎯`,
      relatedTopics: ['How do RSCs work?', 'Create a stop order', 'Aave protection', 'View pricing']
    },
    
    'what are rscs': {
      answer: `**Reactive Smart Contracts (RSCs)** are the revolutionary technology powering REACTOR! 🧠

**Traditional vs Reactive:**
• **Traditional**: You → Contract (manual)
• **Reactive**: Event → Contract → Action (automatic)

**How They Work:**
1. **Subscribe** to blockchain events (like price changes or health factor drops)
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
    
    'aave protection': {
      answer: `**Aave Liquidation Protection** keeps your lending positions safe! 🛡️

**What is Liquidation?**
When your **health factor** drops below 1.0, your collateral gets liquidated with penalties. Our automation prevents this!

**Protection Strategies:**
• **Collateral Deposit**: Automatically add more collateral when health factor drops
• **Debt Repayment**: Automatically repay debt to improve health factor
• **Combined Protection**: Use both strategies with your preference

**How It Works:**
1. Set your health factor threshold (e.g., 1.2)
2. Choose your protection strategy
3. Deploy your automation
4. Relax! We monitor 24/7 and act instantly

**Example:**
"If my health factor drops to 1.2, automatically deposit USDC to bring it back to 1.5"

Ready to protect your Aave position? 🚀`,
      relatedTopics: ['What is health factor?', 'Create Aave protection', 'View costs']
    },
    
    'health factor': {
      answer: `**Health Factor** is your liquidation safety score! 📊

**Formula:**
Health Factor = (Total Collateral × Liquidation Threshold) / Total Debt

**Health Factor Ranges:**
• **> 1.5**: 🟢 **Healthy** - Safe with good margin
• **1.0 - 1.5**: 🟡 **At Risk** - Needs attention
• **< 1.0**: 🔴 **Liquidation** - Position will be liquidated!

**Example:**
• You have $1000 USDC collateral (80% liquidation threshold)
• You borrowed $600 DAI
• Health Factor = ($1000 × 0.8) / $600 = 1.33

**Protection Recommendations:**
• Set trigger at **1.2** (safe margin)
• Target **1.5** after protection
• Monitor during high volatility

**Pro Tip:** Higher health factors = safer positions but lower capital efficiency! 💡`,
      relatedTopics: ['Create Aave protection', 'Liquidation explained', 'Calculate health factor']
    },
    
    'aave liquidation': {
      answer: `**Aave Liquidation** happens when your health factor drops below 1.0! ⚠️

**What Happens:**
• Your collateral gets sold at a discount
• You pay a **liquidation penalty** (typically 5-10%)
• You lose more money than necessary

**Example Liquidation:**
• Health factor drops to 0.95
• Liquidator buys your $1000 ETH for $950
• You lose $50 + gas fees
• **With REACTOR**: Auto-protection prevents this!

**Prevention Strategies:**
• **Monitor health factor** - Set alerts at 1.3+
• **Maintain buffer** - Don't max out borrowing
• **Use automation** - Let RSCs protect you 24/7

**REACTOR's Protection:**
• Triggers at YOUR chosen health factor (e.g., 1.2)
• Automatically adds collateral OR repays debt
• Costs much less than liquidation penalties
• Works while you sleep!

Don't let liquidation eat your profits! 🛡️`,
      relatedTopics: ['Create Aave protection', 'Health factor explained', 'View protection strategies']
    },
    
    'aave assets': {
      answer: `**Supported Aave Assets** for liquidation protection! 💰

**Currently Supported (Sepolia):**
• **LINK** - Chainlink token
• **USDC** - USD Coin stablecoin
• **DAI** - Dai stablecoin
• **USDT** - Tether stablecoin
• **ETH** - Ethereum (WETH)

**Protection Strategies:**
• **Collateral**: Tokens you can deposit to improve health factor
• **Debt**: Tokens you can use to repay your borrowed amount
• **Combined**: Use both based on your preference

**Coming Soon:**
• **Ethereum Mainnet**: All major Aave assets
• **Avalanche**: AVAX, USDC, USDT, DAI, WETH
• **More networks**: Based on community demand

**Custom Tokens:**
You can also use custom token addresses for assets not in our predefined list!

**Example Setup:**
"Protect my LINK collateral by depositing USDC when health factor drops to 1.2"

Ready to protect your Aave assets? 🚀`,
      relatedTopics: ['Create Aave protection', 'Custom token support', 'Network expansion']
    },
    
    'protection strategies': {
      answer: `**Aave Protection Strategies** - Choose what works for you! 🎯

**1. Collateral Deposit Only**
• **What**: Automatically add more collateral
• **When**: You have extra tokens to deposit
• **Pros**: Maintains borrowing capacity
• **Cons**: Requires collateral token balance

**2. Debt Repayment Only**
• **What**: Automatically repay borrowed tokens
• **When**: You want to reduce leverage
• **Pros**: Reduces debt burden
• **Cons**: Requires debt token balance

**3. Combined Protection**
• **What**: Use both strategies with preference
• **When**: You want maximum flexibility
• **Pros**: Fallback if one strategy fails
• **Cons**: Requires both token balances

**Strategy Selection Tips:**
• **Bull Market**: Prefer collateral deposits (keep leverage)
• **Bear Market**: Prefer debt repayment (reduce risk)
• **Uncertain Times**: Use combined protection

**Example:**
"Try collateral deposit first, if that fails, repay debt"

Which strategy fits your risk profile? 🤔`,
      relatedTopics: ['Create Aave protection', 'Risk management', 'Token requirements']
    },
    
    'how much does it cost': {
      answer: `**REACTOR Pricing** is transparent and one-time only! 💰

**Stop Orders:**
• **Ethereum**: ~0.03 ETH + 0.05 REACT
• **Avalanche**: ~0.01 AVAX + 0.05 REACT
• **Testnet**: Minimal amounts for testing

**Aave Protection:**
• **Sepolia**: ~0.03 ETH + 0.05 KOPLI
• **Ethereum Mainnet**: Coming soon
• **Avalanche**: Coming soon

**What You're Paying For:**
1. **Destination Contract**: Executes your protection (~0.01-0.03 native token)
2. **RSC Deployment**: 24/7 monitoring on Reactive Network (~0.05 REACT)

**Important:**
• One-time deployment cost only
• No recurring fees or subscriptions
• Automation runs forever once deployed
• Gas fees only when protection executes

**Cost vs Benefit:**
• Deployment: ~$50-100
• Liquidation penalty: Often $200-1000+
• **You save money** by preventing liquidation!

Get lifetime protection for less than one liquidation penalty! 🎯`,
      relatedTopics: ['Network comparison', 'Get REACT tokens', 'Calculate costs']
    },
    
    'how to get started': {
      answer: `**Getting Started with REACTOR** is easy! 🚀

**Step 1: Connect Your Wallet**
• Use MetaMask, WalletConnect, or any Web3 wallet
• Ensure you have funds for deployment

**Step 2: Choose Your Automation**
• **Stop Orders**: Protect against price drops
• **Aave Protection**: Guard against liquidation
• **Fee Collectors**: Auto-harvest yields (coming soon)
• **Range Managers**: Optimize LP positions (coming soon)

**Step 3: Configure Parameters**
• For Aave: Set health factor thresholds and protection strategy
• For Stop Orders: Select tokens, amounts, and trigger conditions
• Choose your network

**Step 4: Deploy**
• Review configuration
• Approve tokens if needed
• Deploy contracts

Your automation is now live and working 24/7! 🎉

**Popular First Steps:**
• "Create a stop order for my ETH"
• "Protect my Aave position from liquidation"
• "What is my current health factor?"

What would you like to automate? 🤖`,
      relatedTopics: ['Create stop order', 'Aave protection', 'View templates']
    },
    
    'what networks are supported': {
      answer: `**REACTOR supports multiple blockchain networks!** 🌐

**Production Networks:**
• **Ethereum Mainnet** - Uniswap V2, Aave V3 (Aave protection coming soon)
• **Avalanche C-Chain** - Pangolin DEX (Aave protection coming soon)

**Test Networks:**
• **Sepolia Testnet** - Uniswap V2, Aave V3 (full support)
• **Kopli Testnet** - Reactive Network testnet

**Network-Specific Features:**
• **Stop Orders**: Ethereum, Avalanche, Sepolia
• **Aave Protection**: Sepolia (Ethereum & Avalanche coming soon)
• **Fee Collectors**: Coming soon
• **Range Managers**: Coming soon

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

**Testing Recommendation:**
Start with Sepolia to test your automations before mainnet deployment! 🧪

Choose the network that best fits your needs! 🎯`,
      relatedTopics: ['Network costs', 'Cross-chain guide', 'Test on Sepolia']
    }
  },
  
  responseTemplates: {
    welcome: "👋 Welcome to REACTOR! I'm here to help you automate your DeFi strategies. What would you like to do today?",
    
    helpMenu: `I can help you with:
• **Create Automations** - Stop orders, Aave protection, fee collectors, and more
• **Learn About REACTOR** - RSCs, features, and capabilities  
• **Check Blockchain Data** - Balances, pairs, prices, Aave positions
• **Get Technical Help** - Integration and development

**Popular Automations:**
• 🛡️ **Stop Orders** - Protect investments from price drops
• 🏦 **Aave Protection** - Guard against liquidation
• 🔧 **Fee Collectors** - Auto-harvest yields (coming soon)
• 📊 **Range Managers** - Optimize LP positions (coming soon)

What interests you? 🚀`,
    
    errorGeneric: "❌ Oops! Something went wrong. Let's try again or try a different approach.",
    
    notConnected: "🔗 Please connect your wallet first to access this feature!",
    
    comingSoon: "🚧 This feature is coming soon! Stay tuned for updates.",
    
    success: "✅ Success! Your automation is being deployed. You can track its progress in the dashboard.",
    
    aaveProtectionReady: "🎯 **Aave Protection Ready!** Your configuration looks good. Ready to deploy your automated liquidation protection?",
    
    healthFactorExplained: "📊 **Health Factor** is your liquidation safety score. Values above 1.5 are healthy, below 1.0 means liquidation risk!",
    
    aavePositionNotFound: "❌ **No Aave Position Found.** You need an active Aave position to set up liquidation protection. Consider opening a position first!",
    
    invalidHealthFactor: "⚠️ **Invalid Health Factor.** Please enter a value greater than 1.0. Recommended: 1.2-1.3 for trigger, 1.5+ for target.",
    
    protectionStrategiesExplained: "🎯 **Protection Strategies:**\n• **Collateral Deposit**: Add more collateral to improve health factor\n• **Debt Repayment**: Repay debt to reduce risk\n• **Combined**: Use both with your preference order"
  },
  
  routes: {
    stopOrders: '/automations/stop-order',
    aaveProtection: '/automations/aave-protection',
    feeCollectors: '/automations/fee-collector',
    rangeManagers: '/automations/range-manager',
    templates: '/templates',
    deployRsc: '/deploy-reactive-contract',
    getStarted: '/get-started'
  },
  
  // NEW: Aave-specific constants and helpers
  aaveConstants: {
    healthFactorDecimals: 18,
    minimumHealthFactor: 1.0,
    recommendedThreshold: 1.2,
    recommendedTarget: 1.5,
    maxHealthFactor: 10.0,
    
    protectionTypes: {
      COLLATERAL_DEPOSIT: 0,
      DEBT_REPAYMENT: 1,
      COMBINED: 2
    },
    
    supportedAssets: {
      11155111: [ // Sepolia
        'LINK', 'USDC', 'DAI', 'USDT', 'ETH'
      ],
      1: [ // Ethereum Mainnet (when supported)
        'LINK', 'USDC', 'DAI', 'USDT', 'ETH', 'WBTC', 'AAVE', 'UNI'
      ],
      43114: [ // Avalanche (when supported)
        'AVAX', 'USDC', 'DAI', 'USDT', 'ETH', 'WBTC'
      ]
    }
  }
};
