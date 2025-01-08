// src/services/ProtocolService.ts

import { ethers } from 'ethers';
import { 
    ContractVerification,
    EventInfo,
    FunctionInfo 
} from '../types/ExtDAppAutomationTypes';
import { ProtocolVerificationError } from '../utils/errors';

export class ProtocolService {
    private etherscanApiKey: string;

    constructor(etherscanApiKey: string) {
        this.etherscanApiKey = etherscanApiKey;
    }

    async verifyProtocols(addresses: string[]): Promise<ContractVerification[]> {
        try {
            const verifications = await Promise.all(
                addresses.map(addr => this.verifyContract(addr))
            );
            return verifications;
        } catch (error) {
            throw new ProtocolVerificationError(
                `Failed to verify protocols: ${error.message}`
            );
        }
    }

    private async verifyContract(address: string): Promise<ContractVerification> {
        const url = 
            `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${this.etherscanApiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new ProtocolVerificationError('Failed to fetch contract from Etherscan');
        }

        const data = await response.json();
        if (data.status !== '1') {
            throw new ProtocolVerificationError('Contract is not verified');
        }

        const abi = JSON.parse(data.result);
        const events = this.extractEvents(abi);
        const functions = this.extractFunctions(abi);

        return {
            status: true,
            address,
            abi,
            events,
            functions
        };
    }

    private extractEvents(abi: any[]): EventInfo[] {
        return abi
            .filter(item => item.type === 'event')
            .map(item => ({
                name: item.name,
                signature: this.getEventSignature(item),
                topic0: ethers.id(this.getEventSignature(item)),
                inputs: item.inputs,
                abi: item
            }));
    }

    private extractFunctions(abi: any[]): FunctionInfo[] {
        return abi
            .filter(item => 
                item.type === 'function' && 
                item.stateMutability !== 'view' && 
                item.stateMutability !== 'pure'
            )
            .map(item => ({
                name: item.name,
                signature: this.getFunctionSignature(item),
                inputs: item.inputs,
                abi: item
            }));
    }

    private getEventSignature(event: any): string {
        return `${event.name}(${event.inputs.map((i: any) => i.type).join(',')})`;
    }

    private getFunctionSignature(func: any): string {
        return `${func.name}(${func.inputs.map((i: any) => i.type).join(',')})`;
    }
}