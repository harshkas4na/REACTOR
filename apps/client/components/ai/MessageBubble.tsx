import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Sparkles, X, Rocket, ExternalLink, Clock, Copy } from 'lucide-react';
import { FormattedMessage } from './FormattedMessage';
import { PairInfoDisplay } from './PairInfoDisplay';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  automationConfig?: any;
  pairInfo?: any;
  showDeploymentHandler?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isExpanded: boolean;
  showDeploymentHandler: boolean;
  currentDeploymentConfig: any;
  onOptionSelect: (option: { value: string; label: string }) => void;
  onConfirmation: (confirmed: boolean) => void;
  onManualRedirect: (config: any) => void;
  onCopy: (text: string) => void;
  renderDeploymentHandler: (config: any) => React.ReactNode;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isExpanded,
  showDeploymentHandler,
  currentDeploymentConfig,
  onOptionSelect,
  onConfirmation,
  onManualRedirect,
  onCopy,
  renderDeploymentHandler
}) => {
  const isUser = message.type === 'user';
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 ${isExpanded ? 'max-w-[90%]' : 'max-w-[85%]'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 ml-2' 
            : 'bg-gradient-to-r from-gray-700 to-gray-600 mr-2'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-300" />
          )}
        </div>
        <div className={`rounded-2xl px-4 py-3 ${isUser 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
          : 'bg-gradient-to-r from-gray-800 to-gray-750 text-gray-100 border border-gray-600/50'
        }`}>
          <FormattedMessage content={message.content} />
          {!isUser && message.pairInfo && (
            <PairInfoDisplay pairInfo={message.pairInfo} />
          )}
          {!isUser && message.options && (
            <div className="mt-4 space-y-2">
              <div className="text-xs text-gray-400 mb-2">Choose an option:</div>
              {message.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left bg-gray-700/50 border-gray-600 hover:bg-gray-600/70 text-gray-100 transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => onOptionSelect(option)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
          {!isUser && message.inputType === 'confirmation' && message.automationConfig && (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-gray-400 mb-2">Ready to proceed?</div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => onConfirmation(true)}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 hover:bg-gray-700/50 transition-all duration-200"
                  onClick={() => onConfirmation(false)}
                >
                  <X className="w-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30 transition-all duration-200"
                onClick={() => onManualRedirect(message.automationConfig)}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Use Manual Interface Instead
              </Button>
            </div>
          )}
          {!isUser && message.showDeploymentHandler && showDeploymentHandler && currentDeploymentConfig && (
            <div className="mt-4">
              {renderDeploymentHandler(currentDeploymentConfig)}
            </div>
          )}
          <div className="mt-2 text-xs opacity-60 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble; 