
// src/constants/ProtocolConstants.ts

export const PROTOCOL_CONSTANTS = {
    AAVE: {
        FUNCTIONS: {
            SUPPLY: 'supply(address,uint256,address,uint16)',
            BORROW: 'borrow(address,uint256,uint256,uint16,address)',
            REPAY: 'repay(address,uint256,uint256,address)'
        },
        EVENTS: {
            SUPPLY: 'Supply(address,address,uint256,uint16)',
            BORROW: 'Borrow(address,address,uint256,uint256,uint16)',
            REPAY: 'Repay(address,address,uint256,bool)'
        },
        INTERFACES: {
            POOL: 'IPool',
            TOKEN: 'IERC20'
        }
    },
    COMPOUND: {
        FUNCTIONS: {
            MINT: 'mint(uint256)',
            REDEEM: 'redeem(uint256)',
            BORROW: 'borrow(uint256)'
        },
        EVENTS: {
            MINT: 'Mint(address,uint256,uint256)',
            REDEEM: 'Redeem(address,uint256,uint256)',
            BORROW: 'Borrow(address,uint256,uint256,uint256)'
        },
        INTERFACES: {
            CTOKEN: 'CErc20Interface',
            TOKEN: 'IERC20'
        }
    },
    UNISWAP: {
        FUNCTIONS: {
            SWAP: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
            ADD_LIQUIDITY: 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
            REMOVE_LIQUIDITY: 'removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)'
        },
        EVENTS: {
            SWAP: 'Swap(address,uint256,uint256,uint256,uint256,address)',
            MINT: 'Mint(address,uint256,uint256)',
            BURN: 'Burn(address,uint256,uint256,address)'
        },
        INTERFACES: {
            ROUTER: 'IUniswapV2Router02',
            PAIR: 'IUniswapV2Pair',
            FACTORY: 'IUniswapV2Factory'
        }
    }
};