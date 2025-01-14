import React from 'react';

export const ReactorBackground = () => {
  return (
    <>
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-[#0B0B2E] via-[#1B1B4E] to-[#1F1F63] opacity-90" />
      
      {/* Enhanced Cloud layers with blue/purple scheme */}
      <div className="absolute inset-0">
        {/* Cloud layers with adjusted colors */}
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(51,65,255,0.15),transparent_120deg)] animate-rotate-slow" />
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(147,155,255,0.1),transparent_120deg)] animate-rotate-reverse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(92,124,252,0.15),transparent_60%)] blur-xl animate-clouds-slow" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(64,76,183,0.2),transparent_60%)] blur-2xl animate-clouds-reverse" />
      </div>

      {/* Lightning effects with updated colors */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3341FF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#7D8AFF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#AAB6FF" stopOpacity="0.3" />
            </linearGradient>
            
            <filter id="lightning-glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#lightning-glow)">
            <path
              className="animate-lightning-primary"
              d={`M${300 + Math.random() * 200},-10 
                 L${350 + Math.random() * 100},100 
                 L${300 + Math.random() * 100},200 
                 L${400 + Math.random() * 100},350`}
              stroke="url(#lightning-gradient)"
              strokeWidth="3"
              fill="none"
            />
            
            {[...Array(2)].map((_, i) => (
              <path
                key={`bolt-${i}`}
                className={`animate-lightning-secondary-${i}`}
                d={`M${200 + Math.random() * 400},0 
                   L${220 + Math.random() * 360},150 
                   L${180 + Math.random() * 440},300`}
                stroke="url(#lightning-gradient)"
                strokeWidth="2"
                fill="none"
                opacity="0.4"
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Particle effects with updated colors */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className={`absolute w-1 h-1 bg-blue-200 rounded-full animate-particle-${i % 3}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3 + 0.1,
                transform: `scale(${Math.random() * 0.3 + 0.3})`
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};