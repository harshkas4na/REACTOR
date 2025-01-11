// src/generators/RSCGenerator/index.ts

import { P2PRSCGenerator } from './P2PGenerator';
import { CustomOriginRSCGenerator } from './CustomOriginGenerator';
import { BlockchainWideRSCGenerator } from './BlockchainWideGenerator';
import { RSCConfig, RSCType } from '../../types/ExtDAppAutomationTypes';
import { TemplateManager } from '../../templates/TemplateManager';
import { GeneratorError } from '../../utils/error';

export class RSCGenerator {
    private p2pRSCGenerator: P2PRSCGenerator;
    private blockchainWideRSCGenerator: BlockchainWideRSCGenerator;
    private customOriginRSCGenerator: CustomOriginRSCGenerator;   
    constructor(templateManager: TemplateManager) {
        this.p2pRSCGenerator = new P2PRSCGenerator(templateManager);
        this.blockchainWideRSCGenerator = new BlockchainWideRSCGenerator(templateManager);
        this.customOriginRSCGenerator = new CustomOriginRSCGenerator(templateManager);
    }

    async generateContract(
        config: RSCConfig,
        template: string,
        replacements: any
    ): Promise<string> {
        try {
            switch (config.type) {
                case RSCType.PROTOCOL_TO_PROTOCOL:
                    return this.p2pRSCGenerator.generate(config, template, replacements);
                
                case RSCType.ORIGIN_TO_PROTOCOL:
                    return this.customOriginRSCGenerator.generate(
                        config, 
                        template, 
                        replacements
                    );
                
                case RSCType.BLOCKCHAIN_WIDE:
                    return this.blockchainWideRSCGenerator.generate(
                        config, 
                        template, 
                        replacements
                    );
                
                default:
                    throw new GeneratorError(`Unknown RSC type: ${config.type}`);
            }
        } catch (error: any) {
            throw new GeneratorError(
                `Failed to generate RSC contract: ${error.message}`
            );
        }
    }
}


// Similar implementations for CustomOriginGenerator and BlockchainWideGenerator...