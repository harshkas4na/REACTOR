import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Shrink, Expand, Minimize2, Maximize2, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ChatHeaderProps {
  isTyping: boolean;
  account: string | null;
  selectedNetwork: string;
  isExpanded: boolean;
  isMinimized: boolean;
  onExpand: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  isTyping,
  account,
  selectedNetwork,
  isExpanded,
  isMinimized,
  onExpand,
  onMinimize,
  onClose
}) => (
  <CardHeader className="pb-3 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-750/80">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center relative">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <CardTitle className="text-gray-100 text-base">Reactor AI</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">
              {isTyping ? 'Thinking...' : 'Online'}
            </span>
            {account && (
              <Badge variant="secondary" className="text-xs bg-blue-600/20 text-blue-300">
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          onClick={onExpand}
          title={isExpanded ? "Shrink window" : "Expand window"}
        >
          {isExpanded ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          onClick={onMinimize}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </CardHeader>
);

export default ChatHeader; 