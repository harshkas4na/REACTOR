"use client";
import { Button } from "@nextui-org/react"
import Link from "next/link"
import { Input } from "@nextui-org/react"
import { FaTwitter, FaLinkedin, FaGithub, FaDiscord, FaTwitterSquare } from 'react-icons/fa'
import { HiOutlineMail, HiOutlineDocumentText, HiOutlineShare } from 'react-icons/hi'
import Image from "next/image";
import { motion } from 'framer-motion'

const Footer = () => {
  return (
    <footer className="relative mt-20 sm:mt-32 overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Brand Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-1"
            >
              <div className="flex justify-center md:justify-start mb-6">
                <Image
                  src="/Full Logo/Color/DarkBg@2x.svg"
                  alt="Reactor Logo"
                  width={180}
                  height={60}
                  quality={100}
                  className="transition-transform duration-300 hover:scale-105"
                />
              </div>
              <p className="text-muted-foreground text-center md:text-left mb-6 leading-relaxed">
                Empowering DeFi users with automated, secure, and intelligent portfolio management solutions.
              </p>
              <div className="flex justify-center md:justify-start space-x-4">
                <Link href="https://x.com/0xkasana" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">
                  <FaTwitter size={20} />
                </Link>
                <Link href="https://www.linkedin.com/in/harsh-kasana-8b6a79258/" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">
                  <FaLinkedin size={20} />
                </Link>
                <Link href="https://github.com/harshkas4na" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">
                  <FaGithub size={20} />
                </Link>
                
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center md:text-left"
            >
              <h4 className="text-lg font-semibold mb-6 text-foreground">Platform</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Home', href: '/' },
                  { name: 'Stop Orders', href: '/automations/stop-order' },
                  { name: 'Aave Protection', href: '/automations/aave-protection' },
                  { name: 'Deploy RSC', href: '/deploy-reactive-contract' }
                ].map((item) => (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm hover:translate-x-1 inline-block"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Resources */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center md:text-left"
            >
              <h4 className="text-lg font-semibold mb-6 text-foreground">Resources</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Documentation', href: '#', icon: HiOutlineDocumentText },
                  { name: 'Security', href: '#', icon: HiOutlineShare },
                  { name: 'API Reference', href: '#', icon: HiOutlineMail },
                  { name: 'Support', href: '#', icon: HiOutlineMail },
                  { name: 'Bug Reports', href: '#', icon: HiOutlineMail }
                ].map((item) => (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm flex items-center justify-center md:justify-start gap-2 hover:translate-x-1 group"
                    >
                      <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Newsletter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center md:text-left"
            >
              <h4 className="text-lg font-semibold mb-6 text-foreground">Stay Updated</h4>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Get the latest updates on new features, security patches, and DeFi automation insights.
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  variant="bordered"
                  classNames={{
                    input: "text-foreground",
                    inputWrapper: "border-border hover:border-primary/50 focus-within:border-primary bg-background/50"
                  }}
                />
                <Button
                  color="primary"
                  variant="shadow"
                  className="w-full hover:scale-105 transition-transform duration-300 bg-gradient-to-r from-primary to-secondary"
                  startContent={<HiOutlineMail className="w-4 h-4" />}
                >
                  Subscribe
                </Button>
                <p className="text-xs text-muted-foreground">
                  No spam. Unsubscribe at any time.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 pt-8 border-t border-border/50"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-muted-foreground">
                <p>&copy; 2025 REACTOR. All rights reserved.</p>
                <div className="flex gap-6">
                  <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
                  <Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center md:text-right">
                <p>Built with ❤️ for the DeFi community</p>
                <p className="mt-1">Powered by Reactive Smart Contracts</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;