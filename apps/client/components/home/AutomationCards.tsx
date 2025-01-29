"use client";
import React, { useRef, useEffect } from 'react';
import { motion, useAnimation, useInView } from "framer-motion";
import { Card, CardBody, Button, Link } from "@nextui-org/react";
import Image from "next/image";
import { ArrowRightIcon } from '@heroicons/react/24/solid';

const automations = [
  {
    title: "Uniswap Stop Order",
    description: "Automatically sell tokens when they reach a certain price threshold. Set up sophisticated trading strategies with multiple conditions and actions.",
    icon: "/Uniswap-stop-order.jpg",
  },
  // {
  //   title: "Aave Loan Repayment",
  //   description: "Manage your Aave loans with automated repayment triggers. Protect your collateral and optimize your borrowing strategy across multiple markets.",
  //   icon: "/aave-logo.png",
  // },
  // {
  //   title: "Compound Yield Optimizer",
  //   description: "Maximize your yields on Compound with automated supply and borrow position management. React to APY changes and market conditions in real-time.",
  //   icon: "/compound-logo.png",
  // },
];

const AutomationCard = ({ automation, index }: { automation: any, index: number }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 100 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
      }}
      className="w-full mb-8 sm:mb-16"
    >
      <Card 
        className="bg-gradient-to-br w-full min-h-[400px] sm:h-[500px] from-blue-500/10 to-purple-500/10 backdrop-blur-xl border-none shadow-xl hover:shadow-2xl transition-all duration-300"
        isHoverable
      >
        <CardBody className="p-0 h-full">
          <div className="flex flex-col md:flex-row h-full">
            <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-12 flex flex-col justify-between">
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-800 leading-tight">
                  {automation.title}
                </h3>
                <p className="text-base sm:text-lg text-zinc-300 leading-relaxed tracking-wide">
                  {automation.description}
                </p>
              </div>
              <div className="pt-6 sm:pt-8">
                <Link href="/automations/uniswap-stop-order">
                <Button 
                  className="w-full sm:w-48 h-10 sm:h-12 text-base sm:text-lg"
                  color="primary"
                  endContent={<ArrowRightIcon className="h-5 w-5 ml-2" />}
                >
                  Get Started
                </Button>
                  </Link>
              </div>
            </div>
            <div className="w-full md:w-1/2 relative min-h-[200px] md:h-full">
              <Image 
                src={automation.icon} 
                alt={automation.title} 
                layout="fill"
                objectFit="cover"
                className="rounded-b-lg md:rounded-b-none md:rounded-r-lg"
                priority
              />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

const AutomationCards = () => {
  return (
    <section className="py-24" >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-20 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Popular Automations
        </h2>
        <div className="space-y-16">
          {automations.map((automation, index) => (
            <AutomationCard key={index} automation={automation} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AutomationCards;