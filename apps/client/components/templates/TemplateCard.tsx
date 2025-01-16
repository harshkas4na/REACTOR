"use client";
import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import type { TemplateCard as TemplateCardType } from '@/types/templates'

interface TemplateCardProps {
  data: TemplateCardType;
  index: number;
}

export default function TemplateCard({ data, index }: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="relative z-10"
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="relative z-20 h-full pointer-events-auto"
      >
        <Card className="relative h-full flex flex-col bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 overflow-hidden">
          <div className="relative h-48 overflow-hidden">
            <Image
              src={data.image.src}
              alt={data.image.alt}
              layout="fill"
              objectFit="cover"
              priority={index < 2}
              className="transition-transform duration-300 ease-in-out"
              style={{
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              }}
            />
            <div 
              className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
          
          {/* Content Section */}
          <CardHeader className="relative z-10 p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-zinc-100">
              {data.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative z-10 flex-grow p-4 sm:p-6 pt-0 sm:pt-0">
            <p className="mb-4 text-sm sm:text-base text-zinc-300">
              {data.description}
            </p>
            <p className="font-semibold text-sm sm:text-base text-zinc-200">
              {data.features.title}
            </p>
            <ul className="list-disc list-inside mb-4 space-y-1 ml-2 text-sm sm:text-base">
              {data.features.items.map((item, i) => (
                <li key={i} className="text-zinc-300">
                  {item}
                </li>
              ))}
            </ul>
            {data.additionalInfo && (
              <p className="text-sm sm:text-base text-zinc-300">
                {data.additionalInfo}
              </p>
            )}
          </CardContent>
          
          {/* Footer Section */}
          <CardFooter className="relative z-10 flex flex-col sm:flex-row gap-2 sm:gap-4 p-4 sm:p-6 mt-auto">
            <Link 
              href={data.links.primary.href}
              className="w-full sm:flex-1"
            >
              <Button 
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-white transition-colors duration-300"
              >
                {data.links.primary.text}
              </Button>
            </Link>
            <Link 
              href={data.links.secondary.href}
              className="w-full sm:flex-1"
            >
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-blue-600 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors duration-300"
              >
                {data.links.secondary.text}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}