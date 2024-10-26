"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';

export function UseCaseHeader() {
  return (
    <Link href="/templates/SmartContracts">
      <Button variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Use Cases
      </Button>
    </Link>
  );
}