'use client';

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Code, BookOpen, ArrowRight } from "lucide-react";
import Link from 'next/link';
import type { UseCase } from '@/types/use-case';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UseCaseToolbarProps {
  useCase: UseCase;
}

export function UseCaseToolbar({ useCase }: UseCaseToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex space-x-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-primary hover:bg-primary/80 text-gray-200"
                >
                  <Code className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-black text-gray-100">
                <DialogHeader>
                  <DialogTitle>{useCase.title} - Reactive Template</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] w-full rounded-md border  p-4 bg-black">
                  <pre className="text-sm text-gray-300">
                    <code>{useCase.reactiveTemplate}</code>
                  </pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Reactive Template</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full transition-all duration-300 hover:bg-primary/80 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-primary text-gray-200"
              onClick={() => window.open(useCase.githubRepo, '_blank')}
            >
              <BookOpen className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View GitHub</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={useCase.type ?`/templates/DappLibrary/use-case/${useCase._id}`:`/templates/SmartContracts/use-case/${useCase._id}`}>
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full transition-all hover:bg-primary/80 duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-primary text-gray-200"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Details</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}