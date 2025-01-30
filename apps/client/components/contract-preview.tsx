    import React from 'react';
    import { Textarea } from "@/components/ui/textarea";
    
    const ContractPreview = ({ fullCode, showSimplified = true, destinationAddress = "" }:{fullCode:any,showSimplified:boolean,destinationAddress:string}) => {
      // Function to extract just the ReactiveContract part
      const getSimplifiedCode = (code:any) => {
        try {
          // Find the start of ReactiveContract
          const contractStart = code.indexOf('contract ReactiveContract');
          if (contractStart === -1) return code;
    
          // Find the matching closing brace by counting braces
          let braceCount = 0;
          let index = contractStart;
          let found = false;
    
          while (index < code.length) {
            if (code[index] === '{') braceCount++;
            if (code[index] === '}') {
              braceCount--;
              if (braceCount === 0) {
                found = true;
                break;
              }
            }
            index++;
          }
    
          if (!found) return code;
    
          // Extract the ReactiveContract part
          let simplifiedCode = code.slice(contractStart, index + 1);
          
          // Replace the destination address if provided
          if (destinationAddress) {
            simplifiedCode = simplifiedCode.replace(
              /address private constant DESTINATION_CONTRACT = 0x0000000000000000000000000000000000000000/,
              `address private constant DESTINATION_CONTRACT = ${destinationAddress}`
            );
          }
    
          return simplifiedCode;
        } catch (error) {
          console.error('Error simplifying code:', error);
          return code;
        }
      };
    
      // Process the code based on whether we want simplified view and have a destination address
      let displayCode = showSimplified ? getSimplifiedCode(fullCode) : fullCode;
      if (!showSimplified && destinationAddress) {
        displayCode = displayCode.replace(
          /address private constant DESTINATION_CONTRACT = 0x0000000000000000000000000000000000000000/,
          `address private constant DESTINATION_CONTRACT = ${destinationAddress}`
        );
      }
    
      return (
        <Textarea
          value={displayCode}
          readOnly
          className="h-96 font-mono bg-blue-900/20 border-zinc-700 text-zinc-200"
        />
      );
    };
    
    export default ContractPreview;