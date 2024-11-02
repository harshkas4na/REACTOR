'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const CATEGORIES = ['Finance', 'Gaming', 'Social', 'Productivity', 'Marketplace', 'Governance', 'Other']

export default function ContributeDAppPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [url, setUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to your backend
    console.log({ name, description, category, url, imageUrl, details })
    setSubmitted(true)
    // Reset form
    setName('')
    setDescription('')
    setCategory('')
    setUrl('')
    setImageUrl('')
    setDetails('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">Contribute to DApp Library</h1>
        
        {submitted && (
          <Alert className="mb-6 bg-green-800 border-green-600">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertTitle className="text-green-400">Success</AlertTitle>
            <AlertDescription className="text-green-200">
              Your DApp submission has been received successfully. Our team will review it shortly.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-100">Submit a New DApp</CardTitle>
              <CardDescription className="text-gray-400">
                Provide details about the DApp you'd like to add to our library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-200">DApp Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-200">Short Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-200">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="bg-gray-700 text-gray-100 border-gray-600">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 text-gray-100 border-gray-600">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="hover:bg-gray-600">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url" className="text-gray-200">DApp URL</Label>
                <Input 
                  id="url" 
                  type="url"
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  required 
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-gray-200">Logo Image URL</Label>
                <Input 
                  id="imageUrl" 
                  type="url"
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                  required 
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="details" className="text-gray-200">Detailed Description</Label>
                <Textarea 
                  id="details" 
                  value={details} 
                  onChange={(e) => setDetails(e.target.value)} 
                  required 
                  className="bg-gray-700 text-gray-100 border-gray-600"
                  rows={5}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Submit DApp
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}