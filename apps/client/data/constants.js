

  //Base URL for the API
  export const BASE_URL = 'http://localhost:5000'

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
    GENERATE_CONTRACT: `${BASE_URL}/generateSC`
  }

  export const TEMPLATE_CARDS = [
    {
      title: "Smart Contracts Library",
      description: "Explore implementation examples and use cases for Reactive Smart Contracts. Find inspiration for building your own RSC-powered solutions or contribute your ideas to help shape future no-code automations.",
      features: {
        title: "What you'll find:",
        items: [
          "Reference implementations for common RSC patterns",
          "Community-contributed use cases and ideas",
          "Technical documentation and best practices"
        ]
      },
      links: {
        primary: {
          href: "/templates/SmartContracts",
          text: "View Templates"
        },
        secondary: {
          href: "/templates/SmartContracts/contribute",
          text: "Contribute"
        }
      },
      image: {
        src: "/solidity.jpg",
        alt: "RSC Examples"
      }
    },
    {
      title: "DApp Library",
      description: "Discover different approaches to integrating RSCs with popular DeFi protocols. Share your innovative use cases that could become future no-code automations on REACTOR.",
      features: {
        title: "Explore:",
        items: [
          "DeFi automation patterns and examples",
          "Protocol integration templates",
          "Cross-protocol interaction patterns"
        ]
      },
      additionalInfo: "Help us identify valuable automation opportunities by sharing your RSC implementation ideas with the developer community.",
      links: {
        primary: {
          href: "/templates/DappLibrary",
          text: "View Templates"
        },
        secondary: {
          href: "/templates/DappLibrary/contribute",
          text: "Contribute"
        }
      },
      image: {
        src: "/DApp.jpg",
        alt: "DApp Integration Patterns"
      }
    }
  ];

