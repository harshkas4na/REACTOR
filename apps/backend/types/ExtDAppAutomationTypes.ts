// src/types/ExtDAppAutomationTypes.ts

export enum RSCType {
    PROTOCOL_TO_PROTOCOL = 'PROTOCOL_TO_PROTOCOL',
    ORIGIN_TO_PROTOCOL = 'ORIGIN_TO_PROTOCOL',
    BLOCKCHAIN_WIDE = 'BLOCKCHAIN_WIDE'
}

export interface EventParam {
    name: string;
    type: string;
    indexed: boolean;
}

export interface FunctionParam {
    name: string;
    type: string;
}

export interface EventInfo {
    name: string;
    signature: string;
    topic0: string;
    inputs: EventParam[];
    abi: any;
}

export interface FunctionInfo {
    name: string;
    signature: string;
    inputs: FunctionParam[];
    abi: any;
}

export interface InputMapping {
    functionParam: string;
    source: 'event' | 'fixed' | 'decoded' | 'topic';
    value: string;
    topicIndex?: number;
    type?: string;
}

export interface EventFunctionPair {
    event: EventInfo;
    function: FunctionInfo;
    inputMapping: InputMapping[];
}

export interface RSCConfig {
    type: RSCType;
    chainId: number;
    originContract?: string;
    destinationContract: string;
    pairs: EventFunctionPair[];
    isPausable: boolean;
    customLogic?: string;
    protocols?: ProtocolConfig[];
    safetyChecks?: SafetyConfig;
}

export interface ProtocolConfig {
    address: string;
    type: string;
    events: EventInfo[];
    functions: FunctionInfo[];
}

export interface SafetyConfig {
    slippageTolerance?: number;
    maxGasPrice?: string;
    timelock?: number;
}

export interface GeneratedContracts {
    rsc: {
        code: string;
        abi: any[];
        bytecode: string;
    };
    destination: {
        code: string;
        abi: any[];
        bytecode: string;
    };
}

export interface ContractVerification {
    status: boolean;
    address: string;
    abi: any[];
    events: EventInfo[];
    functions: FunctionInfo[];
}