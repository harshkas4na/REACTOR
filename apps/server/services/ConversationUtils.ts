export interface ConversationMetrics {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    averageResponseTime: number;
    topicsDiscussed: string[];
    questionsAsked: string[];
    informationGathered: string[];
    repetitionScore: number;
  }
  
  export interface MessageAnalysis {
    intent: string;
    entities: {
      tokens: string[];
      amounts: string[];
      percentages: number[];
      networks: string[];
    };
    sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated';
    confidence: number;
    isRepetitive: boolean;
    isConfirmation: boolean;
    isQuestion: boolean;
    isCommand: boolean;
  }
  
  export class ConversationUtils {
    
    // Analyze message for intent, entities, and sentiment
    static analyzeMessage(message: string, conversationHistory: Array<{ role: string; content: string }>): MessageAnalysis {
      const lowerMessage = message.toLowerCase();
      
      // Extract entities
      const entities = {
        tokens: this.extractTokens(message),
        amounts: this.extractAmounts(message),
        percentages: this.extractPercentages(message),
        networks: this.extractNetworks(message)
      };
      
      // Determine intent
      const intent = this.determineIntent(lowerMessage);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(lowerMessage);
      
      // Check for repetition
      const isRepetitive = this.isRepetitiveMessage(message, conversationHistory);
      
      // Check message type
      const isConfirmation = this.isConfirmationMessage(lowerMessage);
      const isQuestion = this.isQuestionMessage(lowerMessage);
      const isCommand = this.isCommandMessage(lowerMessage);
      
      // Calculate confidence
      const confidence = this.calculateMessageConfidence(lowerMessage, entities);
      
      return {
        intent,
        entities,
        sentiment,
        confidence,
        isRepetitive,
        isConfirmation,
        isQuestion,
        isCommand
      };
    }
    
    // Extract token symbols from message
    private static extractTokens(message: string): string[] {
      const tokenPattern = /\b(ETH|BTC|USDC|USDT|DAI|WBTC|AVAX|ETHEREUM|BITCOIN)\b/gi;
      const matches = message.match(tokenPattern) || [];
      
      // Normalize token names
      return matches.map(token => {
        const normalized = token.toUpperCase();
        if (normalized === 'ETHEREUM') return 'ETH';
        if (normalized === 'BITCOIN') return 'BTC';
        return normalized;
      }).filter((token, index, array) => array.indexOf(token) === index); // Remove duplicates
    }
    
    // Extract amount values from message
    private static extractAmounts(message: string): string[] {
      const amounts: string[] = [];
      
      // Patterns for different amount formats
      const patterns = [
        /\b(\d+(?:\.\d+)?)\s*(?:tokens?|coins?|eth|usdc|usdt|dai|btc)\b/gi,
        /\ball\s+(?:of\s+)?(?:my\s+)?(?:them|it|\w+)?\b/gi,
        /\beverything\b/gi,
        /\bhalf\s+(?:of\s+)?(?:my\s+)?(?:them|it|\w+)?\b/gi,
        /\b(\d+(?:\.\d+)?)\s*%\b/gi
      ];
      
      for (const pattern of patterns) {
        const matches = message.match(pattern);
        if (matches) {
          amounts.push(...matches.map(match => match.trim()));
        }
      }
      
      return amounts.filter((amount, index, array) => array.indexOf(amount) === index);
    }
    
    // Extract percentage values from message
    private static extractPercentages(message: string): number[] {
      const percentagePattern = /\b(\d+(?:\.\d+)?)\s*%/g;
      const matches = [];
      let match;
      
      while ((match = percentagePattern.exec(message)) !== null) {
        matches.push(parseFloat(match[1]));
      }
      
      return matches;
    }
    
    // Extract network mentions from message
    private static extractNetworks(message: string): string[] {
      const networks: string[] = [];
      const lowerMessage = message.toLowerCase();
      
      const networkMappings = {
        'ethereum': 'ETHEREUM',
        'eth': 'ETHEREUM',
        'mainnet': 'ETHEREUM',
        'avalanche': 'AVALANCHE',
        'avax': 'AVALANCHE',
        'sepolia': 'SEPOLIA',
        'testnet': 'SEPOLIA'
      };
      
      for (const [keyword, network] of Object.entries(networkMappings)) {
        if (lowerMessage.includes(keyword)) {
          networks.push(network);
        }
      }
      
      return networks.filter((network, index, array) => array.indexOf(network) === index);
    }
    
    // Determine primary intent from message
    private static determineIntent(lowerMessage: string): string {
      const intentPatterns = [
        { 
          intent: 'CREATE_STOP_ORDER', 
          patterns: [
            'stop order', 'protect', 'sell when', 'automation', 'stop loss', 'limit order',
            'create automation', 'set up protection', 'automate sell', 'trigger sell',
            'sell if price drops', 'liquidate when', 'exit position', 'risk management',
            'price alert', 'automatic sell', 'conditional sell', 'stop trading',
            'protect my position', 'secure profits', 'cut losses', 'emergency sell',
            'reactive contract', 'smart contract automation', 'defi automation'
          ]
        },
        { 
          intent: 'CHECK_BALANCE', 
          patterns: [
            'balance', 'how much', 'how many', 'now', 'current balance', 'wallet balance',
            'token balance', 'my tokens', 'holdings', 'portfolio', 'assets',
            'check wallet', 'show balance', 'what do i have', 'my funds',
            'available tokens', 'token amount', 'eth balance', 'usdc balance',
            'current holdings', 'wallet contents', 'my cryptocurrency', 'coin balance'
          ]
        },
        { 
          intent: 'FIND_PAIR', 
          patterns: [
            'pair', 'find pair', 'trading pair', 'and', 'liquidity pair', 'swap pair',
            'token pair', 'dex pair', 'uniswap pair', 'exchange pair', 'market pair',
            'trading market', 'where to trade', 'available pairs', 'pair address',
            'pool address', 'liquidity pool', 'amm pair', 'decentralized exchange',
            'find market', 'trading route', 'swap route', 'pair contract'
          ]
        },
        { 
          intent: 'ASK_QUESTION', 
          patterns: [
            'what is', 'how does', 'explain', 'tell me', 'what are', 'how do',
            'can you explain', 'help me understand', 'what does this mean',
            'how to', 'why', 'when should', 'which', 'where can',
            'what happens', 'how works', 'difference between', 'benefits of',
            'risks of', 'gas fees', 'transaction cost', 'slippage',
            'impermanent loss', 'yield farming', 'staking', 'defi',
            'smart contracts', 'blockchain', 'ethereum', 'avalanche'
          ]
        },
        { 
          intent: 'CONFIRM', 
          patterns: [
            'yes', 'yep', 'yeah', 'correct', 'right', 'yup', 'sure', 'okay',
            'ok', 'good', 'perfect', 'exactly', 'that\'s right', 'absolutely',
            'confirmed', 'proceed', 'continue', 'go ahead', 'sounds good',
            'looks good', 'i agree', 'affirmative', 'true', 'correct me',
            'deploy', 'execute', 'create it', 'do it', 'make it'
          ]
        },
        { 
          intent: 'DENY', 
          patterns: [
            'no', 'nope', 'wrong', 'incorrect', 'not right', 'false', 'nah',
            'that\'s wrong', 'not correct', 'disagree', 'negative', 'not really',
            'i don\'t think so', 'that\'s not right', 'not what i meant',
            'different', 'change', 'modify', 'not that', 'something else',
            'try again', 'not quite', 'close but not right'
          ]
        },
        { 
          intent: 'CANCEL', 
          patterns: [
            'cancel', 'stop', 'nevermind', 'abort', 'quit', 'exit', 'back',
            'forget it', 'don\'t do it', 'halt', 'end', 'terminate',
            'go back', 'start over', 'restart', 'reset', 'undo',
            'don\'t proceed', 'not now', 'maybe later', 'skip this',
            'i changed my mind', 'let\'s not do this', 'abandon'
          ]
        }
      ];
      
      for (const { intent, patterns } of intentPatterns) {
        if (patterns.some(pattern => lowerMessage.includes(pattern))) {
          return intent;
        }
      }
      
      return 'UNKNOWN';
    }
    
    // Analyze sentiment of message
    private static analyzeSentiment(lowerMessage: string): 'positive' | 'negative' | 'neutral' | 'frustrated' {
      const positiveWords = ['good', 'great', 'excellent', 'perfect', 'yes', 'correct', 'right', 'awesome'];
      const negativeWords = ['bad', 'wrong', 'error', 'problem', 'issue', 'no', 'incorrect'];
      const frustratedWords = ['again', 'already', 'told you', 'said', 'keep asking', 'repeat'];
      
      const positiveScore = positiveWords.filter(word => lowerMessage.includes(word)).length;
      const negativeScore = negativeWords.filter(word => lowerMessage.includes(word)).length;
      const frustratedScore = frustratedWords.filter(word => lowerMessage.includes(word)).length;
      
      if (frustratedScore > 0) return 'frustrated';
      if (positiveScore > negativeScore) return 'positive';
      if (negativeScore > positiveScore) return 'negative';
      return 'neutral';
    }
    
    // Check if message is repetitive based on conversation history
    private static isRepetitiveMessage(message: string, conversationHistory: Array<{ role: string; content: string }>): boolean {
      const recentUserMessages = conversationHistory
        .filter(msg => msg.role === 'user')
        .slice(-3) // Check last 3 user messages
        .map(msg => msg.content.toLowerCase());
      
      const currentMessage = message.toLowerCase();
      
      // Check for exact matches
      if (recentUserMessages.includes(currentMessage)) {
        return true;
      }
      
      // Check for similar content (more than 70% similarity)
      for (const oldMessage of recentUserMessages) {
        const similarity = this.calculateSimilarity(currentMessage, oldMessage);
        if (similarity > 0.7) {
          return true;
        }
      }
      
      return false;
    }
    
    // Calculate similarity between two strings
    private static calculateSimilarity(str1: string, str2: string): number {
      const words1 = str1.split(/\s+/);
      const words2 = str2.split(/\s+/);
      
      const allWords = new Set([...words1, ...words2]);
      const commonWords = words1.filter(word => words2.includes(word));
      
      return commonWords.length / allWords.size;
    }
    
    // Check if message is a confirmation
    private static isConfirmationMessage(lowerMessage: string): boolean {
      const confirmationPatterns = [
        /^(yes|yep|yeah|yup|correct|right|true)$/,
        /that\'?s?\s*(correct|right|good)/,
        /^(ok|okay)$/
      ];
      
      return confirmationPatterns.some(pattern => pattern.test(lowerMessage));
    }
    
    // Check if message is a question
    private static isQuestionMessage(lowerMessage: string): boolean {
      return lowerMessage.includes('?') || 
             lowerMessage.startsWith('what') ||
             lowerMessage.startsWith('how') ||
             lowerMessage.startsWith('why') ||
             lowerMessage.startsWith('when') ||
             lowerMessage.startsWith('where') ||
             lowerMessage.startsWith('can you') ||
             lowerMessage.startsWith('do you');
    }
    
    // Check if message is a command
    private static isCommandMessage(lowerMessage: string): boolean {
      const commandStarters = [
        'create', 'make', 'build', 'deploy', 'start', 'begin',
        'find', 'get', 'fetch', 'check', 'show', 'tell'
      ];
      
      return commandStarters.some(starter => lowerMessage.startsWith(starter));
    }
    
    // Calculate confidence of message interpretation
    private static calculateMessageConfidence(lowerMessage: string, entities: any): number {
      let confidence = 50; // Base confidence
      
      // Increase confidence for clear entities
      if (entities.tokens.length > 0) confidence += 20;
      if (entities.amounts.length > 0) confidence += 15;
      if (entities.percentages.length > 0) confidence += 15;
      if (entities.networks.length > 0) confidence += 10;
      
      // Increase confidence for clear intent indicators
      if (lowerMessage.includes('stop order')) confidence += 20;
      if (lowerMessage.includes('protect')) confidence += 15;
      if (lowerMessage.includes('sell when')) confidence += 15;
      
      // Decrease confidence for vague language
      if (lowerMessage.includes('maybe') || lowerMessage.includes('i think')) confidence -= 10;
      if (lowerMessage.includes('not sure')) confidence -= 20;
      
      return Math.min(100, Math.max(0, confidence));
    }
    
    // Generate conversation metrics
    static generateConversationMetrics(conversationHistory: Array<{ role: string; content: string }>): ConversationMetrics {
      const userMessages = conversationHistory.filter(msg => msg.role === 'user');
      const aiMessages = conversationHistory.filter(msg => msg.role === 'assistant');
      
      // Calculate topics discussed
      const topicsDiscussed = new Set<string>();
      const questionsAsked = new Set<string>();
      const informationGathered = new Set<string>();
      
      for (const message of conversationHistory) {
        const analysis = this.analyzeMessage(message.content, conversationHistory);
        
        if (analysis.intent !== 'UNKNOWN') {
          topicsDiscussed.add(analysis.intent);
        }
        
        if (message.role === 'assistant' && analysis.isQuestion) {
          questionsAsked.add(message.content.substring(0, 50) + '...');
        }
        
        if (message.role === 'user') {
          analysis.entities.tokens.forEach(token => informationGathered.add(`token:${token}`));
          analysis.entities.amounts.forEach(amount => informationGathered.add(`amount:${amount}`));
          analysis.entities.percentages.forEach(pct => informationGathered.add(`percentage:${pct}`));
        }
      }
      
      // Calculate repetition score
      const repetitionScore = this.calculateRepetitionScore(conversationHistory);
      
      return {
        totalMessages: conversationHistory.length,
        userMessages: userMessages.length,
        aiMessages: aiMessages.length,
        averageResponseTime: 0, // Would need timestamps to calculate
        topicsDiscussed: Array.from(topicsDiscussed),
        questionsAsked: Array.from(questionsAsked),
        informationGathered: Array.from(informationGathered),
        repetitionScore
      };
    }
    
    // Calculate how repetitive the conversation is
    private static calculateRepetitionScore(conversationHistory: Array<{ role: string; content: string }>): number {
      if (conversationHistory.length < 4) return 0;
      
      const aiMessages = conversationHistory.filter(msg => msg.role === 'assistant');
      let repetitiveCount = 0;
      
      for (let i = 1; i < aiMessages.length; i++) {
        const currentMessage = aiMessages[i].content.toLowerCase();
        const previousMessage = aiMessages[i - 1].content.toLowerCase();
        
        const similarity = this.calculateSimilarity(currentMessage, previousMessage);
        if (similarity > 0.6) {
          repetitiveCount++;
        }
      }
      
      return (repetitiveCount / Math.max(1, aiMessages.length - 1)) * 100;
    }
    
    // Suggest next actions based on conversation state
    static suggestNextActions(collectedData: any, conversationMetrics: ConversationMetrics): string[] {
      const suggestions: string[] = [];
      
      // Check if conversation is getting repetitive
      if (conversationMetrics.repetitionScore > 30) {
        suggestions.push('RESET_CONVERSATION');
        suggestions.push('SUMMARIZE_PROGRESS');
      }
      
      // Check if we have enough information
      const requiredFields = ['tokenToSell', 'tokenToBuy', 'amount', 'dropPercentage'];
      const missingFields = requiredFields.filter(field => !collectedData[field]);
      
      if (missingFields.length === 0) {
        suggestions.push('PROCEED_TO_CONFIGURATION');
      } else if (missingFields.length === 1) {
        suggestions.push('ASK_FOR_MISSING_INFO');
      } else {
        suggestions.push('GUIDE_STEP_BY_STEP');
      }
      
      // Check if user seems frustrated
      const recentUserMessages = conversationMetrics.informationGathered;
      if (recentUserMessages.length > 5 && missingFields.length > 2) {
        suggestions.push('OFFER_MANUAL_INTERFACE');
      }
      
      return suggestions;
    }
    
    // Generate a conversation summary
    static generateConversationSummary(collectedData: any, conversationHistory: Array<{ role: string; content: string }>): string {
      const metrics = this.generateConversationMetrics(conversationHistory);
      
      let summary = "**Conversation Summary:**\n\n";
      
      // Progress overview
      const requiredFields = ['tokenToSell', 'tokenToBuy', 'amount', 'dropPercentage'];
      const completedFields = requiredFields.filter(field => collectedData[field]);
      
      summary += `**Progress:** ${completedFields.length}/${requiredFields.length} fields completed\n`;
      
      if (collectedData.tokenToSell) summary += `• Token to sell: ${collectedData.tokenToSell}\n`;
      if (collectedData.tokenToBuy) summary += `• Token to buy: ${collectedData.tokenToBuy}\n`;
      if (collectedData.amount) summary += `• Amount: ${collectedData.amount}\n`;
      if (collectedData.dropPercentage) summary += `• Drop trigger: ${collectedData.dropPercentage}%\n`;
      
      // Conversation health
      if (metrics.repetitionScore > 30) {
        summary += `\n⚠️ **Note:** Conversation seems repetitive (${metrics.repetitionScore.toFixed(0)}% repetition)\n`;
      }
      
      return summary;
    }
    
    // Check if conversation needs intervention
    static needsIntervention(conversationHistory: Array<{ role: string; content: string }>): {
      needsIntervention: boolean;
      reason: string;
      suggestedAction: string;
    } {
      const metrics = this.generateConversationMetrics(conversationHistory);
      
      // Too many messages without progress
      if (metrics.totalMessages > 15 && metrics.informationGathered.length < 3) {
        return {
          needsIntervention: true,
          reason: 'Too many messages with little progress',
          suggestedAction: 'OFFER_MANUAL_INTERFACE'
        };
      }
      
      // High repetition score
      if (metrics.repetitionScore > 50) {
        return {
          needsIntervention: true,
          reason: 'Conversation is highly repetitive',
          suggestedAction: 'RESET_AND_SUMMARIZE'
        };
      }
      
      // Too many questions asked
      if (metrics.questionsAsked.length > 8) {
        return {
          needsIntervention: true,
          reason: 'Too many questions asked',
          suggestedAction: 'PROVIDE_SUMMARY_AND_DIRECT_PATH'
        };
      }
      
      return {
        needsIntervention: false,
        reason: '',
        suggestedAction: ''
      };
    }
  }