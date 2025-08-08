"use client"
import React from 'react'

export const ReactorBackground = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(59,130,246,0.12),transparent),radial-gradient(1000px_500px_at_100%_0%,rgba(139,92,246,0.12),transparent),linear-gradient(to_bottom,#0a0b1e_0%,#0b0c25_40%,#0b0b2e_100%)]" />

      {/* Subtle grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="fade" cx="50%" cy="0%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#fade)" />
      </svg>

      {/* Animated orbs */}
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/10 blur-3xl animate-[float_16s_ease-in-out_infinite]" />
      <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-400/10 blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
      <div className="absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-400/10 blur-3xl animate-[float_20s_ease-in-out_infinite_4s]" />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(-12px) translateX(6px) scale(1.02); }
        }
      `}</style>
    </div>
  )
}

export default ReactorBackground