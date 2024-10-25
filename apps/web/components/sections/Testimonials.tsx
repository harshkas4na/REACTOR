"use client";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {TESTIMONIALS} from "../../data/constants"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { useState } from "react"
const Testimonials = () => {  

  const [currentTestimonial, setCurrentTestimonial] = useState(0)


  return (
    <div>
        <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-center mb-12 text-white">What Our Clients Say</h2>
          <div className="relative">
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}>
                {TESTIMONIALS.map((testimonial, index) => (
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
            <Button variant="outline" size="icon" className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white transition-all duration-300 ease-in-out" onClick={() => setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white transition-all duration-300 ease-in-out" onClick={() => setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Testimonials