// src/types/ProtocolTypes.ts

import { FunctionParam, EventParam } from "./ExtDAppAutomationTypes";
export interface ProtocolFunction {
    name: string;
    type: 'supply' | 'borrow' | 'repay' | 'swap' | 'mint' | 'redeem';
    protocol: 'Aave' | 'Compound' | 'Uniswap';
    inputs: FunctionParam[];
    outputs: FunctionParam[];
}

export interface ProtocolEvent {
    name: string;
    protocol: 'Aave' | 'Compound' | 'Uniswap';
    inputs: EventParam[];
}

export interface ProtocolTemplate {
    name: string;
    imports: string[];
    interfaces: string[];
    functions: string[];
    events: string[];
}
