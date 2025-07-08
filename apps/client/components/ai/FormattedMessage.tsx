import React from 'react';

export const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
      return (
        <div key={lineIndex} className={lineIndex > 0 ? 'mt-1' : ''}>
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIndex} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
              return (
                <em key={partIndex} className="italic">
                  {part.slice(1, -1)}
                </em>
              );
            } else if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={partIndex} className="bg-gray-700 px-1 py-0.5 rounded text-blue-300 font-mono text-xs">
                  {part.slice(1, -1)}
                </code>
              );
            } else {
              return <span key={partIndex}>{part}</span>;
            }
          })}
        </div>
      );
    });
  };
  return <div className="text-sm leading-relaxed">{formatText(content)}</div>;
}; 