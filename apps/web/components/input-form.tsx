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
})

export function InputForm() {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originTxHash: "",
      rscContractAddress: "",
      targetEventSignature: "",
      originChain: "",
      destinationChain: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    // TODO: Implement form submission logic
    console.log(values)
    setTimeout(() => setIsLoading(false), 2000) // Simulating API call
  }

  return (
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
            <FormField
              control={form.control}
              name="targetEventSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Event Signature</FormLabel>
                  <FormControl>
                    <Input placeholder="event Transfer(address indexed from, address indexed to, uint256 value)" {...field} />
                  </FormControl>
                  <FormDescription>
                    The signature of the target event.
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
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="optimism">Optimism</SelectItem>
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
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="optimism">Optimism</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Clear Form
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

