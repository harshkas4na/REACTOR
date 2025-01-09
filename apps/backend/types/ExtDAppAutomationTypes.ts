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
    originChainId: number;
    destinationChainId: number;
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


// New types for destination contract generation
export interface ProtocolIntegration {
    type: string;                 // e.g., 'Aave', 'Compound', 'Uniswap'
    version: string;              // e.g., 'v2', 'v3'
    imports: string[];            // Required import statements
    interfaces: string[];         // Protocol interfaces to import
    address: string;              // Protocol address
    functions: ProtocolFunction[];
}

export interface ProtocolFunction {
    name: string;
    signature: string;
    params: FunctionParam[];
    returnType: string;
    implementation: string;
}

export interface DestinationConfig {
    baseContract: string;         // e.g., 'AbstractCallback', 'FlashLoanReceiver'
    protocols: ProtocolIntegration[];
    constructorParams: FunctionParam[];
    stateVariables: StateVariable[];
    callbackFunctions: CallbackFunction[];
    helperFunctions: HelperFunction[];
    safetyChecks: SafetyCheck[];
    events: EventInfo[];
}

export interface StateVariable {
    name: string;
    type: string;
    visibility: string;
    constant?: boolean;
    value?: string;
}

export interface CallbackFunction {
    name: string;
    params: FunctionParam[];
    returnType: string;
    protocolCalls: ProtocolCall[];
    safetyChecks: string[];
    events: EventEmit[];
}

export interface ProtocolCall {
    protocol: string;
    function: string;
    params: string[];
    errorHandling: string;
}

export interface HelperFunction {
    name: string;
    params: FunctionParam[];
    returnType: string;
    implementation: string;
}

export interface SafetyCheck {
    type: string;               // e.g., 'slippage', 'balance', 'deadline'
    condition: string;
    errorMessage: string;
}

export interface EventEmit {
    name: string;
    params: string[];
}