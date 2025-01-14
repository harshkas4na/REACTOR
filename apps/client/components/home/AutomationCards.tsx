"use client";
import React, { useRef, useEffect } from 'react';
import { motion, useAnimation, useInView } from "framer-motion";
import { Card, CardBody, Button } from "@nextui-org/react";
import Image from "next/image";
import { ArrowRightIcon } from '@heroicons/react/24/solid';

const automations = [
  {
    title: "Uniswap Stop Order",
    description: "Automatically sell tokens when they reach a certain price threshold. Set up sophisticated trading strategies with multiple conditions and actions.",
    icon: "/Uniswap-stop-order.jpg",
  },
  {
    title: "Aave Loan Repayment",
    description: "Manage your Aave loans with automated repayment triggers. Protect your collateral and optimize your borrowing strategy across multiple markets.",
    icon: "/aave-logo.png",
  },
  {
    title: "Compound Yield Optimizer",
    description: "Maximize your yields on Compound with automated supply and borrow position management. React to APY changes and market conditions in real-time.",
    icon: "/compound-logo.png",
  },
];

const AutomationCard = ({ automation, index }: { automation: any, index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 100 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
      }}
      className="w-full mb-16"
    >
      <Card 
        className="bg-gradient-to-br w-full h-[500px] from-blue-500/10 to-purple-500/10 backdrop-blur-xl border-none shadow-xl hover:shadow-2xl transition-all duration-300"
        isHoverable
      >
        <CardBody className="p-0 h-full">
          <div className="flex flex-col md:flex-row h-full">
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-800 leading-tight">
                  {automation.title}
                </h3>
                <p className="text-lg text-zinc-300 leading-relaxed tracking-wide">
                  {automation.description}
                </p>
              </div>
              <div className="pt-8">
                <Button 
                  className="w-48 h-12 text-lg"
                  color="primary"
                  endContent={<ArrowRightIcon className="h-5 w-5 ml-2" />}
                >
                  Get Started
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 relative h-full">
              <Image 
                src={automation.icon} 
                alt={automation.title} 
                layout="fill"
                objectFit="cover"
                className="rounded-r-lg"
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
    <section className="py-24">
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