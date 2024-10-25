"use client";
import { Button } from "@/components/ui/button"
import Link from "next/link"

const Footer = () => {
  return (
    <div>
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

export default Footer