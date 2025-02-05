"use client";
import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { CodeBracketIcon } from '@heroicons/react/24/solid';

const DeveloperCTA = () => {
  return (
    <section className="py-16 sm:py-20 my-12 sm:my-20 relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg"></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-25"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center px-4 sm:px-6"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white">
          Build the Future of DeFi Automation
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-zinc-200">
          Harness the power of Reactive Smart Contracts to create seamless, cross-chain DeFi automations. Join developers building the next generation of DeFi infrastructure.
          </p>
          <Button
            as={Link}
            href="/get-started"
            color='primary'
            size="lg"
            startContent={<CodeBracketIcon className="h-5 w-5" />}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-md sm:w-auto"
          >
           {' '} Start Building
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default DeveloperCTA;