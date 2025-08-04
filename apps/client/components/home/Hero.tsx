"use client";

import { useState, useEffect } from "react";

import { Button } from "@nextui-org/react";

import Link from "next/link";

import { motion, AnimatePresence } from "framer-motion";

import {

RocketLaunchIcon,

SparklesIcon,

ShieldExclamationIcon,

CurrencyDollarIcon,

ChartBarIcon,

ClockIcon

} from "@heroicons/react/24/solid";

import Image from "next/image";

import React from "react";



const slides = [

{

id: 0,

title: (

<>

<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">

Automate DeFi Without Code

</span>{" "}

</>

),

subtitle: "Deploy powerful DeFi automations in minutes with ready-to-use templates",

image: "/Background2.jpg",

primaryButton: {

text: "Use Automations",

href: "#featured-automations",

icon: RocketLaunchIcon,

isAnchor: true

}

},

{

id: 1,

title: (

<>

<span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700 ">

Protect Your Tokens Automatically

</span>{" "}

</>

),

subtitle: "Set up Uniswap stop orders to secure your positions when prices drop",

image: "/Uniswap-stop-order.jpg",

primaryButton: {

text: "Create Stop Order",

href: "/automations/stop-order",

icon: ShieldExclamationIcon

}

},

{

id: 2,

title: (

<>

<span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">

Prevent Liquidations Automatically

</span>{" "}

</>

),

subtitle: "Automatically manage your Aave health factor to avoid costly liquidations",

image: "/aave-protection.jpeg",

primaryButton: {

text: "Setup Aave Protection",

href: "/automations/aave-protection",

icon: ShieldExclamationIcon

},


},

{

id: 3,

title: (

<>

<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-500">

Collect Fees Without Effort

</span>{" "}

</>

),

subtitle: "Automatically collect earned fees from your Uniswap V3 positions 24/7",

image: "/fee-collector-9.jpg",

primaryButton: {

text: "Setup Fee Collector",

href: "/automations/fee-collector",

icon: CurrencyDollarIcon

},

status: 'Coming Soon'

},

{

id: 4,

title: (

<>

<span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-600">

Optimize Your Liquidity {" "} Positions

</span>{" "}

</>

),

subtitle: "Keep your Uniswap V3 positions in optimal fee-generating ranges automatically",

image: "/range-manager-7.jpg",

primaryButton: {

text: "Setup Range Manager",

href: "/automations/range-manager",

icon: ChartBarIcon

},

status: 'Coming Soon'

}

];



const Hero = () => {

const [currentSlide, setCurrentSlide] = useState(0);

const [isFirstLoad, setIsFirstLoad] = useState(true);



useEffect(() => {

if (isFirstLoad) {

const timer = setTimeout(() => {

setIsFirstLoad(false);

}, 3000);

return () => clearTimeout(timer);

}



const interval = setInterval(() => {

setCurrentSlide((prev) => (prev + 1) % slides.length);

}, 6000);

return () => clearInterval(interval);

}, [isFirstLoad]);



// Get current icon component

const CurrentIcon = slides[currentSlide].primaryButton.icon;



return (

<section className="relative py-20 sm:py-32 overflow-hidden">

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

<div className="lg:flex lg:items-center lg:gap-12">

<motion.div className="lg:w-1/2 lg:pr-8">

{/* Fixed height container for text */}

<div className="h-[200px] sm:h-[240px] md:h-[280px] relative mb-4">

<AnimatePresence mode="wait">

<motion.div

key={currentSlide}

initial={{ opacity: 0, y: 20, position: 'absolute' }}

animate={{ opacity: 1, y: 0 }}

exit={{ opacity: 0, y: -20 }}

transition={{ duration: 0.5 }}

className="w-full"

>

<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4">

{slides[currentSlide].title}

</h1>

<p className="text-xl sm:text-2xl sm:mb-1 mb-8 text-zinc-300">

{slides[currentSlide].subtitle}

</p>

</motion.div>

</AnimatePresence>

</div>



{/* Fixed position buttons */}

<div className="relative">

<motion.div

initial={{ opacity: 0 }}

animate={{ opacity: 1 }}

transition={{ delay: 0.5, duration: 0.5 }}

className="flex flex-col sm:flex-row gap-4"

>

<div className="w-full sm:w-auto">

<AnimatePresence mode="wait">

<motion.div

key={currentSlide}

initial={{ opacity: 0, y: 10 }}

animate={{ opacity: 1, y: 0 }}

exit={{ opacity: 0, y: -10 }}

transition={{ duration: 0.5 }}

className="w-full sm:w-auto"

>

<Button

as={slides[currentSlide].primaryButton.isAnchor ? "a" : Link}

href={slides[currentSlide].primaryButton.href}

color={slides[currentSlide].status === 'Coming Soon' ? "default" : "primary"}

variant="shadow"

size="lg"

isDisabled={slides[currentSlide].status === 'Coming Soon'}

startContent={<CurrentIcon className="h-5 w-5" />}

className="w-full sm:w-auto hover:bg-primary/80 rounded-md scroll-smooth"

>

{slides[currentSlide].primaryButton.text}

</Button>

</motion.div>

</AnimatePresence>

</div>

<Button

as={Link}

href="/deploy-reactive-contract"

className="w-full rounded-md sm:w-auto hover:bg-blue-950/70"

variant="bordered"

size="lg"

startContent={<SparklesIcon className="h-5 w-5" />}

>

For Developers

</Button>

</motion.div>



{/* Fixed position dots */}

<motion.div

initial={{ opacity: 0 }}

animate={{ opacity: 1 }}

transition={{ delay: 1, duration: 0.5 }}

className="flex justify-center mt-8 gap-2"

>

{slides.map((_, index) => (

<button

key={index}

onClick={() => setCurrentSlide(index)}

className={`w-3 h-3 rounded-full transition-all duration-300 ${

currentSlide === index

? "bg-primary w-6 "

: "bg-zinc-600 hover:bg-zinc-500"

}`}

aria-label={`Go to slide ${index + 1}`}

/>

))}

</motion.div>

</div>

</motion.div>



<motion.div className="lg:w-1/2 mt-12 lg:mt-0">

<AnimatePresence mode="wait">

<motion.div

key={currentSlide}

initial={{ opacity: 0, x: 100 }}

animate={{ opacity: 1, x: 0 }}

exit={{ opacity: 0, x: -100 }}

transition={{ duration: 0.5 }}

className="relative aspect-[4/3] rounded-lg overflow-hidden"

>

<Image

src={slides[currentSlide].image}

alt="Hero Image"

width={500}

height={500}

quality={100}

className={`object-cover w-full h-full transition-transform duration-700 hover:scale-105 ${

slides[currentSlide].status === 'Coming Soon' ? 'blur-sm' : ''

}`}

priority

onError={(e) => {

console.error('Image failed to load:', slides[currentSlide].image);

}}

/>


{/* Coming Soon Overlay */}

{slides[currentSlide].status === 'Coming Soon' && (

<div className="absolute inset-0 bg-black/40 flex items-center justify-center">

<div className="text-center">

<div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">

<ClockIcon className="h-8 w-8 text-white" />

</div>

<h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>

<p className="text-zinc-300 text-sm">This feature is in development</p>

</div>

</div>

)}

</motion.div>

</AnimatePresence>

</motion.div>

</div>

</div>

</section>

);

};



export default Hero;