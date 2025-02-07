"use client"
import React from 'react';

export const ReactorBackground = () => {
  return (
    <>
      {/* Enhanced gradient background with deep blue */}
      <div className="absolute inset-0 bg-gradient-radial from-[#5d6ec4] via-[#1b2b6e] to-[#1f358f] opacity-90" />
      
      {/* Enhanced cloud layers with blue tints */}
      <div className="absolute inset-0">
        {/* Primary rotating gradient with blue */}
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(51,147,255,0.15),transparent_120deg)] animate-rotate-slow" />
        
        {/* Enhanced cloud effect with blue mix */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(92,138,252,0.2),transparent_60%)] blur-lg " />
        
        {/* Additional subtle blue gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(97,123,255,0.1),transparent_50%)] " />
      </div>

      {/* Lightning effects with blue tint */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3380FF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#5C8BF6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#B5C4FD" stopOpacity="0.3" />
            </linearGradient>
            
            <filter id="lightning-glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#lightning-glow)">
            <path
              className="animate-lightning-primary"
              d="M300,0 L350,100 L300,200 L400,350"
              stroke="url(#lightning-gradient)"
              strokeWidth="3"
              fill="none"
            />
            
            <path
              className="animate-lightning-secondary-0"
              d="M200,0 L220,150 L180,300"
              stroke="url(#lightning-gradient)"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
            <path
              className="animate-lightning-secondary-0"
              d="M100,0 L120,120 L300,400"
              stroke="url(#lightning-gradient)"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        .animate-rotate-slow {
          animation: rotate 20s linear infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }
        
        .animate-clouds-slow {
          animation: drift 15s ease-in-out infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .animate-pulse-slow {
          animation: pulse 10s ease-in-out infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(5%, 5%); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }

        .animate-lightning-primary {
          animation: flash 5s infinite;
        }

        .animate-lightning-secondary-0 {
          animation: flash 5s infinite 0.5s;
        }

        @keyframes flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.3; }
          52% { opacity: 0.8; }
          54% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
};

export default ReactorBackground;