import React from 'react';
import MessageBubble from './MessageBubble';

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

interface MessageListProps {
  messages: Message[];
  isExpanded: boolean;
  showDeploymentHandler: boolean;
  currentDeploymentConfig: any;
  onOptionSelect: (option: { value: string; label: string }) => void;
  onConfirmation: (confirmed: boolean) => void;
  onManualRedirect: (config: any) => void;
  onCopy: (text: string) => void;
  renderDeploymentHandler: (config: any) => React.ReactNode;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isExpanded,
  showDeploymentHandler,
  currentDeploymentConfig,
  onOptionSelect,
  onConfirmation,
  onManualRedirect,
  onCopy,
  renderDeploymentHandler
}) => (
  <>
    {messages.map((message) => (
      <MessageBubble
        key={message.id}
        message={message}
        isExpanded={isExpanded}
        showDeploymentHandler={showDeploymentHandler}
        currentDeploymentConfig={currentDeploymentConfig}
        onOptionSelect={onOptionSelect}
        onConfirmation={onConfirmation}
        onManualRedirect={onManualRedirect}
        onCopy={onCopy}
        renderDeploymentHandler={renderDeploymentHandler}
      />
    ))}
  </>
);

export default MessageList; 