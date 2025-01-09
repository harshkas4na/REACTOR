// src/generators/RSCGenerator/index.ts

import { P2PGenerator } from './P2PGenerator';
import { CustomDestinationGenerator } from '../DestinationGenerator/CustomDestinationGenerator';
import { BlockchainWideDestinationGenerator } from '../DestinationGenerator/BlockchainWideDestinationGenerator';
import { RSCConfig, RSCType } from '../../types/ExtDAppAutomationTypes';
import { TemplateManager } from '../../templates/TemplateManager';
import { GeneratorError } from '../../utils/error';

export class RSCGenerator {
    private p2pGenerator: P2PGenerator;
    private customDestinationGenerator: CustomDestinationGenerator;
    private blockchainWideDestinationGenerator: BlockchainWideDestinationGenerator;

    constructor(templateManager: TemplateManager) {
        this.p2pGenerator = new P2PGenerator(templateManager);
        this.customDestinationGenerator = new CustomDestinationGenerator(templateManager);
        this.blockchainWideDestinationGenerator = new BlockchainWideDestinationGenerator(templateManager);
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
                    return this.customDestinationGenerator.generate(
                        config, 
                        template, 
                        replacements
                    );
                
                case RSCType.BLOCKCHAIN_WIDE:
                    return this.blockchainWideDestinationGenerator.generate(
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