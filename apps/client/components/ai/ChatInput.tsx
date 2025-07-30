import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  Shield, 
  Coins, 
  Rocket,
  Zap,
  HelpCircle,
  TrendingDown,
  Heart
} from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  account: string | null;
  selectedNetwork: string;
  onQuickAction: (text: string) => void;
  currentDeploymentConfig: any;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onSubmit,
  isLoading,
  account,
  selectedNetwork,
  onQuickAction,
  currentDeploymentConfig
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Maintain focus on input to prevent scrolling issues
  useEffect(() => {
    if (!isLoading && inputRef.current && document.activeElement !== inputRef.current) {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
    // Keep focus on input after submission
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleQuickAction = (text: string) => {
    onQuickAction(text);
    // Keep focus on input after quick action
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Enhanced quick actions based on context
  const getQuickActions = () => {
    const baseActions = [
      {
        icon: Shield,
        label: "Stop Order",
        text: "Create a stop order",
        color: "text-blue-400 hover:text-blue-300 hover:bg-blue-700/30"
      },
      {
        icon: Heart,
        label: "Liquidation",
        text: "Create Liquidation protection",
        color: "text-purple-400 hover:text-purple-300 hover:bg-purple-700/30"
      },
      {
        icon: BookOpen,
        label: "Learn",
        text: "Tell me about Reactor in detail",
        color: "text-green-400 hover:text-green-300 hover:bg-green-700/30"
      }
    ];

    // Add context-specific actions
    const contextActions = [];

    if (account) {
      contextActions.push({
        icon: Coins,
        label: "Balance",
        text: `Check my token balances on ${selectedNetwork}`,
        color: "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-700/30"
      });
    }

    if (currentDeploymentConfig) {
      contextActions.push({
        icon: Rocket,
        label: "Deploy",
        text: "Deploy my saved automation",
        color: "text-orange-400 hover:text-orange-300 hover:bg-orange-700/30"
      });
    }

    // Additional helpful actions
    const additionalActions = [
      {
        icon: TrendingDown,
        label: "Examples",
        text: "Show me automation examples",
        color: "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-700/30"
      },
      {
        icon: Zap,
        label: "Quick",
        text: "What's the fastest way to protect my investments?",
        color: "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-700/30"
      },
      {
        icon: HelpCircle,
        label: "Help",
        text: "How do I choose the right automation?",
        color: "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
      }
    ];

    // Combine actions based on available space
    const allActions = [...baseActions];
    
    // Return different sets based on screen size or just return first few
    return allActions.slice(0, account ? 6 : 5);
  };

  return (
    <div className="border-t border-border/50 p-4 bg-gradient-to-r from-background/80 to-muted/20">
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={onInputChange}
          placeholder={
            account 
              ? "Ask me anything about DeFi automation..." 
              : "Ask me about REACTOR or connect wallet for automations..."
          }
          className="flex-1 bg-muted/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-200"
          disabled={isLoading}
          maxLength={500}
          autoComplete="off"
          spellCheck="false"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !inputValue.trim()}
          className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            <path d="M22 2L11 13"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
          </svg>
        </Button>
      </form>

      {/* Status and Character Count */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          {account ? (
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Wallet connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-yellow-400" />
              <span>Connect wallet for automations</span>
            </div>
          )}
          {selectedNetwork && (
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
              {selectedNetwork}
            </Badge>
          )}
          
        </div>
        <span className={`text-xs ${inputValue.length > 450 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
          {inputValue.length}/500
        </span>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="flex flex-wrap gap-2 mt-3">
        {getQuickActions().map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className={`text-xs transition-all duration-200 ${action.color}`}
            onClick={() => handleQuickAction(action.text)}
            disabled={isLoading}
          >
            <action.icon className="w-3 h-3 mr-1" />
            {action.label}
          </Button>
        ))}
      </div>

     

      

    </div>
  );
};

export default ChatInput;