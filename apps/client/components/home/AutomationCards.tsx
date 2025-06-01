"use client";
import React from 'react';
import Link from 'next/link';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const automations = [
  {
    title: "Stop Order",
    description: "Automatically sell tokens when they reach your target price threshold.",
    icon: "🛑",
    tooltipContent: "Set price thresholds that trigger automatic sells, helping you secure profits or limit losses without constant market monitoring. Works with Uniswap V2 and pangolin pairs.",
    available: true,
    link: "/automations/stop-order"
  },
  {
    title: "Range Manager",
    description: "Keep your Uniswap V3 positions in optimal fee-generating ranges automatically.",
    icon: "⚙️",
    tooltipContent: "Automatically adjusts your liquidity position ranges when prices move, maintaining optimal fee generation without constant manual rebalancing.",
    available: true,
    link: "/automations/range-manager"
  },
  {
    title: "Fee Collector",
    description: "Automatically collect and deposit earned fees from your Uniswap V3 liquidity positions.",
    icon: "💰",
    tooltipContent: "Register your liquidity positions once, and our system will monitor and collect fees for you, depositing them directly to your wallet without manual intervention.",
    available: true,
    link: "/automations/fee-collector"
  },
  {
    title: "Portfolio Rebalancer",
    description: "Maintain your ideal asset allocation through automated rebalancing.",
    icon: "⚖️",
    tooltipContent: "Keep your portfolio aligned with your investment strategy without manual intervention by automatically executing trades to maintain target allocations.",
    available: false,
    link: "/automations/portfolio-rebalancer"
  }
];

const AutomationCard = ({ automation }:any) => {
  return (
    <Card className="relative bg-[#111827] border-none overflow-hidden shadow-md hover:shadow-lg hover:shadow-blue-900/20 transition-all duration-200 flex flex-col h-full">
      <CardHeader className="flex-none pt-6 pb-2 px-6">
        <div className="text-4xl mb-3">{automation.icon}</div>
        <CardTitle className="text-zinc-100 text-xl font-medium">
          {automation.title}
          <HoverCard>
            <HoverCardTrigger>
              <div className="inline-flex ml-2 bg-blue-900/40 hover:bg-blue-800/60 p-1 rounded-full cursor-help transition-colors align-middle">
                <InformationCircleIcon className="h-4 w-4 text-blue-300" />
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 bg-zinc-800 border border-zinc-700 text-zinc-100 p-4 shadow-xl">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-300">How It Works</h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {automation.tooltipContent}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-6 py-4 flex-grow">
        <p className="text-zinc-400 text-base">
          {automation.description}
        </p>
      </CardContent>
      
      <CardFooter className="px-6 py-4 mt-auto">
        <Link href={automation.available ? automation.link : "#"} className="w-full">
          <Button 
            className={`w-full ${automation.available ? 'bg-primary' : 'bg-zinc-700/50 hover:bg-zinc-700'} text-white`}
            disabled={!automation.available}
          >
            {automation.available ? (
              'Get Started'
            ) : (
              <>Coming Soon <ClockIcon className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </Link>
      </CardFooter>
      
      {!automation.available && (
        <div className="absolute inset-0 bg-zinc-900/70 backdrop-blur-[1px] flex items-center justify-center">
          <span className="text-zinc-100 text-xl font-bold px-4 py-2 bg-zinc-800/80 rounded-md border border-zinc-700">
            Coming Soon
          </span>
        </div>
      )}
    </Card>
  );
};

const AutomationCards = () => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-zinc-100">
          Popular Automations
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {automations.map((automation, index) => (
            <AutomationCard 
              key={index} 
              automation={automation}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AutomationCards;