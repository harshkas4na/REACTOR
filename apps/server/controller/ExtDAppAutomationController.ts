// src/controllers/ExtDAppAutomationController.ts

import { ContractGenerationService } from '../services/ContractGenerationService';
import { CompilationService } from '../services/CompilationService';
import { ProtocolService } from '../services/ProtocolService';
import { ValidationUtils } from '../utils/ValidationUtils';
import { RSCConfig, GeneratedContracts } from '../types/ExtDAppAutomationTypes';

export class ExtDAppAutomationController {
    private contractGenerationService: ContractGenerationService;
    private compilationService: CompilationService;
    private protocolService: ProtocolService;

    constructor() {
        const etherscanApiKey = "etherscan_api_key";
        if (!etherscanApiKey) {
            throw new Error('ETHERSCAN_API_KEY is not defined');
        }

        this.contractGenerationService = new ContractGenerationService(etherscanApiKey);
        this.compilationService = new CompilationService();
        this.protocolService = new ProtocolService(etherscanApiKey);
    }

    /**
     * Generates RSC and destination contracts based on configuration
     */
    async generateContracts(config: RSCConfig): Promise<GeneratedContracts> {
        try {
            // Validate configuration
            ValidationUtils.validateRSCConfig(config);

            // Generate contracts
            const { rscCode, destCode } = await this.contractGenerationService.generateContracts(config);

            // Compile contracts
            const compiledContracts = await this.compilationService.compileContracts(rscCode, destCode);

            return compiledContracts;
        } catch (error) {
            console.error('Error generating contracts:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Verifies protocol contracts and returns their ABIs
     */
    async verifyProtocols(addresses: string[]): Promise<any> {
        try {
            return await this.protocolService.verifyProtocols(addresses);
        } catch (error) {
            console.error('Error verifying protocols:', error);
            throw this.handleError(error);
        }
    }

    private handleError(error: any): Error {
        if (error.code === 'CONTRACT_GENERATION_ERROR') {
            return new Error(`Failed to generate contracts: ${error.message}`);
        }
        if (error.code === 'COMPILATION_ERROR') {
            return new Error(`Failed to compile contracts: ${error.message}`);
        }
        if (error.code === 'PROTOCOL_VERIFICATION_ERROR') {
            return new Error(`Failed to verify protocols: ${error.message}`);
        }
        return error;
    }
}