import { REACTOR_KNOWLEDGE_BASE } from '../config/knowledgeBase';

export interface FAQResult {
  answer: string;
  relatedTopics: string[];
}

export class KnowledgeBaseHelper {
  
  // Search FAQ entries for user questions
  static searchFAQ(message: string): FAQResult | null {
    const lowerMessage = message.toLowerCase().trim();
    
    // Direct FAQ matches
    for (const [key, faq] of Object.entries(REACTOR_KNOWLEDGE_BASE.faq)) {
      if (lowerMessage.includes(key) || 
          key.split(' ').every(word => lowerMessage.includes(word))) {
        return {
          answer: faq.answer,
          relatedTopics: faq.relatedTopics
        };
      }
    }
    
    // Automation-specific questions
    if (this.isQuestionAboutAutomation(lowerMessage)) {
      return this.getAutomationAnswer(lowerMessage);
    }
    
    return null;
  }
  
  // Check if question is about specific REACTOR automations
  static isQuestionAboutAutomation(message: string): boolean {
    const automationKeywords = [
      'fee collector', 'fee collection', 'collect fees', 'harvest fees',
      'range manager', 'range management', 'manage range', 'position management',
      'coming soon', 'future features', 'upcoming automations'
    ];
    
    return automationKeywords.some(keyword => message.includes(keyword));
  }
  
  // Get automation-specific answers
  static getAutomationAnswer(message: string): FAQResult | null {
    const lowerMessage = message.toLowerCase();
    
    // Fee Collector questions
    if (lowerMessage.includes('fee collector') || lowerMessage.includes('collect fees') || lowerMessage.includes('harvest fees')) {
      const feeCollectorInfo = REACTOR_KNOWLEDGE_BASE.automations.FEE_COLLECTOR;
      return {
        answer: `🚧 **Fee Collector Automation - Coming Soon!**\n\n**What it does:**\n${feeCollectorInfo.description}\n\n**Key Features:**\n${feeCollectorInfo.features.map(f => `• ${f}`).join('\n')}\n\n**Supported Networks:**\n${feeCollectorInfo.supportedChains.map(id => `• ${this.getNetworkName(id)}`).join('\n')}\n\n**Status:** ${feeCollectorInfo.costEstimate}\n\n💡 **This will automatically harvest your Uniswap V3 fees and can even compound them back into your positions for maximum efficiency!**\n\nStay tuned for updates! In the meantime, you can create stop orders to protect your investments.`,
        relatedTopics: ['Range Managers', 'Stop Orders', 'Uniswap V3 automation']
      };
    }
    
    // Range Manager questions
    if (lowerMessage.includes('range manager') || lowerMessage.includes('range management') || lowerMessage.includes('manage range')) {
      const rangeManagerInfo = REACTOR_KNOWLEDGE_BASE.automations.RANGE_MANAGER;
      return {
        answer: `🚧 **Range Manager Automation - Coming Soon!**\n\n**What it does:**\n${rangeManagerInfo.description}\n\n**Key Features:**\n${rangeManagerInfo.features.map(f => `• ${f}`).join('\n')}\n\n**Supported Networks:**\n${rangeManagerInfo.supportedChains.map(id => `• ${this.getNetworkName(id)}`).join('\n')}\n\n**Status:** ${rangeManagerInfo.costEstimate}\n\n💡 **This will automatically adjust your Uniswap V3 position ranges based on market conditions to maximize your fee earnings while minimizing impermanent loss!**\n\nStay tuned for updates! In the meantime, you can create stop orders to protect your investments.`,
        relatedTopics: ['Fee Collectors', 'Stop Orders', 'Uniswap V3 automation']
      };
    }
    
    // Coming soon / future features questions
    if (lowerMessage.includes('coming soon') || lowerMessage.includes('future') || lowerMessage.includes('upcoming')) {
      return {
        answer: `🚀 **REACTOR's Upcoming Automations!**\n\n**Currently Available:**\n• ✅ **Stop Orders** - Protect investments from price drops\n\n**Coming Soon:**\n\n🔧 **Fee Collectors**\n• ${REACTOR_KNOWLEDGE_BASE.automations.FEE_COLLECTOR.description}\n• Features: ${REACTOR_KNOWLEDGE_BASE.automations.FEE_COLLECTOR.features.slice(0, 2).join(', ')}\n\n📊 **Range Managers**  \n• ${REACTOR_KNOWLEDGE_BASE.automations.RANGE_MANAGER.description}\n• Features: ${REACTOR_KNOWLEDGE_BASE.automations.RANGE_MANAGER.features.slice(0, 2).join(', ')}\n\n**Networks:** Both will support Ethereum and Avalanche initially\n\n💡 **Want to get started now?** Create a stop order to protect your current investments while we finish building these advanced automations!`,
        relatedTopics: ['Create Stop Order', 'Learn about RSCs', 'View roadmap']
      };
    }
    
    return null;
  }
  
  // Check if question is about Reactive Network
  static isQuestionAboutReactiveNetwork(message: string): boolean {
    const reactiveKeywords = [
      'reactive network', 'reactive chain', 'react token', 'kopli', 
      'rsc network', 'monitoring network', 'automation network'
    ];
    
    return reactiveKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
  
  // Get Reactive Network information
  static getReactiveNetworkInfo() {
    return REACTOR_KNOWLEDGE_BASE.reactiveNetwork.mainnet;
  }
  
  // Check if question is about costs/pricing
  static isQuestionAboutCosts(message: string): boolean {
    const costKeywords = [
      'cost', 'price', 'pricing', 'fee', 'fees', 'how much', 'expensive', 'cheap'
    ];
    
    return costKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
  
  // Get automation information by type
  static getAutomationInfo(type: 'STOP_ORDER' | 'FEE_COLLECTOR' | 'RANGE_MANAGER') {
    return REACTOR_KNOWLEDGE_BASE.automations[type] || null;
  }
  
  // Get network name by chain ID
  static getNetworkName(chainId: number): string {
    const networks = REACTOR_KNOWLEDGE_BASE.networks;
    
    for (const network of Object.values(networks)) {
      if (network.chainId === chainId) {
        return network.name;
      }
    }
    
    return `Network ${chainId}`;
  }
  
  // Get DEX name for network
  static getNetworkDEX(chainId: number): string {
    const networks = REACTOR_KNOWLEDGE_BASE.networks;
    
    for (const network of Object.values(networks)) {
      if (network.chainId === chainId) {
        return network.dex;
      }
    }
    
    return 'Unknown DEX';
  }
  
  // Get platform information
  static getPlatformInfo() {
    return REACTOR_KNOWLEDGE_BASE.platform;
  }
  
  // Search for general platform questions
  static searchPlatformInfo(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Platform overview questions
    if (lowerMessage.includes('what is reactor') || lowerMessage.includes('about reactor')) {
      const platform = REACTOR_KNOWLEDGE_BASE.platform;
      return `**${platform.name}** - ${platform.description}\n\n**Key Features:**\n${platform.features.map(f => `• ${f}`).join('\n')}\n\n**Learn More:**\n• Website: ${platform.website}\n• Documentation: ${platform.documentation}`;
    }
    
    return null;
  }
  
  // Get response templates
  static getResponseTemplate(type: 'welcome' | 'helpMenu' | 'errorGeneric' | 'notConnected' | 'comingSoon' | 'success'): string {
    return REACTOR_KNOWLEDGE_BASE.responseTemplates[type] || '';
  }
  
  // Enhanced search that combines multiple sources
  static enhancedSearch(message: string): { answer: string; source: string } | null {
    // Try FAQ first
    const faqResult = this.searchFAQ(message);
    if (faqResult) {
      return {
        answer: faqResult.answer,
        source: 'faq'
      };
    }
    
    // Try platform info
    const platformResult = this.searchPlatformInfo(message);
    if (platformResult) {
      return {
        answer: platformResult,
        source: 'platform'
      };
    }
    
    // Try automation-specific search
    if (this.isQuestionAboutAutomation(message)) {
      const automationResult = this.getAutomationAnswer(message);
      if (automationResult) {
        return {
          answer: automationResult.answer,
          source: 'automation'
        };
      }
    }
    
    return null;
  }
  
  // Check if message is asking about REACTOR capabilities
  static isAskingAboutCapabilities(message: string): boolean {
    const capabilityKeywords = [
      'what can you do', 'what can reactor do', 'features', 'capabilities',
      'help me', 'how can you help', 'what do you offer'
    ];
    
    return capabilityKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
  
  // Get help menu response
  static getHelpMenuResponse(): string {
    return REACTOR_KNOWLEDGE_BASE.responseTemplates.helpMenu;
  }
}