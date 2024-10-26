import { UseCase } from "@/types/detail-useCase";
import { Dialog,DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CodeViewDialog({ useCase }: { useCase: UseCase }) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 bg-gray-700 text-gray-200">
            <Code className="h-4 w-4" />
            <span>View Reactive Template</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl bg-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>{useCase.title} - Reactive Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
            <pre className="text-sm text-gray-300">
              <code>{useCase.reactiveTemplate}</code>
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }