// src/utils/ValidationUtils.ts

import { RSCConfig } from '../types/ExtDAppAutomationTypes';
import { ValidationError } from './error';

export class ValidationUtils {
    static validateRSCConfig(config: RSCConfig): void {
        if (!config.type) {
            throw new ValidationError('RSC type is required');
        }
        if (!config.chainId) {
            throw new ValidationError('Chain ID is required');
        }
        if (!config.pairs || config.pairs.length === 0) {
            throw new ValidationError('At least one event-function pair is required');
        }

        config.pairs.forEach(pair => {
            if (!pair.event) {
                throw new ValidationError('Event configuration is required');
            }
            if (!pair.function) {
                throw new ValidationError('Function configuration is required');
            }
        });
    }

    static validateAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    static validateEventSignature(signature: string): boolean {
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*\([a-zA-Z0-9,\[\]]*\)$/.test(signature);
    }
}
