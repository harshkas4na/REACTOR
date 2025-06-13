import { REACTOR_KNOWLEDGE_BASE } from '../config/knowledgeBase';
import { AutomationType, NetworkConfig } from '../types/ai';

export class KnowledgeBaseHelper {
  static getAutomationInfo(type: string): AutomationType | undefined {
    return REACTOR_KNOWLEDGE_BASE.automations[type];
  }

  static getNetworkInfo(chainId: number): NetworkConfig | undefined {
    return Object.values(REACTOR_KNOWLEDGE_BASE.networks).find(network => network.chainId === chainId);
  }

  static searchFAQ(query: string): { answer: string; relatedTopics: string[] } | null {
    const lowerQuery = query.toLowerCase();
    const faq = REACTOR_KNOWLEDGE_BASE.faq;
    
    for (const [key, value] of Object.entries(faq)) {
      if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
        return value;
      }
    }
    return null;
  }

  static getResponseTemplate(template: string): string | undefined {
    return REACTOR_KNOWLEDGE_BASE.responseTemplates[template];
  }

  static getRoute(routeName: string): string | undefined {
    return REACTOR_KNOWLEDGE_BASE.routes[routeName];
  }

  static isQuestionAboutReactiveNetwork(message: string): boolean {
    const keywords = ['reactive network', 'reactive blockchain', 'rsc network', 'dev.reactive.network'];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  static isQuestionAboutCosts(message: string): boolean {
    const keywords = ['cost', 'price', 'fee', 'gas', 'expensive', 'cheap', 'funding'];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  static getSupportedNetworksForAutomation(automationType: string): number[] {
    const automation = this.getAutomationInfo(automationType);
    return automation?.supportedChains || [];
  }

  static getAutomationCostEstimate(automationType: string): string | undefined {
    const automation = this.getAutomationInfo(automationType);
    return automation?.costEstimate;
  }

  static getNetworkName(chainId: number): string {
    const network = this.getNetworkInfo(chainId);
    return network?.name || 'Unknown Network';
  }

  static getNetworkCurrency(chainId: number): string {
    const network = this.getNetworkInfo(chainId);
    return network?.currency || 'Unknown';
  }

  static getNetworkDEX(chainId: number): string {
    const network = this.getNetworkInfo(chainId);
    return network?.dex || 'Unknown DEX';
  }

  static isNetworkSupported(chainId: number, automationType: string): boolean {
    const supportedChains = this.getSupportedNetworksForAutomation(automationType);
    return supportedChains.includes(chainId);
  }

  static getReactiveNetworkInfo(isMainnet: boolean = true) {
    return isMainnet ? REACTOR_KNOWLEDGE_BASE.reactiveNetwork.mainnet : REACTOR_KNOWLEDGE_BASE.reactiveNetwork.testnet;
  }

  static getPlatformInfo() {
    return REACTOR_KNOWLEDGE_BASE.platform;
  }
} 