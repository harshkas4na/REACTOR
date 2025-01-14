"use client";
import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { CodeBracketIcon } from '@heroicons/react/24/solid';

const DeveloperCTA = () => {
  return (
    <section className="py-20 my-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900 opacity-75"></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-25"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Build Custom Automations
          </h2>
          <p className="text-xl mb-8 text-zinc-200">
            Use our RSC technology to create your own automated DeFi solutions
          </p>
          <Button
            as={Link}
            href="/get-started"
            color='primary'
            size="lg"
            startContent={<CodeBracketIcon className="h-5 w-5" />}
          >
            Start Building
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default DeveloperCTA;