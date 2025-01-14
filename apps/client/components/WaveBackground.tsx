import React from 'react';

const WaveBackground = () => {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-[#020B2D]">
      {/* Base gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#020B2D]/80" />
      
      {/* Animated SVG waves */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Gradients */}
            <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4CC9F0" />
              <stop offset="100%" stopColor="#7209B7" />
            </linearGradient>
            <linearGradient id="wave-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4361EE" />
              <stop offset="100%" stopColor="#7209B7" />
            </linearGradient>
            
            {/* Filters for glow effect */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Animated wave paths */}
          <g filter="url(#glow)">
            <path 
              className="animate-wave-slow" 
              fill="url(#wave-gradient-1)"
              d="M0,160 C320,300,420,240,640,160 C880,80,1040,140,1280,220 C1520,300,1680,240,1920,160 V0 H0" 
              opacity="0.3"
            />
            <path 
              className="animate-wave-medium" 
              fill="url(#wave-gradient-2)"
              d="M0,220 C320,300,420,200,640,180 C880,150,1040,220,1280,180 C1520,140,1680,200,1920,180 V0 H0" 
              opacity="0.2"
            />
          </g>
          
          {/* Particle effect overlay */}
          <g className="animate-twinkle">
            {[...Array(50)].map((_, i) => (
              <circle
                key={i}
                cx={Math.random() * 1920}
                cy={Math.random() * 1080}
                r={Math.random() * 2}
                fill="#fff"
                opacity={Math.random() * 0.5 + 0.25}
              />
            ))}
          </g>
        </svg>
      </div>
      
      {/* Cloudy overlay effect */}
      <div className="absolute inset-0 mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-radial from-transparent to-[#020B2D]/40 animate-pulse-slow" />
      </div>
    </div>
  );
};

// Add to your global styles or Tailwind config:
const styles = `
  @keyframes wave-slow {
    0% { transform: translateX(0) translateY(0); }
    50% { transform: translateX(-25px) translateY(15px); }
    100% { transform: translateX(0) translateY(0); }
  }
  
  @keyframes wave-medium {
    0% { transform: translateX(0) translateY(0); }
    50% { transform: translateX(25px) translateY(-15px); }
    100% { transform: translateX(0) translateY(0); }
  }
  
  @keyframes twinkle {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  
  .animate-wave-slow {
    animation: wave-slow 20s ease-in-out infinite;
  }
  
  .animate-wave-medium {
    animation: wave-medium 15s ease-in-out infinite;
  }
  
  .animate-twinkle {
    animation: twinkle 4s ease-in-out infinite;
  }
  
  .animate-pulse-slow {
    animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

export default WaveBackground;