// src/types/ErrorTypes.ts

export interface ExtendedError extends Error {
    code: string;
    originalError?: Error;
    details?: any;
}

export interface ValidationErrorDetails {
    field: string;
    message: string;
    value?: any;
}

