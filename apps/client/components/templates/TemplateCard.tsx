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
      whileHover={{ scale: 1.03 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="h-full flex flex-col bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 ">
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <Image
            src={data.image.src}
            alt={data.image.alt}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 ease-in-out"
            style={{
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
        </div>
        
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-100">
            {data.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-grow">
          <p className="mb-4 text-zinc-300">
            {data.description}
          </p>
          <p className="font-semibold text-zinc-200">
            {data.features.title}
          </p>
          <ul className="list-disc list-inside  mb-4 space-y-1">
            {data.features.items.map((item, i) => (
              <li key={i} className="text-zinc-300">
                {item}
              </li>
            ))}
          </ul>
          {data.additionalInfo && (
            <p className="text-zinc-300">
              {data.additionalInfo}
            </p>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Link href={data.links.primary.href}>
            <Button 
              size="sm" 
              color='primary'
              className=" text-white transition-colors duration-300"
            >
              {data.links.primary.text}
            </Button>
          </Link>
          <Link href={data.links.secondary.href}>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-blue-600 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors duration-300"
            >
              {data.links.secondary.text}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}