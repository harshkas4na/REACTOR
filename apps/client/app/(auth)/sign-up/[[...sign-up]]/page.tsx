import { SignUp } from '@clerk/nextjs';
import React from 'react';

const SignUpPage = () => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4">
      {/* Sign-up card container with proper width and padding */}
      <div className="relative z-10 w-full sm:w-[480px] mx-auto">
        <div className="rounded-2xl backdrop-blur-xl backdrop-brightness-75 
                      border border-white/10 shadow-[0_0_50px_-12px] shadow-purple-500/30
                      p-4 sm:p-6">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "w-full bg-transparent shadow-none p-0 sm:p-0",
                
                // Main button styling
                formButtonPrimary: 
                  'bg-gradient-to-r from-[#4CC9F0] to-[#7209B7] hover:opacity-90 transition-opacity w-full',
                
                // Input fields
                formFieldInput: 
                  'bg-white/5 border-white/10 focus:border-purple-500/50 text-white placeholder:text-white/50 w-full',
                
                // Header and text
                headerTitle: 'text-white text-2xl font-bold',
                headerSubtitle: 'text-white/70',
                dividerText: 'text-white/50',
                formFieldLabel: 'text-white/80',
                
                // Footer links
                footerActionLink: 
                  'text-[#4CC9F0] hover:text-[#7209B7] font-semibold transition-colors duration-200',
                footer: 'text-white/80',
                
                // Social buttons
                socialButtonsIconButton: 
                  'border-white/10 mb-10 hover:bg-white/5 transition-colors w-full',
                socialButtonsBlockButton: 
                  'border-white/10 hover:bg-white/5 transition-colors w-full',
                
                // Other elements
                identityPreviewText: 'text-white/80',
                identityPreviewEditButton: 
                  'text-[#4CC9F0] hover:text-[#7209B7] transition-colors',
                
                // Form container
                form: 'gap-y-4 w-full',
                
                // Alternative login options
                alternativeMethodsBlock: 'gap-y-2',
                
                // Error messages
                formFieldErrorText: 'text-red-300',
                alert: 'bg-red-500/10 border-red-500/20 text-red-300',
              },
              layout: {
                socialButtonsPlacement: 'bottom',
                shimmer: true
              }
            }}
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 
                      bg-gradient-radial from-purple-500/20 to-transparent 
                      blur-2xl rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 
                      bg-gradient-radial from-cyan-500/20 to-transparent 
                      blur-2xl rounded-full" />
      </div>
    </div>
  );
};

export default SignUpPage;