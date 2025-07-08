import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, BookOpen, Shield, Coins, Rocket } from 'lucide-react';

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
}) => (
  <div className="border-t border-gray-700/50 p-4 bg-gradient-to-r from-gray-900/80 to-gray-850/80">
    <form onSubmit={onSubmit} className="flex space-x-3">
      <Input
        value={inputValue}
        onChange={onInputChange}
        placeholder="Ask me anything about DeFi automation..."
        className="flex-1 bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
        disabled={isLoading}
        maxLength={500}
      />
      <Button
        type="submit"
        size="icon"
        disabled={isLoading || !inputValue.trim()}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
      </Button>
    </form>
    <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
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
          <Badge variant="secondary" className="text-xs bg-blue-600/20 text-blue-300">
            {selectedNetwork}
          </Badge>
        )}
      </div>
      <span className="text-gray-500">
        {inputValue.length}/500
      </span>
    </div>
    <div className="flex space-x-2 mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
        onClick={() => onQuickAction("What is Reactor?")}
      >
        <BookOpen className="w-3 h-3 mr-1" />
        Learn
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
        onClick={() => onQuickAction("Create a stop order")}
      >
        <Shield className="w-3 h-3 mr-1" />
        Protect
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
        onClick={() => onQuickAction("How much ETH do I have?")}
      >
        <Coins className="w-3 h-3 mr-1" />
        Balance
      </Button>
      {currentDeploymentConfig && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-700/30"
          onClick={() => onQuickAction("Deploy my stop order")}
        >
          <Rocket className="w-3 h-3 mr-1" />
          Deploy
        </Button>
      )}
    </div>
  </div>
);

export default ChatInput; 