'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Star, Menu } from "lucide-react"
import Link from "next/link"

export function LandingPageComponent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const features = [
    { title: "Automation", description: "Streamline your workflows with our powerful automation tools." },
    { title: "Integration", description: "Seamlessly connect with your existing tech stack." },
    { title: "Analytics", description: "Gain insights with our advanced analytics capabilities." },
    { title: "Scalability", description: "Grow your operations without worrying about infrastructure." },
  ]

  const testimonials = [
    { name: "John Doe", role: "CEO, TechCorp", content: "This solution has revolutionized our business processes." },
    { name: "Jane Smith", role: "CTO, InnovateCo", content: "The automation capabilities are truly game-changing." },
    { name: "Alex Johnson", role: "Founder, StartupX", content: "We've seen a 50% increase in productivity since implementing this." },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary">Logo</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="#" className="text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium">
                Home
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium">
                Features
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium">
                Testimonials
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium">
                Contact
              </Link>
            </div>
            <div className="sm:hidden flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link href="#" className="text-gray-900 block px-3 py-2 text-base font-medium">
                Home
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 block px-3 py-2 text-base font-medium">
                Features
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 block px-3 py-2 text-base font-medium">
                Testimonials
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 block px-3 py-2 text-base font-medium">
                Contact
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-foreground text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold animate-fade-in-up">
              You Think, We Automate
            </h1>
            <p className="mt-3 max-w-md mx-auto text-xl sm:text-2xl md:mt-5 md:max-w-3xl animate-fade-in-up animation-delay-300">
              A tech that works on top of Reactive Network
            </p>
            <div className="mt-10 flex justify-center space-x-4 animate-fade-in-up animation-delay-600">
             <Link href={"/generate"}>
              <Button size="lg">Get Started</Button>
             </Link> 
              <Button size="lg" variant="outline">Read Docs</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-center mb-12">Our Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-center mb-12 text-gray-900">What Our Clients Say</h2>
          <div className="relative">
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}>
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <Card className="mx-auto max-w-2xl">
                      <CardContent className="text-center py-10">
                        <p className="text-xl mb-6">"{testimonial.content}"</p>
                        <div className="flex justify-center items-center mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" size="icon" className="absolute top-1/2 left-4 transform -translate-y-1/2" onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" className="absolute top-1/2 right-4 transform -translate-y-1/2" onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">Join thousands of satisfied customers and transform your business today.</p>
          <Button size="lg" variant="secondary">Sign Up Now</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About Us</h3>
              <p className="text-sm">We are dedicated to providing cutting-edge automation solutions for businesses of all sizes.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm hover:underline">Home</Link></li>
                <li><Link href="#" className="text-sm hover:underline">Features</Link></li>
                <li><Link href="#" className="text-sm hover:underline">Pricing</Link></li>
                <li><Link href="#" className="text-sm hover:underline">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm hover:underline">Twitter</Link></li>
                <li><Link href="#" className="text-sm hover:underline">LinkedIn</Link></li>
                <li><Link href="#" className="text-sm hover:underline">Facebook</Link></li>
                <li><Link href="#" className="text-sm hover:underline">Instagram</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
              <p className="text-sm mb-4">Stay updated with our latest news and offers.</p>
              <div className="flex">
                <input type="email" placeholder="Enter your email" className="flex-grow px-3 py-2 text-gray-900 rounded-l-md focus:outline-none" />
                <Button className="rounded-l-none">Subscribe</Button>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center">
            <p className="text-sm">&copy; 2023 Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}