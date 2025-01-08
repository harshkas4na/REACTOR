import { Protocol, Automation } from '@/types/automation'

export async function fetchProtocols(): Promise<Protocol[]> {
  // This would typically be an API call
  return [
    {
      id: '1',
      name: 'Uniswap',
      icon: '/icons/uniswap.svg',
      description: 'Decentralized trading protocol',
      chainIds: [1, 42161],
      supported: {
        events: ['Swap', 'Mint', 'Burn'],
        functions: ['addLiquidity', 'removeLiquidity', 'swap'],
      },
      verified: true,
    },
    {
      id: '2',
      name: 'Aave',
      icon: '/icons/aave.svg',
      description: 'Decentralized lending protocol',
      chainIds: [1, 137],
      supported: {
        events: ['Deposit', 'Borrow', 'Repay'],
        functions: ['deposit', 'borrow', 'repay'],
      },
      verified: true,
    },
  ]
}

export async function fetchAutomations(): Promise<Automation[]> {
  // This would typically be an API call
  return [
    {
      id: '1',
      name: 'Uniswap Liquidity Management',
      status: 'ACTIVE',
      protocol: {
        id: '1',
        name: 'Uniswap',
        icon: '/icons/uniswap.svg',
        description: 'Decentralized trading protocol',
        chainIds: [1],
        supported: {
          events: ['Swap'],
          functions: ['addLiquidity'],
        },
        verified: true,
      },
      contractAddress: '0x1234567890123456789012345678901234567890',
      eventMapping: {
        event: 'Swap',
        function: 'addLiquidity',
      },
      parameters: {
        gasPrice: '50',
        gasLimit: '200000',
      },
      createdAt: new Date('2023-05-01T12:00:00Z'),
      lastActive: new Date('2023-05-15T08:30:00Z'),
    },
    {
      id: '2',
      name: 'Aave Interest Rate Monitor',
      status: 'PENDING',
      protocol: {
        id: '2',
        name: 'Aave',
        icon: '/icons/aave.svg',
        description: 'Decentralized lending protocol',
        chainIds: [1],
        supported: {
          events: ['Deposit'],
          functions: ['borrow'],
        },
        verified: true,
      },
      contractAddress: '0x0987654321098765432109876543210987654321',
      eventMapping: {
        event: 'Deposit',
        function: 'borrow',
      },
      parameters: {
        gasPrice: '40',
        gasLimit: '150000',
      },
      createdAt: new Date('2023-05-10T15:00:00Z'),
      lastActive: new Date('2023-05-14T22:45:00Z'),
    },
  ]
}

