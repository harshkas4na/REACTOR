// src/controllers/BaseController.ts

import { ValidationError } from '../utils/error';
import { ValidationUtils } from '../utils/ValidationUtils';
import type { ExtendedError } from '../types/ErrorTypes';

export abstract class BaseController {
    protected handleError(error: any): Error {
        console.error('Error in controller:', error);

        if (error instanceof ValidationError) {
            return this.createError('VALIDATION_ERROR', error.message, error);
        }

        if (error.code) {
            return this.createError(error.code, error.message, error);
        }

        return this.createError(
            'INTERNAL_SERVER_ERROR',
            'An unexpected error occurred',
            error
        );
    }

    protected createError(code: string, message: string, originalError?: Error): ExtendedError {
        const error = new Error(message) as ExtendedError;
        error.code = code;
        error.originalError = originalError;
        return error;
    }

    protected validateAddress(address: string): void {
        if (!ValidationUtils.validateAddress(address)) {
            throw new ValidationError(`Invalid address: ${address}`);
        }
    }

    protected validateChainId(chainId: number): void {
        if (!chainId || chainId <= 0) {
            throw new ValidationError(`Invalid chain ID: ${chainId}`);
        }
    }

    protected validateEventSignature(signature: string): void {
        if (!ValidationUtils.validateEventSignature(signature)) {
            throw new ValidationError(`Invalid event signature: ${signature}`);
        }
    }

    protected async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            throw this.handleError(error);
        }
    }

    protected validateRequiredFields(obj: any, fields: string[]): void {
        for (const field of fields) {
            if (obj[field] === undefined || obj[field] === null) {
                throw new ValidationError(`Missing required field: ${field}`);
            }
        }
    }

    protected async validateProtocolSupport(protocol: string): Promise<void> {
        const supportedProtocols = ['Aave', 'Compound', 'Uniswap'];
        if (!supportedProtocols.includes(protocol)) {
            throw new ValidationError(`Unsupported protocol: ${protocol}`);
        }
    }

    protected logOperation(operation: string, details: any): void {
        console.log(`[${new Date().toISOString()}] ${operation}:`, details);
    }
}