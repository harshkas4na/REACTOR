"use client";
import { Button } from "@nextui-org/react"
import Link from "next/link"
import { Input } from "@nextui-org/react"
import { FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa'
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="mt-20 sm:mt-32 bg-gray-900 rounded-lg relative pointer-events-auto z-10 text-gray-300 py-8 sm:py-16 border-t border-gray-800 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-12">
          <div className="text-center sm:text-left">
            <Image 
                src="/Full Logo/Color/DarkBg@2x.svg" 
                alt="Reactor Logo" 
                width={150} 
                height={150}
                quality={100}
                className="transition-transform mb-4 duration-300 group-hover:scale-105" 
              />
            <p className="text-sm">Empowering DeFi users with automated portfolio management</p>
          </div>
          
          {/* Quick Links */}
          <div className="text-center sm:text-left">
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              {['Home', 'Automations', 'Documentation', 'Community'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm hover:text-primary transition-colors duration-300">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Social Links */}
          <div className="text-center sm:text-left">
            <h4 className="text-lg font-semibold mb-4 text-white">Connect</h4>
            <div className="flex justify-center sm:justify-start space-x-4">
              <Link href="https://x.com/HarshKasan89518" className="text-gray-400 hover:text-primary transition-colors duration-300">
                <FaTwitter size={24} />
              </Link>
              <Link href="https://www.linkedin.com/feed/" className="text-gray-400 hover:text-primary transition-colors duration-300">
                <FaLinkedin size={24} />
              </Link>
              <Link href="https://github.com/harshkas4na" className="text-gray-400 hover:text-primary transition-colors duration-300">
                <FaGithub size={24} />
              </Link>
            </div>
          </div>
          
          {/* Newsletter */}
          <div className="text-center sm:text-left w-full">
            <h4 className="text-lg font-semibold mb-4 text-white">Newsletter</h4>
            <p className="text-sm mb-4">Stay updated with our latest features and releases.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-gray-800 rounded-md" 
              />
              <Button 
                color="primary"
                className="w-full sm:w-auto hover:bg-primary/80 rounded-md"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-800 text-center">
          <p className="text-sm">&copy; 2025 REACTOR. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer