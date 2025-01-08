// src/utils/ProtocolUtils.ts

export class ProtocolUtils {
    static isAaveFunction(signature: string): boolean {
        return (
            signature.includes('supply') ||
            signature.includes('borrow') ||
            signature.includes('repay')
        );
    }

    static isCompoundFunction(signature: string): boolean {
        return (
            signature.includes('mint') ||
            signature.includes('redeem') ||
            signature.includes('borrow')
        );
    }

    static isUniswapFunction(signature: string): boolean {
        return (
            signature.includes('swap') ||
            signature.includes('addLiquidity') ||
            signature.includes('removeLiquidity')
        );
    }

    static getProtocolType(signature: string): string {
        if (this.isAaveFunction(signature)) return 'Aave';
        if (this.isCompoundFunction(signature)) return 'Compound';
        if (this.isUniswapFunction(signature)) return 'Uniswap';
        return 'Unknown';
    }
}
