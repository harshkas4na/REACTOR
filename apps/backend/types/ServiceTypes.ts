// src/types/ServiceTypes.ts

export interface CompilationResult {
    abi: any[];
    bytecode: string;
    errors?: string[];
    warnings?: string[];
}

export interface VerificationResult {
    isVerified: boolean;
    contractName: string;
    compilerVersion: string;
    optimization: boolean;
    abi: any[];
}

export interface GenerationResult {
    rscCode: string;
    destCode: string;
    warnings?: string[];
}