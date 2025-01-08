// templates/TemplateManager.ts

import { RSCType } from '../types/ExtDAppAutomationTypes';
import p2pRSCTemplate from './p2p/rsc.template';
import p2pDestTemplate from './p2p/destination.template';
import customOriginRSCTemplate from './customOrigin/rsc.template';
import customOriginDestTemplate from './customOrigin/destination.template';
import blockchainWideRSCTemplate from './blockchainWide/rsc.template';
import blockchainWideDestTemplate from './blockchainWide/destination.template';

export class TemplateManager {
    private templates: {
        [key in RSCType]: {
            rsc: string;
            destination: string;
        }
    };

    constructor() {
        this.templates = {
            [RSCType.PROTOCOL_TO_PROTOCOL]: {
                rsc: p2pRSCTemplate,
                destination: p2pDestTemplate
            },
            [RSCType.ORIGIN_TO_PROTOCOL]: {
                rsc: customOriginRSCTemplate,
                destination: customOriginDestTemplate
            },
            [RSCType.BLOCKCHAIN_WIDE]: {
                rsc: blockchainWideRSCTemplate,
                destination: blockchainWideDestTemplate
            }
        };
    }

    getRSCTemplate(type: RSCType): string {
        return this.templates[type].rsc;
    }

    getDestinationTemplate(type: RSCType): string {
        return this.templates[type].destination;
    }

    private generateEventTopicConstant(protocolIndex: number, eventIndex: number, topic0: string): string {
        return `uint256 private constant EVENT_TOPIC_0_${protocolIndex}_${eventIndex} = ${topic0};`;
    }

    private generateOriginContractConstant(index: number, address: string): string {
        return `address private constant ORIGIN_PROTOCOL_CONTRACT_${index} = ${address};`;
    }

    generateTemplateReplacements(type: RSCType, config: any) {
        switch(type) {
            case RSCType.PROTOCOL_TO_PROTOCOL:
                return this.generateP2PReplacements(config);
            case RSCType.ORIGIN_TO_PROTOCOL:
                return this.generateCustomOriginReplacements(config);
            case RSCType.BLOCKCHAIN_WIDE:
                return this.generateBlockchainWideReplacements(config);
            default:
                throw new Error('Unsupported RSC type');
        }
    }

    private generateP2PReplacements(config: any) {
        let eventConstants = '';
        let originConstants = '';
        let subscriptions = '';

        config.originContracts.forEach((origin: any, protocolIndex: number) => {
            // Generate origin contract constant
            originConstants += this.generateOriginContractConstant(protocolIndex, origin.address);

            // Generate event constants for this protocol
            origin.events.forEach((event: any, eventIndex: number) => {
                eventConstants += this.generateEventTopicConstant(protocolIndex, eventIndex, event.topic0);
                
                // Generate subscription for this event
                subscriptions += this.generateSubscription(
                    config.chainId,
                    `ORIGIN_PROTOCOL_CONTRACT_${protocolIndex}`,
                    `EVENT_TOPIC_0_${protocolIndex}_${eventIndex}`
                );
            });
        });

        return {
            eventConstants,
            originConstants,
            subscriptions
        };
    }

    private generateCustomOriginReplacements(config: any) {
        // Similar to P2P but with single origin contract
        return {};
    }

    private generateBlockchainWideReplacements(config: any) {
        // Implementation for blockchain-wide template
        return {};
    }

    private generateSubscription(chainId: string, contractVar: string, topicVar: string): string {
        return `
            service.subscribe(
                ${chainId},
                ${contractVar},
                ${topicVar},
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        `;
    }
}