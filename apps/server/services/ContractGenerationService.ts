// src/services/ContractGenerationService.ts

import { TemplateManager } from '../templates/TemplateManager';
import { RSCGenerator } from '../generators/RSCGenerator';
import { DestinationGenerator } from '../generators/DestinationGenerator';
import { RSCConfig } from '../types/ExtDAppAutomationTypes';

export class ContractGenerationService {
    private templateManager: TemplateManager;
    private rscGenerator: RSCGenerator;
    private destGenerator: DestinationGenerator;

    constructor(etherscanApiKey: string) {
        this.templateManager = new TemplateManager();
        this.rscGenerator = new RSCGenerator(this.templateManager);
        this.destGenerator = new DestinationGenerator(this.templateManager);
    }

    async generateContracts(config: RSCConfig): Promise<{ rscCode: string; destCode: string }> {
        try {
            // Get base templates
            const rscTemplate = this.templateManager.getRSCTemplate(config.type);
            const destTemplate = this.templateManager.getDestinationTemplate(config.type);

            // Generate replacements
            const replacements = await this.templateManager.generateTemplateReplacements(
                config.type,
                config
            );

            // Generate contracts
            const rscCode = await this.rscGenerator.generateContract(
                config,
                rscTemplate,
                replacements
            );

            const destCode = await this.destGenerator.generateContract(
                config,
                destTemplate,
                replacements
            );

            return {
                rscCode,
                destCode
            };
        } catch (error) {
            console.error('Contract generation error:', error);
            throw this.createError('CONTRACT_GENERATION_ERROR', error);
        }
    }

    private createError(code: string, originalError: any): Error {
        const error = new Error(originalError.message);
        // error.code = code;
        // error.originalError = originalError;
        return error;
    }
}