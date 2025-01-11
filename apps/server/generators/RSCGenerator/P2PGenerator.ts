// src/generators/RSCGenerator/P2PGenerator.ts
import { TemplateManager } from '../../templates/TemplateManager';
import { RSCConfig } from '../../types/ExtDAppAutomationTypes';
import { EventInfo } from '../../types/ExtDAppAutomationTypes';

interface ReactLogicConfig {
    completionTopic?: string;
    events: EventInfo[];
    destinationContract: string;
    checkCompletion?: boolean;
    customDataProcessing?: boolean;
}
export class P2PRSCGenerator {
    private templateManager: TemplateManager;

    constructor(templateManager: TemplateManager) {
        this.templateManager = templateManager;
    }

    async generate(
        config: RSCConfig,
        template: string,
        replacements: any
    ): Promise<string> {
        return template
            .replace('{{BASE_CONTRACT}}', 
                config.isPausable ? 'AbstractPausableReactive' : 'AbstractReactive')
            .replace('{{ORIGIN_CHAIN_ID}}', config.originChainId.toString())
            .replace('{{DESTINATION_CHAIN_ID}}', config.destinationChainId.toString())
            .replace('{{ORIGIN_PROTOCOL_CONSTANTS}}', replacements.originConstants)
            .replace('{{EVENT_CONSTANTS}}', replacements.eventConstants)
            .replace('{{SUBSCRIPTIONS}}', replacements.subscriptions)
            .replace('{{REACT_LOGIC}}', this.generateReactLogic(config))
            .replace('{{STATE_VARIABLES}}', this.generateStateVariables(config))
            .replace('{{getPausableSubscriptionsFunction}}', this.generatePausableLogic(config))
            // .replace('{{COMPLETION_TOPIC}}', config.completionTopic)
    }

    private generateReactLogic(config: RSCConfig): string {
        const reactConfig: ReactLogicConfig = {
            // completionTopic: config.completionTopic,
            // events: config.events,
            // destinationContract: config.destinationContract,
            // checkCompletion: config.checkCompletion ?? true,
            // customDataProcessing: config.customDataProcessing ?? true
            completionTopic: '0x0000000000000000000000000000000000000000000000000000000000000000',
            events: [],
            destinationContract: '0x0000000000000000000000000000000000000000',
            checkCompletion: true,
            customDataProcessing: true
        };

        let logic = '';

        // Handle completion check if specified
        if (reactConfig.checkCompletion && reactConfig.completionTopic) {
            logic += this.generateCompletionCheck(reactConfig);
        }

        // Generate event handling logic
        logic += this.generateEventHandling(reactConfig);

        return logic;
    }

    private generateCompletionCheck(config: ReactLogicConfig): string {
        return `
        // Check for completion
        if (_contract == ${config.destinationContract} && triggered) {
            if (topic_0 == ${config.completionTopic}) {
                done = true;
                emit Done();
                return;
            }
        }
        `;
    }

    private generateEventHandling(config: ReactLogicConfig): string {
        let eventHandling = '';
        
        // Generate data processing if needed
        if (config.customDataProcessing) {
            eventHandling += this.generateDataProcessing(config.events);
        }

        // Generate condition checks and callback emission
        eventHandling += config.events.map((event, index) => `
            if (topic_0 == ${event.topic0}) {
                ${this.generateEventSpecificLogic(event)}
                
                // Prepare and emit callback
                if (!triggered) {
                    emit CallbackSent();
                    bytes memory payload = abi.encodeWithSignature(
                        "${event.signature}",
                        ${this.generateCallbackParameters(event)}
                    );
                    triggered = true;
                    emit Callback(chain_id, ${config.destinationContract}, 1000000, payload);
                }
            }
        `).join(' else ');

        return eventHandling;
    }

    private generateDataProcessing(events: EventInfo[]): string {
        return events.map(event => {
            if (!event.inputs) return '';
            
            return `
            ${event.inputs} memory processedData = abi.decode(data, (${event.inputs}));
            `;
        }).join('\n');
    }

    private generateEventSpecificLogic(event: EventInfo): string {
        if (!event.inputs) return '';

        return event.inputs.map(input => `
            // Check condition: ${input.name}
            require(${input.name}, "${input.name}");
        `).join('\n');
    }

    private generateCallbackParameters(event: EventInfo): string {
        if (!event.inputs) return '';

            return event.inputs.map(param => {
            switch (param.type) {
                case 'address':
                    return `address(uint160(${param.name}))`;
                case 'uint256':
                    return param.name;
                case 'bool':
                    return `${param.name} != 0`;
                default:
                    return param.name;
            }
        }).join(', ');
    }

    private generateStateVariables(config: RSCConfig): string {
        let variables = '';
        
        // Standard state variables
        variables += `
    bool private triggered;
    bool private done;
        `;

        // Additional state variables from config
        // if (config.stateVariables) {
        //     variables += config.stateVariables.map(variable => 
        //         `    ${variable.type} private ${variable.name}${variable.value ? ` = ${variable.value}` : ''};`
        //     ).join('\n');
        // }

        return variables;
    }

    private generatePausableLogic(config: RSCConfig): string {
        if (!config.isPausable) return '';
        
        return `
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function pause() external onlyOwner {
        require(!paused, "Contract is already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(paused, "Contract is not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }`;
    }
}