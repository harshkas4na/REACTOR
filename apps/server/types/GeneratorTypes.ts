// src/types/GeneratorTypes.ts

export interface GeneratorReplacements {
    originConstants: string;
    eventConstants: string;
    subscriptions: string;
    reactLogic: string;
    stateVariables: string;
}

export interface TemplateOptions {
    baseContract: string;
    chainId: string;
    originContract: string;
    destinationContract: string;
    eventConstants: string;
    subscriptions: string;
    reactLogic: string;
    stateVariables: string;
    customLogic?: string;
}