"use client";
import { Button } from "@/components/ui/button"
import Link from "next/link"

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 dark:bg-black dark:text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white dark:text-gray-200">About RSC Platform</h3>
            <p className="text-sm">We empower developers to create, deploy, and manage reactive smart contracts across multiple blockchain networks.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white dark:text-gray-200">Quick Links</h3>
            <ul className="space-y-2">
              {['Home', 'Templates', 'Documentation', 'Community'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm hover:text-white dark:hover:text-gray-200 transition-colors duration-300">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white dark:text-gray-200">Connect</h3>
            <ul className="space-y-2">
              {['Twitter', 'Discord', 'GitHub', 'LinkedIn'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm hover:text-white dark:hover:text-gray-200 transition-colors duration-300">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white dark:text-gray-200">Newsletter</h3>
            <p className="text-sm mb-4">Stay updated with our latest features and releases.</p>
            <div className="flex">
              <input type="email" placeholder="Enter your email" className="flex-grow px-3 py-2 text-gray-900 bg-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-600 dark:text-white" />
              <Button className="rounded-l-none bg-primary hover:bg-primary/90 text-primary-foreground">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 dark:border-gray-600 text-center">
          <p className="text-sm">&copy; 2023 RSC Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer