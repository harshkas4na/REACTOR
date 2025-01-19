// env.d.ts
declare global {
    namespace NodeJS {
      interface ProcessEnv {
        NEXT_PUBLIC_CALLBACK_SENDER_ADDRESS: string;
      }
    }
  }
  
  export {};