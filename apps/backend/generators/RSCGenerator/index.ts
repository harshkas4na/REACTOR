// src/generators/RSCGenerator/index.ts

import { P2PGenerator } from './P2PGenerator';
import { CustomOriginGenerator } from './CustomOriginGenerator';
import { BlockchainWideGenerator } from './BlockchainWideGenerator';
import { RSCConfig, RSCType } from '../../types/ExtDAppAutomationTypes';
import { TemplateManager } from '../../templates/TemplateManager';
import { GeneratorError } from '../../utils/errors';

export class RSCGenerator {
    private p2pGenerator: P2PGenerator;
    private customOriginGenerator: CustomOriginGenerator;
    private blockchainWideGenerator: BlockchainWideGenerator;

    constructor(templateManager: TemplateManager) {
        this.p2pGenerator = new P2PGenerator(templateManager);
        this.customOriginGenerator = new CustomOriginGenerator(templateManager);
        this.blockchainWideGenerator = new BlockchainWideGenerator(templateManager);
    }

    async generateContract(
        config: RSCConfig,
        template: string,
        replacements: any
    ): Promise<string> {
        try {
            switch (config.type) {
                case RSCType.PROTOCOL_TO_PROTOCOL:
                    return this.p2pGenerator.generate(config, template, replacements);
                
                case RSCType.ORIGIN_TO_PROTOCOL:
                    return this.customOriginGenerator.generate(
                        config, 
                        template, 
                        replacements
                    );
                
                case RSCType.BLOCKCHAIN_WIDE:
                    return this.blockchainWideGenerator.generate(
                        config, 
                        template, 
                        replacements
                    );
                
                default:
                    throw new GeneratorError(`Unknown RSC type: ${config.type}`);
            }
        } catch (error) {
            throw new GeneratorError(
                `Failed to generate RSC contract: ${error.message}`
            );
        }
    }
}


// Similar implementations for CustomOriginGenerator and BlockchainWideGenerator...