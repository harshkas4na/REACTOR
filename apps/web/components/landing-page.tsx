'use client';

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Star, Menu, X } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"



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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100">
      {/* Navbar */}
      <motion.nav 
        className="bg-gray-800 shadow-lg z-50 relative"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary">Logo</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {['Home', 'Templates', 'Community', 'Contact'].map((item) => (
                <Link key={item} href={`/${item}`} className="text-gray-300 hover:text-primary py-2 relative group">
                  <span className="relative z-10 px-1 text-sm font-medium transition-colors duration-300 ease-in-out">
                    {item}
                  </span>
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out"></span>
                </Link>
              ))}
            </div>
            <div className="sm:hidden flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-6 w-6 text-gray-300" /> : <Menu className="h-6 w-6 text-gray-300" />}
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <motion.div 
            className="sm:hidden absolute top-16 inset-x-0 bg-gray-800 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {['Home', 'Templates', 'Community', 'Contact'].map((item) => (
                <Link key={item} href={`/${item.toLowerCase()}`} className="text-gray-300 hover:text-primary hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ease-in-out">
                  {item}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </motion.nav>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-gray-800 to-gray-900 text-white py-24 sm:py-32 overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 opacity-75"></div>
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center"></div>
        </motion.div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              You Think, We Automate
            </motion.h1>
            <motion.p 
              className="mt-3 max-w-md mx-auto text-xl sm:text-2xl md:mt-5 md:max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              A tech that works on top of Reactive Network
            </motion.p>
            <motion.div 
              className="mt-10 flex justify-center space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Link href="/generate">
                <Button size="lg" className="bg-primary text-white hover:bg-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  Get Started
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 ease-in-out transform hover:scale-105">
                Read Docs
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-center mb-12 text-white">Our Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 bg-gray-700 h-full">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-center mb-12 text-white">What Our Clients Say</h2>
          <div className="relative">
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}>
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <Card className="mx-auto max-w-2xl bg-gray-800 hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
                      <CardContent className="text-center py-10">
                        <p className="text-xl mb-6 text-gray-300">"{testimonial.content}"</p>
                        <div className="flex justify-center items-center mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <p className="font-semibold text-white">{testimonial.name}</p>
                        <p className="text-sm text-gray-400">{testimonial.role}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" size="icon" className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white transition-all duration-300 ease-in-out" onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white transition-all duration-300 ease-in-out" onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            className="text-3xl font-extrabold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Ready to Get Started?
          </motion.h2>
          <motion.p 
            className="text-xl mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Join thousands of satisfied customers and transform your business today.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-200 transition-all duration-300 ease-in-out transform hover:scale-105">
              Sign Up Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About Us</h3>
              <p className="text-sm text-gray-400">We are dedicated to providing cutting-edge automation solutions for businesses of all sizes.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {['Home', 'Templates', 'Community', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-gray-400 hover:text-white transition-all duration-300 ease-in-out">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2">
                {['Twitter', 'LinkedIn', 'Facebook', 'Instagram'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-gray-400 hover:text-white transition-all duration-300 ease-in-out">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
              <p className="text-sm text-gray-400 mb-4">Stay updated with our latest news and offers.</p>
              <div className="flex">
                <input type="email" placeholder="Enter your email" className="flex-grow px-3 py-2 text-gray-900 bg-gray-700 rounded-l-md focus:outline-none" />
                <Button className="rounded-l-none bg-primary hover:bg-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">&copy; 2023 Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}