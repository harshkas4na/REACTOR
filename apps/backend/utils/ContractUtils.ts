// src/utils/ContractUtils.ts

export class ContractUtils {
    static generateEventTopic(signature: string): string {
        return ethers.id(signature);
    }

    static formatBytecode(bytecode: string): string {
        return bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
    }

    static generateMethodId(signature: string): string {
        return ethers.id(signature).slice(0, 10);
    }

    static getEventSelector(event: any): string {
        const types = event.inputs.map((input: any) => input.type);
        return `${event.name}(${types.join(',')})`;
    }
}