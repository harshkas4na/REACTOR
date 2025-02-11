import { SignIn } from '@clerk/nextjs';
import React from 'react';

const SignInPage = () => {
  return (
    <div className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center p-2 ">
      {/* Main container with better responsive width */}
      <div className="relative z-10 w-[min(90vw,480px)] mx-auto">
        {/* Sign-in card with refined responsive styling */}
        <div className="rounded-xl sm:rounded-2xl 
                     border border-sky-500/10 
                     shadow-[0_0_50px_-12px] shadow-sky-500/30
                     bg-gradient-to-b from-slate-900/95 to-slate-950/95
                     p-3 sm:p-4 md:p-6 
                     w-full overflow-hidden">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-sky-50 mb-3 sm:mb-4 md:mb-6">
            Welcome Back
          </h1>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full ml-4 sm:mr-2 max-w-[90%] overflow-hidden",
                card: "w-full bg-transparent  sm:pl-2 shadow-none p-0 gap-3 md:gap-4",
                
                headerTitle: "sr-only",
                headerSubtitle: "text-sky-200/70 sm:flex-wrap text-sm md:text-base break-words",
                
                // Form fields with improved responsive design
                formField: "w-full ",
                formFieldLabelRow: "w-full",
                formFieldLabel: "text-sky-100/80 text-sm md:text-base",
                formFieldInput: `
                  sm:w-[96%] w-[84%]
                  rounded-md
                  bg-sky-950/50
                  border-sky-500/20
                  focus:border-sky-400/50
                  text-sky-50
                  placeholder:text-sky-400/50
                  text-sm md:text-base
                  h-10 md:h-12
                  px-3 md:px-4
                  min-w-0
                  transition duration-200
                  mb-2 md:mb-3
                  pr-10
                `,
          
                // Keep the rest of the styles the same
                formButtonPrimary: `
                  sm:w-[96%] w-[84%]
                  bg-gradient-to-r from-[#4CC9F0] to-[#7209B7] 
                  hover:opacity-90
                  text-sm md:text-base 
                  h-6 sm:h-6 md:h-8
                  rounded-md
                  font-medium sm:font-semibold
                  transition-all
                `,
                socialButtonsIconButton: `
                  border border-sky-500/20
                  hover:bg-sky-900/30
                  transition-colors
                  sm:w-[96%] w-[84%]
                  h-10 md:h-12
                  mb-3 sm:mb-4 md:mb-6
                  rounded-md
                  text-sm md:text-base
                `,
                socialButtonsBlockButton: `
                  border-sky-500/20
                  hover:bg-sky-900/30
                  transition-colors
                  w-full
                  h-10 md:h-12
                  rounded-lg
                  text-sm md:text-base
                `,
                
                // Layout containers with better spacing
                form: "gap-3 mr-1 md:gap-4 w-full",
                formHeader: "px-0 mr-1 md:px-2 w-full",
                formFieldRow: "mr-1 mb-0 w-full",
                
                // Footer elements with responsive text
                footer: "sm:w-[96%]  w-[84%] rounded-lg break-words text-sm md:text-base text-sky-300/80",
                footerActionLink: "text-sm md:text-base break-words text-sky-400 hover:text-sky-300 font-semibold",
                
                // Alternative methods with improved spacing
                alternativeMethodsBlock: "w-full gap-2 md:gap-3",
                
                // Divider with responsive text
                dividerLine: "bg-sky-500/20 ",
                dividerText: "text-sky-400/50  text-sm md:text-base",
                
                // Error states with responsive text
                formFieldErrorText: "text-rose-300 text-xs sm:text-sm break-words mt-1",
                alert: "bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm break-words p-3 rounded-lg mt-2",

                // Identity preview with responsive text
                identityPreviewText: "text-sky-100/80 text-sm md:text-base break-words",
                identityPreviewEditButton: "text-sky-400 hover:text-sky-300 transition-colors text-sm md:text-base",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                shimmer: true,
                logoPlacement: "none"
              },
              variables: {
                colorPrimary: "#38BDF8",
                colorText: "#F0F9FF",
                colorTextSecondary: "#BAE6FD",
                colorBackground: "transparent",
                colorInputBackground: "rgba(12, 74, 110, 0.2)",
                colorInputText: "#F0F9FF",
              }
            }}
            path="/sign-in"
          />
        </div>

        {/* Decorative elements with matched responsive sizing */}
        <div 
          className="absolute -top-10 -left-10 w-32 h-32 sm:w-40 sm:h-40 
                     bg-gradient-radial from-sky-500/20 to-transparent 
                     blur-xl rounded-full pointer-events-none" 
          aria-hidden="true"
        />
        <div 
          className="fixed -bottom-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 
                     bg-gradient-radial from-blue-500/20 to-transparent 
                     blur-xl rounded-full pointer-events-none" 
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default SignInPage;