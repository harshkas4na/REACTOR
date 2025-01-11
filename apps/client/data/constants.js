

export const NAVIGATION_ITEMS = [
    { label: 'Home', path: '/' },
    { label: 'Templates', path: '/templates' },
    { label: 'Deploy RSC', path: '/deploy-reactive-contract' },
    { label: 'Dapp-Automation', path: '/dapp-automation' }
  ]

export const FEATURES = [
    { title: "Automation", description: "Streamline your workflows with our powerful automation tools." },
    { title: "Integration", description: "Seamlessly connect with your existing tech stack." },
    { title: "Analytics", description: "Gain insights with our advanced analytics capabilities." },
    { title: "Scalability", description: "Grow your operations without worrying about infrastructure." },
    // ... other features
]

export const TESTIMONIALS = [
    { name: "John Doe", role: "CEO, TechCorp", content: "This solution has revolutionized our business processes." },
    { name: "Jane Smith", role: "CTO, InnovateCo", content: "The automation capabilities are truly game-changing." },
    { name: "Alex Johnson", role: "Founder, StartupX", content: "We've seen a 50% increase in productivity since implementing this." },
  ]


  export const API_ENDPOINTS = {
    GENERATE_CONTRACT: 'http://localhost:5000/generateSC'
  }

  export const TEMPLATE_CARDS = [
    {
      title: "Smart Contracts Library",
      description: "Provide a library of pre-built RSC templates for common use cases. Users could choose a template, customize it with parameters like wallet addresses, token types, or conditions, and deploy without needing to modify the underlying code.",
      features: {
        title: "Use Cases Examples:",
        items: [
          "Multi-signature wallets",
          "Subscription services",
          "Escrow services"
        ]
      },
      links: {
        primary: {
          href: "/templates/SmartContracts",
          text: "See All Templates"
        },
        secondary: {
          href: "/templates/SmartContracts/contribute",
          text: "Contribute"
        }
      },
      image: {
        src: "/solidity.jpg",
        alt: "DApp Library"
      }
    },
    {
      title: "DApp Library",
      description: "Offer templates that integrate with common decentralized applications (e.g., Uniswap, Compound). Users can input parameters to automate actions on these dApps without modifying their code.",
      features: {
        title: "Features:",
        items: [
          "Pre-built dApp Integrations",
          "Trigger Automation for Specific Use Cases"
        ]
      },
      additionalInfo: "Automate RSCs for actions like swapping tokens on Uniswap after a certain threshold or automating yield farming operations based on specific market conditions.",
      links: {
        primary: {
          href: "/templates/DappLibrary",
          text: "See All Templates"
        },
        secondary: {
          href: "/templates/DappLibrary/contribute",
          text: "Contribute"
        }
      },
      image: {
        src: "/DApp.jpg",
        alt: "Templates for Common dApps"
      }
    }
  ];


  //Base URL for the API
  export const BASE_URL = 'http://localhost:5000'
