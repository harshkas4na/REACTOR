import { DestinationConfig, ProtocolIntegration, CallbackFunction, EventInfo, SafetyCheck, HelperFunction, StateVariable } from '../../types/ExtDAppAutomationTypes';
import { TemplateManager } from '../../templates/TemplateManager';

export class P2PDestinationGenerator {
    private templateManager: TemplateManager;

    constructor(templateManager: TemplateManager) {
        this.templateManager = templateManager;
    }

    async generate(
        config: DestinationConfig,
        template: string,
        replacements: any
    ): Promise<string> {
        return template
            .replace('{{PROTOCOL_IMPORTS}}', this.generateProtocolImports(config.protocols))
            .replace('{{PROTOCOL_INTERFACES}}', this.generateProtocolInterfaces(config.protocols))
            .replace('{{STATE_VARIABLES}}', this.generateStateVariables(config.stateVariables))
            .replace('{{EVENTS}}', this.generateEvents(config.events))
            .replace('{{CONSTRUCTOR_LOGIC}}', this.generateConstructorLogic(config))
            .replace('{{PROTOCOL_FUNCTIONS}}', this.generateProtocolFunctions(config.protocols))
            .replace('{{CALLBACK_FUNCTIONS}}', this.generateCallbackFunctions(config.callbackFunctions))
            .replace('{{HELPER_FUNCTIONS}}', this.generateHelperFunctions(config.helperFunctions))
            .replace('{{SAFETY_CHECKS}}', this.generateSafetyChecks(config.safetyChecks));
    }

    private generateProtocolImports(protocols: ProtocolIntegration[]): string {
        return protocols
            .map(protocol => protocol.imports.join('\n'))
            .join('\n');
    }

    private generateProtocolInterfaces(protocols: ProtocolIntegration[]): string {
        return protocols
            .map(protocol => {
                if (!protocol.interfaces.length) return '';
                return `// ${protocol.type} Interfaces\n${protocol.interfaces.join('\n')}`;
            })
            .filter(Boolean)
            .join('\n\n');
    }

    private generateStateVariables(variables: StateVariable[]): string {
        return variables
            .map(variable => {
                const constDecl = variable.constant ? 'constant ' : '';
                const valueAssignment = variable.value ? ` = ${variable.value}` : '';
                return `${variable.visibility} ${constDecl}${variable.type} ${variable.name}${valueAssignment};`;
            })
            .join('\n    ');
    }

    private generateConstructorLogic(config: DestinationConfig): string {
        const params = config.constructorParams
            .map(param => `${param.type} ${param.name}`)
            .join(', ');

        const baseContract = config.baseContract 
            ? ` ${config.baseContract}(callbackSender)` 
            : '';

        const initialization = config.protocols
            .map(protocol => `        ${protocol.type.toLowerCase()} = ${protocol.type}(${protocol.address});`)
            .join('\n');

        return `
    constructor(
        address callbackSender${params ? `, ${params}` : ''}
    )${baseContract} payable {
${initialization}
    }`;
    }

    private generateProtocolFunctions(protocols: ProtocolIntegration[]): string {
        return protocols
            .map(protocol => 
                protocol.functions
                    .map(func => {
                        const params = func.params
                            .map(param => `${param.type} ${param.name}`)
                            .join(', ');

                        return `
    function ${func.name}(${params}) internal returns (${func.returnType}) {
        ${func.implementation}
    }`;
                    })
                    .join('\n')
            )
            .join('\n\n');
    }

    private generateCallbackFunctions(functions: CallbackFunction[]): string {
        return functions.map(func => {
            const params = func.params
                .map(param => `${param.type} ${param.name}`)
                .join(', ');

            const safetyChecks = func.safetyChecks
                .map(check => `        require(${check});`)
                .join('\n');

            const protocolCalls = func.protocolCalls
                .map(call => `
        try ${call.protocol}.${call.function}(${call.params.join(', ')}) {
            // Success
        } catch Error(string memory reason) {
            // Handle error
            ${call.errorHandling}
        }`).join('\n');

            const events = func.events
                .map(event => `        emit ${event.name}(${event.params.join(', ')});`)
                .join('\n');

            return `
    function ${func.name}(${params}) external authorizedSenderOnly {
${safetyChecks}
${protocolCalls}
${events}
    }`;
        }).join('\n\n');
    }

    private generateHelperFunctions(functions: HelperFunction[]): string {
        return functions
            .map(func => {
                const params = func.params
                    .map(param => `${param.type} ${param.name}`)
                    .join(', ');

                return `
    function ${func.name}(${params}) internal returns (${func.returnType}) {
        ${func.implementation}
    }`;
            })
            .join('\n\n');
    }

    private generateSafetyChecks(checks: SafetyCheck[]): string {
        return checks
            .map(check => `
    modifier ${check.type}Check() {
        require(${check.condition}, "${check.errorMessage}");
        _;
    }`).join('\n');
    }

    private generateEvents(events: EventInfo[]): string {
        return events
            .map(event => {
                const params = event.inputs
                    .map(input => {
                        const indexed = input.indexed ? 'indexed ' : '';
                        return `${input.type} ${indexed}${input.name}`;
                    })
                    .join(', ');

                return `    event ${event.name}(${params});`;
            })
            .join('\n');
    }
}