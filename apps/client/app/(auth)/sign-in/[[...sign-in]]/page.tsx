// SignInPage.tsx
import { SignIn } from '@clerk/nextjs';
import React from 'react';

const SignInPage = () => {
  return (
    <div className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center p-2 overflow-hidden">
      {/* Main container with better width control */}
      <div className="relative z-10 w-[min(90vw,480px)] mx-auto">
        {/* Card container with overflow protection */}
        <div className="rounded-xl sm:rounded-2xl border border-white/10 
                      shadow-[0_0_50px_-12px] shadow-purple-500/30 
                      p-3 sm:p-4 md:p-6 
                      w-full overflow-hidden">
          <h1 className="text-white text-lg sm:text-xl md:text-2xl font-bold text-center mb-3 sm:mb-4 md:mb-6">
            Sign In To REACTOR
          </h1>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full ml-4 overflow-hidden",
                card: "w-full bg-transparent shadow-none p-0 gap-3",
                headerTitle: "hidden",
                headerSubtitle: "text-white/70 text-sm md:text-base break-words",
                
                // Form field adjustments with overflow protection
                formField: "w-full max-w-none",
                formFieldLabelRow: "w-full",
                formFieldLabel: "text-sm md:text-base",
                formFieldInput: 
                  `w-full bg-white/5 border-white/10 focus:border-purple-500/50 
                   text-white placeholder:text-white/50
                   text-sm md:text-base 
                   h-10 md:h-12 
                   px-3 md:px-4
                   min-w-0`,  // Prevent input overflow
                
                // Button adjustments
                formButtonPrimary: 
                  `w-full bg-gradient-to-r from-[#4CC9F0] to-[#7209B7] hover:opacity-90 
                   text-sm md:text-base 
                   h-6 md:h-8`,
                
                // Social buttons
                socialButtonsIconButton: 
                  "border-white/10 hover:bg-white/5 transition-colors w-full h-8 md:h-10 mb-4 md:mb-6",
                socialButtonsBlockButton: 
                  "border-white/10 hover:bg-white/5 transition-colors w-full h-10 md:h-12",
                
                // Spacing and container adjustments
                form: "gap-3 mr-1 md:gap-4 w-full",
                formHeader: "px-0 mr-1 md:px-2 w-full",
                formFieldRow: "mr-1 mb-0 w-full",
                
                // Footer and text adjustments
                footer: "w-full  break-words text-sm md:text-base text-black/80", // Added black color with 80% opacity
                footerActionLink: "text-sm md:text-base break-words text-[#4CC9F0] hover:text-[#7209B7] font-semibold", // Kept the accent color for the link
                identityPreviewText: "text-white/80 text-sm md:text-base break-words",
                dividerText: "text-white/50 text-sm md:text-base",
                
                // Error handling
                formFieldErrorText: "text-red-300 text-xs sm:text-sm break-words",
                alert: "bg-red-500/10 border-red-500/20 text-red-300 text-sm break-words",

                // Alternative methods
                alternativeMethodsBlock: "w-full",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                shimmer: true,
                helpPageUrl: "/help",
                logoPlacement: "none"
              },
              variables: {
                colorPrimary: "#4CC9F0",
                colorText: "#ffffff",
                colorTextSecondary: "#ffffff80",
                colorInputText: "#ffffff"
              }
            }}
            path="/sign-in"
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-32 h-32 sm:w-40 sm:h-40 
                      bg-gradient-radial from-purple-500/20 to-transparent 
                      blur-xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 
                      bg-gradient-radial from-cyan-500/20 to-transparent 
                      blur-xl rounded-full pointer-events-none" />
      </div>
    </div>
  );
};

export default SignInPage;