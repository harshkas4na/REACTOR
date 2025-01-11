"use client"

import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BASE_URL } from '@/data/constants'

// Chain ID mapping
// Updated Chain Configuration
const CHAINS = {
    '11155111': {
      id: 11155111,
      name: 'Ethereum Sepolia',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
    },
    '1': {
      id: 1,
      name: 'Ethereum Mainnet',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
    },
    '43114': {
      id: 43114,
      name: 'Avalanche C-Chain',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
    },
    '42161': {
      id: 42161,
      name: 'Arbitrum One',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
    },
    '169': {
      id: 169,
      name: 'Manta Pacific',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
    },
    '8453': {
      id: 8453,
      name: 'Base Chain',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
    },
    '56': {
      id: 56,
      name: 'Binance Smart Chain',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
    },
    '137': {
      id: 137,
      name: 'Polygon PoS',
      hasCallbacks: false,
      isOrigin: true,
      isDestination: false,
    },
    '1101': {
      id: 1101,
      name: 'Polygon zkEVM',
      hasCallbacks: false,
      isOrigin: false,
      isDestination: false,
    },
    '204': {
      id: 204,
      name: 'opBNB Mainnet',
      hasCallbacks: false,
      isOrigin: false,
      isDestination: false,
    },
    '5318008': {
      id: 5318008,
      name: 'Kopli Testnet',
      hasCallbacks: true,
      isOrigin: true,
      isDestination: true,
    }
  };

  const formSchema = z.object({
    originTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
      message: "Invalid transaction hash. Must be 66 characters long and start with 0x.",
    }),
    rscContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
      message: "Invalid contract address. Must be 42 characters long and start with 0x.",
    }),
    targetEventSignature: z.string().min(1, {
      message: "Target event signature is required.",
    }),
    originChain: z.string().min(1, {
      message: "Origin chain is required.",
    }),
    destinationChain: z.string().min(1, {
      message: "Destination chain is required.",
    }),
  });

  export function InputForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
  
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        originTxHash: "",
        rscContractAddress: "",
        targetEventSignature: "",
        originChain: "",
        destinationChain: "",
      },
    });

    const getChainOptions = (role: 'origin' | 'destination') => {
        return Object.entries(CHAINS)
          .filter(([_, chain]) => role === 'origin' ? chain.isOrigin : chain.isDestination)
          .map(([id, chain]) => ({
            value: id,
            label: chain.name,
            hasCallbacks: chain.hasCallbacks
          }));
      };

      const originChainOptions = getChainOptions('origin');
  const destinationChainOptions = getChainOptions('destination');

 
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    // Validate chain callback support
    const originChain = CHAINS[values.originChain as keyof typeof CHAINS];
    const destChain = CHAINS[values.destinationChain as keyof typeof CHAINS];

    if (!originChain || !destChain) {
      setError('Invalid chain selection');
      setIsLoading(false);
      return;
    }

    if (!destChain.hasCallbacks) {
      setError('Destination chain must support callbacks');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/rsc-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originTxHash: values.originTxHash,
          rscAddress: values.rscContractAddress,
          targetEventSignature: values.targetEventSignature,
          originChainId: parseInt(values.originChain),
          destinationChainId: parseInt(values.destinationChain),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to monitor RSC transaction');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Track RSC Transaction</CardTitle>
          <CardDescription>Enter the details of the RSC transaction you want to track.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="originTxHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Transaction Hash</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormDescription>
                      The transaction hash of the origin transaction.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rscContractAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RSC Contract Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormDescription>
                      The address of the RSC contract.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="originChain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin Chain</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select origin chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {originChainOptions.map(({ value, label, hasCallbacks }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center justify-between w-full">
                                <span>{CHAINS[value as keyof typeof CHAINS].name} {label}</span>
                                {hasCallbacks && (
                                  <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                                    Callbacks
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinationChain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Chain</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {destinationChainOptions.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center">
                                <span>{CHAINS[value as keyof typeof CHAINS].name} {label}</span>
                                <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                                  Callbacks
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    form.reset();
                    setError(null);
                    setResult(null);
                  }}
                >
                  Clear Form
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Monitoring...
                    </div>
                  ) : (
                    "Monitor Transaction"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Monitoring Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-50 p-4 rounded overflow-x-auto dark:bg-slate-900 dark:text-slate-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}