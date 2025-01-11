'use client'

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
      <Card className="h-full flex flex-col bg-gray-800 border-gray-700">
        <div className="relative h-48 overflow-hidden">
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
        </div>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-100">{data.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="mb-4 text-gray-300">{data.description}</p>
          <p className="font-semibold text-gray-200">{data.features.title}</p>
          <ul className="list-disc list-inside mb-4 text-gray-300">
            {data.features.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          {data.additionalInfo && (
            <p className="text-gray-300">{data.additionalInfo}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href={data.links.primary.href}>
            <Button size="sm" className="bg-primary text-white hover:bg-primary-dark dark:text-gray-900 transition-colors duration-300">
              {data.links.primary.text}
            </Button>
          </Link>
          <Link href={data.links.secondary.href}>
            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary text-white dark:text-gray-900 dark:bg-primary hover:text-white transition-colors duration-300">
              {data.links.secondary.text}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

