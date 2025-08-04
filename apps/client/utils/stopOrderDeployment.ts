import { ethers } from "ethers";

// Import contract artifacts (you'll need to copy these from your existing imports)
import { stopOrderByteCodeSepolia } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABISepolia from '@/data/automations/stop-order/stopOrderABISeploia.json';
import { rscByteCodeSepolia } from '@/data/automations/stop-order/RSCByteCode';
import rscABISepolia from '@/data/automations/stop-order/RSCABISepolia.json';

import { stopOrderByteCodeMainnet } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABIMainnet from '@/data/automations/stop-order/stopOrderABIMainnet.json';
import { rscByteCodeMainnet } from '@/data/automations/stop-order/RSCByteCode';
import rscABIMainnet from '@/data/automations/stop-order/RSCABIMainnet.json';

import { stopOrderByteCodeAvalancheCChain } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABIAvalancheCChain from '@/data/automations/stop-order/stopOrderABIAvalancheCChain.json';
import { rscByteCodeAvalancheCChain } from '@/data/automations/stop-order/RSCByteCode';
import rscABIAvalancheCChain from '@/data/automations/stop-order/RSCABIAvalancheCChain.json';

export interface ChainConfig {
  id: string;
  name: string;
  dexName: string;
  routerAddress: string;
  factoryAddress: string;
  stopOrderABI: any;
  stopOrderBytecode: any;
  rscABI: any;
  rscBytecode: any;
  rpcUrl?: string;
  nativeCurrency: string;
  defaultFunding: string;
}

// Supported chains configuration
export const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    factoryAddress: '0x7e0987e5b3a30e3f2828572bb659a548460a3003',
    stopOrderABI: stopOrderABISepolia,
    stopOrderBytecode: stopOrderByteCodeSepolia,
    rscABI: rscABISepolia,
    rscBytecode: rscByteCodeSepolia,
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03'
  },
  {
    id: '1',
    name: 'Ethereum Mainnet',
    dexName: 'Uniswap V2',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    stopOrderABI: stopOrderABIMainnet,
    stopOrderBytecode: stopOrderByteCodeMainnet,
    rscABI: rscABIMainnet,
    rscBytecode: rscByteCodeMainnet,
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03'
  },
  {
    id: '43114',
    name: 'Avalanche C-Chain',
    dexName: 'Pangolin',
    routerAddress: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
    factoryAddress: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
    stopOrderABI: stopOrderABIAvalancheCChain,
    stopOrderBytecode: stopOrderByteCodeAvalancheCChain,
    rscABI: rscABIAvalancheCChain,
    rscBytecode: rscByteCodeAvalancheCChain,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX',
    defaultFunding: '0.01'
  }
];

// Helper function to get RSC network based on source chain
export function getRSCNetworkForChain(sourceChainId: string) {
  // Production chains use Reactive Mainnet
  if (sourceChainId === '1' || sourceChainId === '43114') {
    return {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT'
    };
  } 
  // Testnets use Lasna
  else {
    return {
      chainId: '5318007',
      name: 'Lasna Testnet',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'Lasna'
    };
  }
}

// Function to get callback sender address
function getCallbackSenderAddress(chainId: string): string {
  const callbackAddresses: Record<string, string> = {
    '1': '0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76',
    '56': '0xdb81A196A0dF9Ef974C9430495a09B6d535fAc48',
    '8453': '0x0D3E76De6bC44309083cAAFdB49A088B8a250947',
    '137': '0x42458259d5c85fB2bf117f197f1Fef8C3b7dCBfe',
    '43114': '0x934Ea75496562D4e83E80865c33dbA600644fCDa',
    '11155111': '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA'
  };
  return callbackAddresses[chainId] || '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA';
}

// Deploy destination contract function
export async function deployDestinationContract(chain: ChainConfig, fundingAmount: string): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    const callbackSenderAddress = getCallbackSenderAddress(currentChainId);
    
    if (!callbackSenderAddress || !ethers.isAddress(callbackSenderAddress)) {
      throw new Error("Invalid callback sender address for this chain.");
    }
    
    // Process the ABI
    let processedABI = chain.stopOrderABI;
    
    if (typeof processedABI === 'string') {
      processedABI = JSON.parse(processedABI);
    }
    
    if (processedABI && typeof processedABI === 'object' && !Array.isArray(processedABI)) {
      if ('abi' in processedABI) {
        processedABI = processedABI.abi;
      }
    }
    
    if (!Array.isArray(processedABI)) {
      processedABI = [
        {"type":"constructor","inputs":[{"name":"callback_sender","type":"address","internalType":"address"},{"name":"_router","type":"address","internalType":"address"}],"stateMutability":"payable"},
        {"type":"receive","stateMutability":"payable"},
        {"type":"function","name":"coverDebt","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"function","name":"pay","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"function","name":"stop","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"pair","type":"address","internalType":"address"},{"name":"client","type":"address","internalType":"address"},{"name":"is_token0","type":"bool","internalType":"bool"},{"name":"coefficient","type":"uint256","internalType":"uint256"},{"name":"threshold","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"event","name":"EthRefunded","inputs":[{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
        {"type":"event","name":"Stop","inputs":[{"name":"pair","type":"address","indexed":true,"internalType":"address"},{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"token","type":"address","indexed":true,"internalType":"address"},{"name":"tokens","type":"uint256[]","indexed":false,"internalType":"uint256[]"}],"anonymous":false}
      ];
    }
    
    const factory = new ethers.ContractFactory(
      processedABI,
      chain.stopOrderBytecode,
      signer
    );
    
    const contract = await factory.deploy(
      callbackSenderAddress,
      chain.routerAddress,
      { value: ethers.parseEther(fundingAmount) }
    );
    
    await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();
    
    return deployedAddress;
  } catch (error) {
    console.error("Detailed error in deployDestinationContract:", error);
    throw new Error(`Contract deployment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Approve tokens function
export async function approveTokens(tokenAddress: string, spenderAddress: string, amount: string) {
  try {
    if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(spenderAddress)) {
      throw new Error('Invalid address');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      signer
    );

    const decimals = await tokenContract.decimals();
    const parsedAmount = ethers.parseUnits(amount, decimals);
    
    const signerAddress = await signer.getAddress();
    const currentAllowance = await tokenContract.allowance(signerAddress, spenderAddress);
    
    if (currentAllowance.toString() !== "0" && currentAllowance < parsedAmount) {
      const resetTx = await tokenContract.approve(spenderAddress, 0);
      await resetTx.wait();
    }

    const tx = await tokenContract.approve(spenderAddress, parsedAmount);
    await tx.wait();
  } catch (error: any) {
    console.error('Error in approveTokens:', error);
    throw new Error(`Token approval failed: ${error.message || 'Unknown error'}`);
  }
}

// Network switching function
export async function switchNetwork(chainId: string) {
  if (!window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    if (currentChainId === chainId) {
      return true;
    }
    
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
    });
    
    const newNetwork = await provider.getNetwork();
    if (newNetwork.chainId.toString() !== chainId) {
      throw new Error('Network switch failed or was rejected');
    }
    
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
      if (!chain) throw new Error('Chain not supported in this application');
      
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${parseInt(chainId).toString(16)}`,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.id === '43114' ? 'AVAX' : 'ETH',
              symbol: chain.id === '43114' ? 'AVAX' : 'ETH',
              decimals: 18
            },
            rpcUrls: [chain.rpcUrl || ''],
            blockExplorerUrls: [
              chain.id === '1' ? 'https://etherscan.io' : 
              chain.id === '11155111' ? 'https://sepolia.etherscan.io' :
              chain.id === '43114' ? 'https://snowtrace.io' : ''
            ]
          }],
        });
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        if (network.chainId.toString() !== chainId) {
          throw new Error('Network add succeeded but switch failed or was rejected');
        }
        
        return true;
      } catch (addError: any) {
        throw new Error(`Failed to add chain: ${addError.message || 'User rejected the request'}`);
      }
    }
    throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
  }
}

// Switch to RSC network function
export async function switchToRSCNetwork(sourceChainId: string) {
  if (!window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

  try {
    const rscNetwork = getRSCNetworkForChain(sourceChainId);
    const rscChainIdHex = `0x${parseInt(rscNetwork.chainId).toString(16)}`;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    if (currentChainId === rscNetwork.chainId) {
      return true;
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: rscChainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: rscChainIdHex,
            chainName: rscNetwork.name,
            nativeCurrency: {
              name: rscNetwork.chainId === '1597' ? 'REACT' : 'Lasna',
              symbol: rscNetwork.chainId === '1597' ? 'REACT' : 'Lasna',
              decimals: 18
            },
            rpcUrls: [rscNetwork.rpcUrl],
            blockExplorerUrls: [
              rscNetwork.chainId === '1597' ? 'https://reactscan.net' : 'https://lasna.reactscan.net/'
            ]
          }],
        });
      } else {
        throw switchError;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedProvider = new ethers.BrowserProvider(window.ethereum);
    const updatedNetwork = await updatedProvider.getNetwork();
    const updatedChainId = updatedNetwork.chainId.toString();
    
    if (updatedChainId !== rscNetwork.chainId) {
      throw new Error(`Network switch verification failed. Expected ${rscNetwork.name} (${rscNetwork.chainId}) but got ${updatedChainId}`);
    }
    
    return true;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the request to switch networks');
    }
    
    throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
  }
}

// Deploy RSC function
export interface RSCParams {
  pair: string;
  stopOrder: string;
  client: string;
  token0: boolean;
  coefficient: string;
  threshold: string;
}

export async function deployRSC(params: RSCParams, chain: ChainConfig, fundingAmount: string) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const currentNetwork = await provider.getNetwork();
    const chainId = Number(currentNetwork.chainId);
    const rscNetwork = getRSCNetworkForChain(chain.id);

    if (chainId.toString() !== rscNetwork.chainId) {
      throw new Error(`Please switch to ${rscNetwork.name} for RSC deployment`);
    }

    // Process the ABI
    let processedABI = chain.rscABI;
    
    if (typeof processedABI === 'string') {
      processedABI = JSON.parse(processedABI);
    }
    
    if (processedABI && typeof processedABI === 'object' && !Array.isArray(processedABI)) {
      if ('abi' in processedABI) {
        processedABI = processedABI.abi;
      }
    }
    
    if (!Array.isArray(processedABI)) {
      processedABI = [
        {"type":"constructor","inputs":[{"name":"_pair","type":"address","internalType":"address"},{"name":"_stop_order","type":"address","internalType":"address"},{"name":"_client","type":"address","internalType":"address"},{"name":"_token0","type":"bool","internalType":"bool"},{"name":"_coefficient","type":"uint256","internalType":"uint256"},{"name":"_threshold","type":"uint256","internalType":"uint256"}],"stateMutability":"payable"},
        {"type":"receive","stateMutability":"payable"},
        {"type":"function","name":"coverDebt","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"function","name":"pay","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"function","name":"react","inputs":[{"name":"log","type":"tuple","internalType":"struct IReactive.LogRecord","components":[{"name":"chain_id","type":"uint256","internalType":"uint256"},{"name":"_contract","type":"address","internalType":"address"},{"name":"topic_0","type":"uint256","internalType":"uint256"},{"name":"topic_1","type":"uint256","internalType":"uint256"},{"name":"topic_2","type":"uint256","internalType":"uint256"},{"name":"topic_3","type":"uint256","internalType":"uint256"},{"name":"data","type":"bytes","internalType":"bytes"},{"name":"block_number","type":"uint256","internalType":"uint256"},{"name":"op_code","type":"uint256","internalType":"uint256"},{"name":"block_hash","type":"uint256","internalType":"uint256"},{"name":"tx_hash","type":"uint256","internalType":"uint256"},{"name":"log_index","type":"uint256","internalType":"uint256"}]}],"outputs":[],"stateMutability":"nonpayable"}
      ];
    }

    const factory = new ethers.ContractFactory(
      processedABI,
      chain.rscBytecode,
      signer
    );

    const pairAddress = ethers.getAddress(params.pair);
    const stopOrderAddress = ethers.getAddress(params.stopOrder);
    const clientAddress = ethers.getAddress(params.client);

    const deploymentGas = await factory.getDeployTransaction(
      pairAddress,
      stopOrderAddress,
      clientAddress,
      params.token0,
      params.coefficient,
      params.threshold
    ).then(tx => provider.estimateGas(tx));

    const gasLimit = (deploymentGas * BigInt(120)) / BigInt(100);
    const gasPrice = await provider.getFeeData().then(fees => fees.gasPrice);
    
    if (!gasPrice) throw new Error('Failed to get gas price');

    const signerAddress = await signer.getAddress();
    const balance = await provider.getBalance(signerAddress);
    const fundingValue = ethers.parseEther(fundingAmount);
    const requiredBalance = gasLimit * gasPrice + fundingValue;

    if (balance < requiredBalance) {
      throw new Error(`Insufficient balance for RSC deployment and funding. Need at least ${ethers.formatEther(requiredBalance)} ${rscNetwork.currencySymbol}`);
    }

    const contract = await factory.deploy(
      pairAddress,
      stopOrderAddress,
      clientAddress,
      params.token0,
      params.coefficient,
      params.threshold,
      {
        gasLimit,
        gasPrice,
        value: fundingValue
      }
    );

    const deployedContract = await contract.waitForDeployment();
    return deployedContract.target.toString();

  } catch (error: any) {
    console.error('Error deploying RSC:', error);
    throw new Error(`RSC deployment failed: ${error.message || 'Unknown error'}`);
  }
}
