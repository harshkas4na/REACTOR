// src/generators/DestinationGenerator/index.ts

import { P2PDestinationGenerator } from './P2PDestinationGenerator';
import { CustomDestinationGenerator } from './CustomDestinationGenerator';
import { BlockchainWideDestinationGenerator } from './BlockchainWideDestinationGenerator';
import { RSCConfig, RSCType } from '../../types/ExtDAppAutomationTypes';
import { TemplateManager } from '../../templates/TemplateManager';
import { GeneratorError } from '../../utils/error';

export class DestinationGenerator {
    private p2pDESTGenerator: P2PDestinationGenerator;
    private customDESTGenerator: CustomDestinationGenerator;
    private blockchainWideDESTGenerator: BlockchainWideDestinationGenerator;

    constructor(templateManager: TemplateManager) {
        this.p2pDESTGenerator = new P2PDestinationGenerator(templateManager);
        this.customDESTGenerator = new CustomDestinationGenerator(templateManager);
        this.blockchainWideDESTGenerator = new BlockchainWideDestinationGenerator(templateManager);
    }

    async generateContract(
        config: RSCConfig,
        template: string,
        replacements: any
    ): Promise<string> {
        try {
            switch (config.type) {
                case RSCType.PROTOCOL_TO_PROTOCOL:
                    return this.p2pDESTGenerator.generate(config, template, replacements);
                case RSCType.ORIGIN_TO_PROTOCOL:
                    return this.customDESTGenerator.generate(config, template, replacements);
                case RSCType.BLOCKCHAIN_WIDE:
                    return this.blockchainWideDESTGenerator.generate(config, template, replacements);
                default:
                    throw new GeneratorError(`Unknown RSC type: ${config.type}`);
            }
        } catch (error: any) {
            throw new GeneratorError(`Failed to generate destination contract: ${error.message}`);
        }
    }
}
