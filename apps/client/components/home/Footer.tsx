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
      <div className="relative border-t border-border/50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image
                src="/Full Logo/Color/DarkBg@2x.svg"
                alt="Reactor Logo"
                width={160}
                height={50}
                quality={100}
              />
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} REACTOR. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="https://x.com/0xkasana" className="text-muted-foreground hover:text-primary transition-colors">
                <FaTwitter size={18} />
              </Link>
              <Link href="https://www.linkedin.com/in/harsh-kasana-8b6a79258/" className="text-muted-foreground hover:text-primary transition-colors">
                <FaLinkedin size={18} />
              </Link>
              <Link href="https://github.com/harshkas4na" className="text-muted-foreground hover:text-primary transition-colors">
                <FaGithub size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;