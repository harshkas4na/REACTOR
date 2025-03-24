'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, AlertCircle, Shield, Clock, Zap, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';
import PairFinder from '@/components/pair-finder'; // Import the PairFinder component

// Import all contract artifacts
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

// Define types for form data and pair info
interface StopOrderFormData {
  chainId: string;
  pairAddress: string;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
  destinationFunding: string;
  rscFunding: string;
}

interface PairInfo {
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  reserve0?: string;
  reserve1?: string;
}

interface ChainConfig {
  id: string;
  name: string;
  dexName: string; // Added DEX name to display in UI
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

// Configuration constants
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
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

type DeploymentStep = 'idle' | 'deploying-destination' | 'switching-network' | 'deploying-rsc' | 'switching-back' | 'approving' | 'complete';

export default function UniswapStopOrderPage() {
  const [formData, setFormData] = useState<StopOrderFormData>({
    chainId: '',
    pairAddress: '',
    sellToken0: true,
    clientAddress: '',
    coefficient: '1000',
    threshold: '',
    amount: '',
    destinationFunding: '',
    rscFunding: '0.05'
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [pairInfo, setPairInfo] = useState<PairInfo | null>(null);
  const [isLoadingPair, setIsLoadingPair] = useState<boolean>(false);
  
  // Find the currently selected chain configuration
  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
  // Set default DEX name to display if no chain is selected
  const dexName = selectedChain?.dexName || 'Uniswap V2';

  // Update destination funding when chain changes
  useEffect(() => {
    if (selectedChain) {
      setFormData(prev => ({
        ...prev,
        destinationFunding: selectedChain.defaultFunding
      }));
    }
  }, [formData.chainId]);

  useEffect(() => {
    const getConnectedAccount = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const account = accounts[0].address;
            setConnectedAccount(account);
            setFormData(prev => ({
              ...prev,
              clientAddress: account
            }));
          }
        } catch (error) {
          console.error('Error getting connected account:', error);
        }
      }
    };

    getConnectedAccount();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          setFormData(prev => ({
            ...prev,
            clientAddress: accounts[0]
          }));
        } else {
          setConnectedAccount('');
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Handle pair selection from the PairFinder component
  const handlePairSelected = (pairAddress: string, chainId: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    
    setFormData(prev => ({
      ...prev,
      pairAddress,
      chainId,
      destinationFunding: chain ? chain.defaultFunding : prev.destinationFunding
    }));
    
    // Fetch pair info for the selected pair
    handleFetchPairInfo(pairAddress);
    
    // Show success message
    toast.success('Pair selected! Scroll down to continue configuring your stop order.');
  };

  const handleFetchPairInfo = async (pairAddress: string) => {
    setIsLoadingPair(true);
    setFetchError('');
    
    try {
      if (!ethers.isAddress(pairAddress)) {
        throw new Error('Invalid pair address format');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();

      if (formData.chainId && currentChainId !== formData.chainId) {
        throw new Error('Please switch to the selected network');
      }

      const code = await provider.getCode(pairAddress);
      if (code === '0x' || code === '0x0') {
        throw new Error('No contract found at this address');
      }

      // The interface is the same for both Uniswap V2 and Pangolin pairs
      const pairInterface = new ethers.Interface([
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function getReserves() view returns (uint112, uint112, uint32)'
      ]);

      const pairContract = new ethers.Contract(pairAddress, pairInterface, provider);
      const [token0, token1, reserves] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.getReserves()
      ]);

      const erc20Interface = new ethers.Interface([
        'function symbol() view returns (string)'
      ]);

      let token0Symbol = 'Unknown', token1Symbol = 'Unknown';

      try {
        const token0Contract = new ethers.Contract(token0, erc20Interface, provider);
        token0Symbol = await token0Contract.symbol();
      } catch (error) {
        console.warn("Could not fetch token0 symbol:", error);
      }

      try {
        const token1Contract = new ethers.Contract(token1, erc20Interface, provider);
        token1Symbol = await token1Contract.symbol();
      } catch (error) {
        console.warn("Could not fetch token1 symbol:", error);
      }

      setPairInfo({
        token0,
        token1,
        token0Symbol,
        token1Symbol,
        reserve0: ethers.formatUnits(reserves[0], 18),
        reserve1: ethers.formatUnits(reserves[1], 18)
      });

    } catch (error: any) {
      console.error('Error fetching pair info:', error);
      setFetchError(error.message);
      setPairInfo(null);
    } finally {
      setIsLoadingPair(false);
    }
  };

  // Enhanced network switching function with better error handling
const switchNetwork = async (chainId: string) => {
  if (!window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

  try {
    // Check if already on the correct network
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    if (currentChainId === chainId) {
      console.log(`Already on chain ${chainId}`);
      return true;
    }
    
    console.log(`Switching to chain ${chainId}`);
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
    });
    
    // Verify the switch was successful
    const newNetwork = await provider.getNetwork();
    if (newNetwork.chainId.toString() !== chainId) {
      throw new Error('Network switch failed or was rejected');
    }
    
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      // Chain not added to wallet, attempt to add it
      console.log(`Chain ${chainId} not added to wallet, attempting to add it`);
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
        
        // Verify the add and switch was successful
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
};

// Helper function to determine which RSC network to use based on source chain ID
function getRSCNetworkForChain(sourceChainId:string) {
  // Production chains use Reactive Mainnet
  if (sourceChainId === '1' || sourceChainId === '43114') {
    return {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT'
    };
  } 
  // Testnets use Kopli
  else {
    return {
      chainId: '5318008',
      name: 'Kopli Testnet',
      rpcUrl: 'https://kopli-rpc.rnk.dev',
      currencySymbol: 'KOPLI'
    };
  }
}

// Enhanced network switching function that supports both REACT and Kopli
async function switchToRSCNetwork(sourceChainId:string) {
  if (!window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

  try {
    // Get the appropriate RSC network based on source chain
    const rscNetwork = getRSCNetworkForChain(sourceChainId);
    const rscChainIdHex = `0x${parseInt(rscNetwork.chainId).toString(16)}`;
    
    // Check if already on the correct RSC network
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    if (currentChainId === rscNetwork.chainId) {
      console.log(`Already on ${rscNetwork.name}`);
      return true;
    }
    
    console.log(`Switching to ${rscNetwork.name}...`);
    
    // Try to switch to the RSC network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: rscChainIdHex }],
      });
    } catch (switchError:any) {
      // If the chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        console.log(`${rscNetwork.name} not added to wallet, attempting to add it`);
        
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: rscChainIdHex,
            chainName: rscNetwork.name,
            nativeCurrency: {
              name: rscNetwork.chainId === '1597' ? 'REACT' : 'KOPLI',
              symbol: rscNetwork.chainId === '1597' ? 'REACT' : 'KOPLI',
              decimals: 18
            },
            rpcUrls: [rscNetwork.rpcUrl],
            blockExplorerUrls: [
              rscNetwork.chainId === '1597' ? 'https://reactscan.net' : 'https://kopli.reactscan.net'
            ]
          }],
        });
      } else {
        throw switchError;
      }
    }
    
    // Add a small delay to allow the network change to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the network after switching
    const updatedProvider = new ethers.BrowserProvider(window.ethereum);
    const updatedNetwork = await updatedProvider.getNetwork();
    const updatedChainId = updatedNetwork.chainId.toString();
    
    console.log(`After switch, current chain ID: ${updatedChainId}`);
    
    if (updatedChainId !== rscNetwork.chainId) {
      throw new Error(`Network switch verification failed. Expected ${rscNetwork.name} (${rscNetwork.chainId}) but got ${updatedChainId}`);
    }
    
    return true;
  } catch (error:any) {
    // For specific common errors, provide better messages
    if (error.code === 4001) {
      throw new Error('User rejected the request to switch networks');
    }
    
    throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
  }
}



  // Function to get the correct callback sender address based on chain ID
function getCallbackSenderAddress(chainId: string): string {
  // Map of chain IDs to callback sender addresses
  const callbackAddresses: Record<string, string> = {
    // Ethereum Mainnet
    '1': '0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76',
    // BNB Smart Chain
    '56': '0xdb81A196A0dF9Ef974C9430495a09B6d535fAc48',
    // Base
    '8453': '0x0D3E76De6bC44309083cAAFdB49A088B8a250947',
    // Polygon PoS
    '137': '0x42458259d5c85fB2bf117f197f1Fef8C3b7dCBfe',
    // Avalanche C-Chain
    '43114': '0x934Ea75496562D4e83E80865c33dbA600644fCDa',
    // Sepolia (using the existing address from your code)
    '11155111': '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA'
  };

  // Return the correct address or default to Sepolia if not found
  return callbackAddresses[chainId] || '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA';
}

// Fix for the deployDestinationContract function
async function deployDestinationContract(chain: ChainConfig, fundingAmount: string): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Get the current network to ensure we're using the right callback address
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    // Get the correct callback sender address for this chain
    const callbackSenderAddress = getCallbackSenderAddress(currentChainId);
    
    if (!callbackSenderAddress || !ethers.isAddress(callbackSenderAddress)) {
      throw new Error("Invalid callback sender address for this chain.");
    }
    
    console.log("Chain ID:", currentChainId);
    console.log("Using callback sender address:", callbackSenderAddress);
    console.log("Using router address:", chain.routerAddress);
    console.log("Funding amount:", fundingAmount);
    
    // Process the ABI to make sure it's usable
    let processedABI = chain.stopOrderABI;
    console.log("Stop Order ABI type:", typeof processedABI);
    
    // If it's a JSON string, parse it
    if (typeof processedABI === 'string') {
      try {
        processedABI = JSON.parse(processedABI);
        console.log("Parsed Stop Order ABI from string");
      } catch (e) {
        console.error("Failed to parse Stop Order ABI string:", e);
      }
    }
    
    // Handle case when ABI is in an object with 'abi' property
    if (processedABI && typeof processedABI === 'object' && !Array.isArray(processedABI)) {
      if ('abi' in processedABI) {
        console.log("Extracted Stop Order ABI from object.abi property");
        processedABI = processedABI.abi;
      }
    }
    
    
    
    // Verify that we now have an array
    if (!Array.isArray(processedABI)) {
      console.error("Stop Order ABI is not an array:", processedABI);
      // Use hardcoded ABI as a fallback
      processedABI = [
        {"type":"constructor","inputs":[{"name":"callback_sender","type":"address","internalType":"address"},{"name":"_router","type":"address","internalType":"address"}],"stateMutability":"payable"},
        {"type":"receive","stateMutability":"payable"},
        {"type":"function","name":"coverDebt","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"function","name":"pay","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"function","name":"stop","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"pair","type":"address","internalType":"address"},{"name":"client","type":"address","internalType":"address"},{"name":"is_token0","type":"bool","internalType":"bool"},{"name":"coefficient","type":"uint256","internalType":"uint256"},{"name":"threshold","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
        {"type":"event","name":"EthRefunded","inputs":[{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
        {"type":"event","name":"Stop","inputs":[{"name":"pair","type":"address","indexed":true,"internalType":"address"},{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"token","type":"address","indexed":true,"internalType":"address"},{"name":"tokens","type":"uint256[]","indexed":false,"internalType":"uint256[]"}],"anonymous":false}
      ];
      console.log("Using hardcoded Stop Order ABI");
    }
    
    console.log("Final Stop Order ABI is array:", Array.isArray(processedABI), "with length:", processedABI.length);
    
    // Create contract factory with processed ABI
    const factory = new ethers.ContractFactory(
      processedABI,
      chain.stopOrderBytecode,
      signer
    );
    
    // Deploy with both required constructor parameters and user-defined funding
    const contract = await factory.deploy(
      callbackSenderAddress,
      chain.routerAddress,
      { value: ethers.parseEther(fundingAmount) }
    );
    
    console.log("Deployment transaction sent:", contract.deploymentTransaction()?.hash);
    
    // Wait for deployment
    await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();
    
    console.log("Contract deployed at:", deployedAddress);
    return deployedAddress;
  } catch (error) {
    console.error("Detailed error in deployDestinationContract:", error);
    
    // Add more context to the error for debugging
    if (error instanceof Error) {
      throw new Error(`Contract deployment failed: ${error.message}`);
    } else {
      throw new Error(`Contract deployment failed with unknown error: ${String(error)}`);
    }
  }
}

  async function approveTokens(tokenAddress: string, spenderAddress: string, amount: string) {
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

  interface RSCParams {
    pair: string;
    stopOrder: string;
    client: string;
    token0: boolean;
    coefficient: string;
    threshold: string;
  }

  async function deployRSC(params: RSCParams, chain: ChainConfig, fundingAmount: string) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const currentNetwork = await provider.getNetwork();
    const chainId = Number(currentNetwork.chainId);
    const rscNetwork = getRSCNetworkForChain(chain.id);

    if (chainId.toString() !== rscNetwork.chainId) {
      throw new Error(`Please switch to ${rscNetwork.name} for RSC deployment`);
    }

    // Process the ABI to make sure it's usable
    let processedABI = chain.rscABI;
    console.log("RSC ABI type:", typeof processedABI);
    
    // If it's a JSON string, parse it
    if (typeof processedABI === 'string') {
      try {
        processedABI = JSON.parse(processedABI);
        console.log("Parsed RSC ABI from string");
      } catch (e) {
        console.error("Failed to parse RSC ABI string:", e);
      }
    }
    
    // Handle case when ABI is in an object with 'abi' property
    if (processedABI && typeof processedABI === 'object' && !Array.isArray(processedABI)) {
      if ('abi' in processedABI) {
        console.log("Extracted RSC ABI from object.abi property");
        processedABI = processedABI.abi;
      }
    }
    
    
    // Verify that we now have an array
    if (!Array.isArray(processedABI)) {
      console.error("RSC ABI is not an array:", processedABI);
      // Try using the parsed ABI data from the document you shared
      const parsedData = {
        "abi":[
          {"type":"constructor","inputs":[{"name":"_pair","type":"address","internalType":"address"},{"name":"_stop_order","type":"address","internalType":"address"},{"name":"_client","type":"address","internalType":"address"},{"name":"_token0","type":"bool","internalType":"bool"},{"name":"_coefficient","type":"uint256","internalType":"uint256"},{"name":"_threshold","type":"uint256","internalType":"uint256"}],"stateMutability":"payable"},
          {"type":"receive","stateMutability":"payable"},
          {"type":"function","name":"coverDebt","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
          {"type":"function","name":"pay","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
          {"type":"function","name":"react","inputs":[{"name":"log","type":"tuple","internalType":"struct IReactive.LogRecord","components":[{"name":"chain_id","type":"uint256","internalType":"uint256"},{"name":"_contract","type":"address","internalType":"address"},{"name":"topic_0","type":"uint256","internalType":"uint256"},{"name":"topic_1","type":"uint256","internalType":"uint256"},{"name":"topic_2","type":"uint256","internalType":"uint256"},{"name":"topic_3","type":"uint256","internalType":"uint256"},{"name":"data","type":"bytes","internalType":"bytes"},{"name":"block_number","type":"uint256","internalType":"uint256"},{"name":"data","type":"bytes","internalType":"bytes"},{"name":"block_number","type":"uint256","internalType":"uint256"},{"name":"op_code","type":"uint256","internalType":"uint256"},{"name":"block_hash","type":"uint256","internalType":"uint256"},{"name":"tx_hash","type":"uint256","internalType":"uint256"},{"name":"log_index","type":"uint256","internalType":"uint256"}]}],"outputs":[],"stateMutability":"nonpayable"},
          {"type":"event","name":"AboveThreshold","inputs":[{"name":"reserve0","type":"uint112","indexed":true,"internalType":"uint112"},{"name":"reserve1","type":"uint112","indexed":true,"internalType":"uint112"},{"name":"coefficient","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"threshold","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
          {"type":"event","name":"Callback","inputs":[{"name":"chain_id","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"_contract","type":"address","indexed":true,"internalType":"address"},{"name":"gas_limit","type":"uint64","indexed":true,"internalType":"uint64"},{"name":"payload","type":"bytes","indexed":false,"internalType":"bytes"}],"anonymous":false},
          {"type":"event","name":"CallbackSent","inputs":[],"anonymous":false},
          {"type":"event","name":"Done","inputs":[],"anonymous":false},
          {"type":"event","name":"ReactRefunded","inputs":[{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
          {"type":"event","name":"Subscribed","inputs":[{"name":"service_address","type":"address","indexed":true,"internalType":"address"},{"name":"_contract","type":"address","indexed":true,"internalType":"address"},{"name":"topic_0","type":"uint256","indexed":true,"internalType":"uint256"}],"anonymous":false},
          {"type":"event","name":"VM","inputs":[],"anonymous":false}
        ],
        "bytecode": chain.rscBytecode
      };
      
      processedABI = parsedData.abi;
      console.log("Using hardcoded ABI from shared document");
    }
    
    console.log("Final RSC ABI is array:", Array.isArray(processedABI), "with length:", processedABI.length);

    // Create contract factory with proper error handling
    const factory = new ethers.ContractFactory(
      processedABI,
      chain.rscBytecode,
      signer
    );

    const deploymentGas = await factory.getDeployTransaction(
      params.pair,
      params.stopOrder,
      params.client,
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

    // Deploy with user-defined REACT funding
    const contract = await factory.deploy(
      params.pair,
      params.stopOrder,
      params.client,
      params.token0,
      params.coefficient,
      params.threshold,
      {
        gasLimit,
        gasPrice,
        value: fundingValue // Using user-defined REACT funding
      }
    );

    const deployedContract = await contract.waitForDeployment();
    return deployedContract.target.toString();

  } catch (error: any) {
    console.error('Error deploying RSC:', error);
    throw new Error(`RSC deployment failed: ${error.message || 'Unknown error'}`);
  }
}

 // Update the handleCreateOrder function to use the correct RSC network based on source chain
const handleCreateOrder = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    // Form validation
    if (!formData.chainId) {
      throw new Error('Please select a blockchain network');
    }
    if (!formData.pairAddress || !ethers.isAddress(formData.pairAddress)) {
      throw new Error('Please enter a valid pair address');
    }
    if (!formData.clientAddress || !ethers.isAddress(formData.clientAddress)) {
      throw new Error('Please enter a valid client address');
    }
    if (!formData.threshold) {
      throw new Error('Please enter a threshold value');
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      throw new Error('Please enter a valid amount to sell');
    }
    if (!formData.destinationFunding || parseFloat(formData.destinationFunding) <= 0) {
      throw new Error('Please enter a valid destination funding amount');
    }
    if (!formData.rscFunding || parseFloat(formData.rscFunding) <= 0) {
      throw new Error('Please enter a valid RSC funding amount');
    }
    
    // Get selected chain configuration
    const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
    if (!selectedChain) throw new Error('Invalid chain selected');

    // Check if user is on the correct network
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = network.chainId.toString();
    
    if (currentChainId !== formData.chainId) {
      throw new Error(`Please switch to ${selectedChain.name} network before proceeding`);
    }

    // Check if user has enough balance for destination contract deployment
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const balance = await provider.getBalance(signerAddress);
    
    // Add 10% to account for gas
    const destinationFunding = ethers.parseEther(formData.destinationFunding);
    const estimatedCost = destinationFunding + (destinationFunding * BigInt(10)) / BigInt(100);

    if (balance < estimatedCost) {
      throw new Error(`Insufficient balance for deployment. You need at least ${ethers.formatEther(estimatedCost)} ${selectedChain.nativeCurrency} on ${selectedChain.name}`);
    }

    // Step 1: Deploy Destination Contract
    setDeploymentStep('deploying-destination');
    let destinationAddress;
    try {
      destinationAddress = await deployDestinationContract(selectedChain, formData.destinationFunding);
    } catch (error: any) {
      console.error("Destination contract deployment failed:", error);
      throw new Error(`Failed to deploy destination contract: ${error.message || 'Unknown error'}`);
    }

    //Step 2: Approve Token Spending
    setDeploymentStep('approving');
    const tokenToApprove = formData.sellToken0 ? pairInfo?.token0 : pairInfo?.token1;
    if (!tokenToApprove) throw new Error('Token address not found');
    
    try {
      await approveTokens(
        tokenToApprove,
        destinationAddress,
        formData.amount
      );
    } catch (error: any) {
      if (error.message.includes("insufficient allowance")) {
        throw new Error(`Token approval failed: You don't have enough ${formData.sellToken0 ? pairInfo?.token0Symbol : pairInfo?.token1Symbol} tokens`);
      } else {
        throw new Error(`Token approval failed: ${error.message}`);
      }
    }

    // Step 3: Switch to the appropriate RSC network based on source chain
    // For mainnet networks (chainId 1, 43114), use REACT (1597)
    // For testnets like Sepolia (11155111), use Kopli (5318008)
    setDeploymentStep('switching-network');
    
    // Determine the RSC network to use based on source chain
    const rscNetwork = getRSCNetworkForChain(formData.chainId);
    
    try {
      await switchToRSCNetwork(formData.chainId);
    } catch (error: any) {
      throw new Error(`Failed to switch to ${rscNetwork.name} network: ${error.message}. Please add ${rscNetwork.name} network to your wallet manually.`);
    }

    // Check if user has enough REACT/KOPLI for RSC deployment
    const rscProvider = new ethers.BrowserProvider(window.ethereum);
    const rscBalance = await rscProvider.getBalance(signerAddress);
    
    // Add 10% to account for gas
    const rscFunding = ethers.parseEther(formData.rscFunding);
    const rscEstimatedCost = rscFunding + (rscFunding * BigInt(10)) / BigInt(100);

    if (rscBalance < rscEstimatedCost) {
      throw new Error(`Insufficient ${rscNetwork.currencySymbol} balance. You need at least ${ethers.formatEther(rscEstimatedCost)} ${rscNetwork.currencySymbol} on ${rscNetwork.name} network. Please obtain some ${rscNetwork.currencySymbol} from the faucet.`);
    }

    // Step 4: Deploy RSC
    setDeploymentStep('deploying-rsc');
    try {
      await deployRSC({
        pair: formData.pairAddress,
        stopOrder: destinationAddress,
        client: formData.clientAddress,
        token0: formData.sellToken0,
        coefficient: formData.coefficient,
        threshold: formData.threshold
      }, selectedChain, formData.rscFunding);
    } catch (error: any) {
      console.error("RSC deployment failed:", error);
      if (error.message.includes("insufficient funds")) {
        throw new Error(`RSC deployment failed: Insufficient ${rscNetwork.currencySymbol}. You need at least ${formData.rscFunding} ${rscNetwork.currencySymbol} plus gas.`);
      } else {
        throw new Error(`RSC deployment failed: ${error.message}`);
      }
    }

    // Step 5: Switch back to the original network if needed
    setDeploymentStep('switching-back');
    try {
      if (formData.chainId !== rscNetwork.chainId) {
        await switchNetwork(formData.chainId);
      }
    } catch (error: any) {
      console.warn(`Note: Failed to switch back to original network: ${error.message}`);
      // Don't throw here, as the order was still created successfully
    }

    setDeploymentStep('complete');
    toast.success('Stop order created successfully!');
    
    // Add a helpful message about what to expect
    setTimeout(() => {
      toast.success('Your stop order is now active and monitoring prices 24/7');
    }, 1000);
    
  } catch (error: any) {
    console.error('Error creating stop order:', error);
    
    // Clear the deployment step to allow retrying
    setDeploymentStep('idle');
    
    // Show detailed error message
    toast.error(error.message || 'Failed to create stop order');
    
    // Provide guidance based on error type
    if (error.message.includes("Insufficient balance") || error.message.includes("insufficient funds")) {
      toast.error('Please make sure you have enough funds for both deployment and gas fees');
    } else if (error.message.includes("approval") || error.message.includes("allowance")) {
      toast.error('Please ensure you have enough tokens and have granted approval');
    } else if (error.message.includes("switch")) {
      toast.error('Please add the required RSC network to your wallet if not already added');
    }
  }
};

  // Helper function to check if user has sufficient balance for operations
  async function checkBalances() {
    if (!window.ethereum) throw new Error('No wallet detected');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Check balance on current chain
      const currentNetwork = await provider.getNetwork();
      const currentChainId = currentNetwork.chainId.toString();
      const nativeBalance = await provider.getBalance(userAddress);
      
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) return null;
      
      // Get RSC network info
      const rscNetwork = getRSCNetworkForChain(formData.chainId);
      
      // If we're on the source chain
      if (currentChainId === formData.chainId) {
        // Add 10% to account for gas
        const destinationFunding = ethers.parseEther(formData.destinationFunding || selectedChain.defaultFunding);
        const requiredBalance = destinationFunding + (destinationFunding * BigInt(10)) / BigInt(100);
        const hasEnoughForDestination = nativeBalance >= requiredBalance;
        
        // Check token balance if pair info is available
        let tokenBalance = null;
        let hasEnoughTokens = false;
        
        if (pairInfo) {
          const tokenToSell = formData.sellToken0 ? pairInfo.token0 : pairInfo.token1;
          const tokenSymbol = formData.sellToken0 ? pairInfo.token0Symbol : pairInfo.token1Symbol;
          
          try {
            const tokenContract = new ethers.Contract(
              tokenToSell,
              ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
              provider
            );
            
            const decimals = await tokenContract.decimals();
            tokenBalance = await tokenContract.balanceOf(userAddress);
            const requiredTokenAmount = ethers.parseUnits(formData.amount || '0', decimals);
            
            hasEnoughTokens = tokenBalance >= requiredTokenAmount;
          } catch (error) {
            console.error("Error checking token balance:", error);
          }
        }
        
        return {
          isSourceChain: true,
          nativeBalance: ethers.formatEther(nativeBalance),
          requiredNativeBalance: ethers.formatEther(requiredBalance),
          nativeSymbol: selectedChain.nativeCurrency,
          hasEnoughForDestination,
          tokenBalance: tokenBalance ? ethers.formatUnits(tokenBalance, 18) : null,
          hasEnoughTokens,
          tokenSymbol: formData.sellToken0 ? pairInfo?.token0Symbol : pairInfo?.token1Symbol
        };
      }
      
      // If we're on the RSC network (either REACT or Kopli)
      if (currentChainId === rscNetwork.chainId) {
        // Add 10% to account for gas
        const rscFunding = ethers.parseEther(formData.rscFunding || "0.05");
        const requiredBalance = rscFunding + (rscFunding * BigInt(10)) / BigInt(100);
        const hasEnoughForRSC = nativeBalance >= requiredBalance;
        
        return {
          isSourceChain: false,
          nativeBalance: ethers.formatEther(nativeBalance),
          requiredNativeBalance: ethers.formatEther(requiredBalance),
          nativeSymbol: rscNetwork.currencySymbol,
          hasEnoughForRSC
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error checking balances:", error);
      return null;
    }
  }
  
  // Update the UI for Funding Configuration to dynamically show correct RSC currency
  const FundingConfigurationUI = () => {
    // Get RSC network details based on source chain
    const rscNetwork = getRSCNetworkForChain(formData.chainId);
    
    return (
      <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
        <h3 className="text-sm font-medium text-zinc-100">Contract Funding</h3>
        
        {/* Destination Contract Funding */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-zinc-200">
              Destination Contract Funding ({selectedChain?.nativeCurrency || 'ETH'})
            </label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80 text-zinc-200">
                <p className="text-sm">
                  Amount of {selectedChain?.nativeCurrency || 'ETH'} to fund the destination contract.
                  This is used to pay for transaction fees when your stop order executes.
                  Recommended: {selectedChain?.defaultFunding || '0.03'} {selectedChain?.nativeCurrency || 'ETH'}
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input 
            type="number"
            step="0.001"
            placeholder={`Enter amount (${selectedChain?.nativeCurrency || 'ETH'})`}
            value={formData.destinationFunding}
            onChange={(e) => setFormData({...formData, destinationFunding: e.target.value})}
            className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        
        {/* RSC Contract Funding - dynamically show REACT or KOPLI */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-zinc-200">
              RSC Contract Funding ({rscNetwork.currencySymbol})
            </label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80 text-zinc-200">
                <p className="text-sm">
                  Amount of {rscNetwork.currencySymbol} to fund the Reactive Smart Contract on {rscNetwork.name}.
                  This is used to monitor for price changes and trigger the stop order.
                  Recommended: 0.05 {rscNetwork.currencySymbol}
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input 
            type="number"
            step="0.001"
            placeholder={`Enter amount (${rscNetwork.currencySymbol})`}
            value={formData.rscFunding}
            onChange={(e) => setFormData({...formData, rscFunding: e.target.value})}
            className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
      </div>
    );
  };
  
  // Update the deployment status UI to show correct network information
  const DeploymentStatusUI = () => {
    // Get RSC network details based on source chain
    const rscNetwork = getRSCNetworkForChain(formData.chainId);
    
    return (
      <>
      {deploymentStep !== 'idle' && (
        <Alert className={
          deploymentStep === 'complete' 
            ? "bg-green-900/20 border-green-500/50" 
            : "bg-blue-900/20 border-blue-500/50"
        }>
          {deploymentStep === 'complete' 
            ? <CheckCircle className="h-4 w-4 text-green-400" /> 
            : <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
          }
          <AlertDescription className="text-zinc-200">
            {deploymentStep === 'deploying-destination' && (
              <div className="flex flex-col gap-1">
                <span>Deploying destination contract...</span>
                <span className="text-xs text-zinc-400">This will require approximately {formData.destinationFunding} {selectedChain?.nativeCurrency || 'ETH'} plus gas fees</span>
              </div>
            )}
            {deploymentStep === 'switching-network' && (
              <div className="flex flex-col gap-1">
                <span>Switching to {rscNetwork.name}...</span>
                <span className="text-xs text-zinc-400">Please confirm the network change in your wallet</span>
              </div>
            )}
            {deploymentStep === 'deploying-rsc' && (
              <div className="flex flex-col gap-1">
                <span>Deploying reactive smart contract...</span>
                <span className="text-xs text-zinc-400">This will require {formData.rscFunding} {rscNetwork.currencySymbol} plus gas fees</span>
              </div>
            )}
            {deploymentStep === 'switching-back' && (
              <div className="flex flex-col gap-1">
                <span>Switching back to {selectedChain?.name}...</span>
                <span className="text-xs text-zinc-400">Please confirm the network change in your wallet</span>
              </div>
            )}
            {deploymentStep === 'approving' && (
              <div className="flex flex-col gap-1">
                <span>Approving token spending...</span>
                <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
              </div>
            )}
            {deploymentStep === 'complete' && (
              <div className="flex flex-col gap-1">
                <span>Stop order created successfully!</span>
                <span className="text-xs text-zinc-400">Your order is now active and monitoring prices 24/7</span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      </>
    );
  };

// Function to show balance warnings and return validation state
function BalanceWarnings() {
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  
  // Function to refresh balance data
  const refreshBalances = async () => {
    if (!formData.chainId || !connectedAccount) {
      setIsValid(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const info = await checkBalances();
      setBalanceInfo(info);
      
      // Check if all conditions are met
      if (info) {
        const hasRequiredBalances = info.isSourceChain ? 
          (info.hasEnoughForDestination && (!info.tokenBalance || info.hasEnoughTokens)) : 
          info.hasEnoughForRSC;
          
        const formIsValid = 
          !!formData.chainId && 
          !!formData.pairAddress && 
          !!formData.clientAddress && 
          !!formData.threshold && 
          !!formData.amount && 
          parseFloat(formData.amount) > 0 &&
          !!formData.destinationFunding &&
          parseFloat(formData.destinationFunding) > 0 &&
          !!formData.rscFunding &&
          parseFloat(formData.rscFunding) > 0 &&
          !!pairInfo &&
          hasRequiredBalances;
          
        setIsValid(formIsValid as boolean);
      } else {
        setIsValid(false);
      }
    } catch (error) {
      console.error("Error refreshing balances:", error);
      setIsValid(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine RSC network details based on source chain
  const rscNetwork = getRSCNetworkForChain(formData.chainId);
  
  // Check balances when relevant form data changes
  useEffect(() => {
    refreshBalances();
  }, [formData.chainId, formData.pairAddress, formData.clientAddress, formData.amount, formData.threshold, formData.sellToken0, formData.destinationFunding, formData.rscFunding, connectedAccount, pairInfo]);
  
  // Return both the UI and validation state
  return {
    isValid,
    warningsUI: (
      <div className="space-y-2">
        {balanceInfo?.isSourceChain && (
          <>
            {!balanceInfo.hasEnoughForDestination && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  You need at least {balanceInfo.requiredNativeBalance} {balanceInfo.nativeSymbol} on {
                    SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId)?.name
                  } for the destination contract.
                  Current balance: {balanceInfo.nativeBalance} {balanceInfo.nativeSymbol}
                </AlertDescription>
              </Alert>
            )}
            
            {balanceInfo.tokenBalance !== null && !balanceInfo.hasEnoughTokens && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  You don't have enough {balanceInfo.tokenSymbol} tokens to sell {formData.amount || '0'}.
                  Current balance: {balanceInfo.tokenBalance}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
        
        {balanceInfo && !balanceInfo.isSourceChain && balanceInfo.hasEnoughForRSC === false && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              You need at least {balanceInfo.requiredNativeBalance || "0.05"} {rscNetwork.currencySymbol} on {rscNetwork.name} for the RSC contract.
              Current balance: {balanceInfo.nativeBalance || "0"} {rscNetwork.currencySymbol}
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full bg-blue-900/20 border-blue-500/20 text-blue-400 hover:bg-blue-800/30"
          onClick={refreshBalances}
        >
          <RefreshCw className="h-3 w-3 mr-2" /> Refresh Balance Info
        </Button>
      </div>
    )
  };
}

  // Get current price ratio if pair info is available
  const currentPriceRatio = pairInfo && pairInfo.reserve0 && pairInfo.reserve1 
    ? formData.sellToken0 
      ? (parseFloat(pairInfo.reserve1) / parseFloat(pairInfo.reserve0)).toFixed(8) 
      : (parseFloat(pairInfo.reserve0) / parseFloat(pairInfo.reserve1)).toFixed(8)
    : 'Not available';

  const { isValid, warningsUI } = BalanceWarnings();

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Multi-Chain Stop Order
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Set up automatic sell orders across Ethereum Mainnet, Sepolia testnet, and Avalanche C-Chain - protecting your positions across multiple networks.
          </p>
          
          {/* Features Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Cross-Chain Protection</h3>
                    <p className="text-sm text-zinc-300">Monitor multiple networks</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">24/7 Monitoring</h3>
                    <p className="text-sm text-gray-200">Automatic execution</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Network Flexibility</h3>
                    <p className="text-sm text-gray-200">Choose your preferred chain</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pair Finder Tool */}
        <PairFinder 
          chains={SUPPORTED_CHAINS} 
          onPairSelect={handlePairSelected} 
        />

        {/* Main Form Card */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-12">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Create Stop Order</CardTitle>
            <CardDescription className="text-zinc-300">Configure your automated token swap</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleCreateOrder}>
              {/* Chain Selection */}
              <div className="space-y-2">
                <div className="flex items-center mt-4 space-x-2">
                  <label className="text-sm font-medium text-zinc-200">Select Chain</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <p className="text-sm text-zinc-200">
                        Choose the blockchain network where your tokens are located.
                        Available networks: Ethereum Mainnet, Sepolia testnet, and Avalanche C-Chain.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Select
                  value={formData.chainId}
                  onValueChange={(value) => {
                    const chain = SUPPORTED_CHAINS.find(c => c.id === value);
                    setFormData({ 
                      ...formData, 
                      chainId: value,
                      destinationFunding: chain ? chain.defaultFunding : formData.destinationFunding
                    });
                    if (chain) switchNetwork(chain.id);
                  }}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map(chain => (
                      <SelectItem 
                        key={chain.id} 
                        value={chain.id}
                        className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                      >
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

               {/* Pair Address - Dynamic label based on selected chain */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">{dexName} Pair Address</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm">
                        Enter the {dexName} pair contract address where you want to create the stop order.
                        This is the pool containing both tokens you want to trade.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <Input 
                placeholder="Enter pair address (0x...)"
                value={formData.pairAddress}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              
                onChange={(e) => setFormData({...formData, pairAddress: e.target.value})}
                onBlur={(e) => {
                    if (ethers.isAddress(e.target.value)) {
                    handleFetchPairInfo(e.target.value);
                    }
                }}
              />
            </div>

            {isLoadingPair && (
            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-zinc-200">Fetching pair information...</span>
                </div>
            </div>
            )}

            {fetchError && (
            <Alert variant="destructive" className="mt-2 bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                {fetchError}
                </AlertDescription>
            </Alert>
            )}
            
            {pairInfo && (
            <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-6">
                <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Token 0</p>
                    <p className="text-xs text-zinc-400 break-all">{pairInfo.token0}</p>
                    <p className="text-sm text-blue-400">{pairInfo.token0Symbol}</p>
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Token 1</p>
                    <p className="text-xs text-zinc-400 break-all">{pairInfo.token1}</p>
                    <p className="text-sm text-blue-400">{pairInfo.token1Symbol}</p>
                </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-zinc-300">
                <p className="text-sm truncate">
                    <span className="font-medium">Reserve 0:</span> {pairInfo.reserve0}
                </p>
                <p className="text-sm truncate">
                    <span className="font-medium">Reserve 1:</span> {pairInfo.reserve1}
                </p>
                </div>
            </div>
            )}

              {/* Token Pair Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-zinc-200">Token Pair</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-zinc-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-zinc-200">
                    <p className="text-sm">
                      Enter the addresses of both tokens in the trading pair.
                      The order doesn't matter - you'll select which one to sell next.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            
              <Input
                placeholder="Token 0 Address"
                disabled
                value={pairInfo?.token0 || ''}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
              <Input 
                placeholder="Token 1 Address"
                disabled
                value={pairInfo?.token1 || ''}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
              
              {/* Sell Direction - Improved Styling */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-200">Select Token to Sell</label>
                <Select
                  value={formData.sellToken0 ? "token0" : "token1"}
                  onValueChange={(value) => setFormData({...formData, sellToken0: value === "token0"})}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select token to sell" />
                  </SelectTrigger>
                  {/* Fixed content styling to improve visibility */}
                  <SelectContent 
                    className="bg-zinc-900 border border-zinc-700" 
                    position="popper"
                    sideOffset={4}
                  >
                    <SelectItem 
                      value="token0" 
                      className="text-zinc-200 focus:bg-blue-800/30 hover:bg-blue-800/30 cursor-pointer"
                    >
                      {pairInfo?.token0Symbol || 'Token 0'}
                    </SelectItem>
                    <SelectItem 
                      value="token1" 
                      className="text-zinc-200 focus:bg-blue-800/30 hover:bg-blue-800/30 cursor-pointer"
                    >
                      {pairInfo?.token1Symbol || 'Token 1'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client Address */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-zinc-200">Client Address</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-zinc-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-zinc-200">
                    <p className="text-sm">
                      The address that has approved token spending and will receive 
                      the swapped tokens. Make sure this address has approved the contract
                      to spend the tokens you want to sell.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <Input 
                placeholder="Enter client address"
                value={formData.clientAddress}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>

            {/* Threshold Configuration */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Price Threshold Settings</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80  text-gray-200">
                      <div className="space-y-2">
                        <h4 className="font-medium">Understanding Threshold Settings</h4>
                        <p className="text-sm text-gray-200">
                          Coefficient and threshold work together to determine when your order triggers.
                          For example, to sell when price drops to 0.95 of current price:
                          - Set coefficient to 1000
                          - Set threshold to 950
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Input 
                  type="number"
                  placeholder="Coefficient (e.g., 1000)"
                  value={formData.coefficient}
                  onChange={(e) => setFormData({...formData, coefficient: e.target.value})}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
                <Input 
                  type="number"
                  placeholder="Threshold"
                  value={formData.threshold}
                  onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
                <p className="text-sm text-gray-400">
                  Current Price Ratio: {currentPriceRatio}
                </p>
              </div>

              {/* Amount to Sell */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Amount to Sell</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80  text-gray-200">
                      <p className="text-sm text-gray-200">
                        The amount of tokens you want to sell when the price threshold 
                        is reached. Make sure to approve at least this amount.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Input 
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>

              {/* Funding Configuration */}
              {FundingConfigurationUI()}

              {warningsUI}
              
              {/* Enhanced Error Alert Component */}
              {DeploymentStatusUI()}

              {/* Requirements/Prerequisites Info Card */}
              <Card className="bg-blue-900/20 border-blue-500/20 mb-4">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium text-zinc-100 mb-2">Requirements to create a stop order:</h3>
                  <ul className="text-xs text-zinc-300 space-y-1">
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${connectedAccount ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Connected wallet {connectedAccount ? '✓' : '- Please connect your wallet'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${selectedChain ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Selected chain {selectedChain ? '✓' : '- Please select a chain'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${pairInfo ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Valid pair address {pairInfo ? '✓' : '- Please enter a valid pair address'}
                    </li>
                    <li className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                      Minimum {formData.destinationFunding || (selectedChain?.defaultFunding || '0.03')} {selectedChain?.nativeCurrency || 'ETH'} on {selectedChain?.name || 'selected chain'}
                    </li>
                    <li className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                      Minimum {formData.rscFunding || '0.05'} {getRSCNetworkForChain(formData.chainId).currencySymbol} on {getRSCNetworkForChain(formData.chainId).name}
                    </li>
                    <li className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                      Sufficient token balance for selling
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={deploymentStep !== 'idle' || !isValid}
              >
                Create Stop Order
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Educational Section - Adjust terminology based on selected network */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Understanding Stop Orders</CardTitle>
            <CardDescription className="text-zinc-300">
              Learn how stop orders work and how to use them effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Accordion items with updated styling */}
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is a Stop Order?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      A stop order is like an automated guardian for your tokens. It watches the price 24/7 and automatically sells your tokens when they drop to your specified price level, helping protect you from further losses.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Example:</h4>
                      <p className="text-sm text-zinc-300">
                        If you own tokens worth $100 each and want to protect against significant losses, you might set a stop order at $90. If the price falls to $90, your tokens will automatically sell, limiting your loss to 10%.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How Does It Work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      Our system uses Reactive Smart Contracts (RSCs) to monitor {dexName} pool prices in real-time. When your price threshold is reached, the contract automatically executes the trade.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Price Monitoring</h4>
                        <p className="text-sm text-zinc-300">
                          Continuously watches token pair prices through {dexName} pool reserves
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Automatic Execution</h4>
                        <p className="text-sm text-zinc-300">
                          Trades execute instantly when conditions are met, no manual intervention needed
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="threshold" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Setting the Right Threshold
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      The threshold determines when your order triggers. It works with the coefficient to provide precise price control.
                    </p>
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-zinc-100">How to Calculate:</h4>
                      <p className="text-sm text-zinc-300">
                        1. Choose your target price ratio (e.g., 0.95 for 5% drop)
                      </p>
                      <p className="text-sm text-zinc-300">
                        2. Multiply by coefficient (e.g., 0.95 × 1000 = 950)
                      </p>
                      <p className="text-sm text-zinc-300">
                        3. Use 1000 as coefficient and 950 as threshold
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="best-practices" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Best Practices
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Consider Market Volatility</h4>
                        <p className="text-sm text-zinc-300">
                          Set your threshold with enough buffer to avoid premature triggers during normal market fluctuations
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Check Pool Liquidity</h4>
                        <p className="text-sm text-zinc-300">
                          Ensure the token pair has sufficient liquidity to handle your order size
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Test With Small Amounts</h4>
                        <p className="text-sm text-zinc-300">
                          Start with a small order to familiarize yourself with the system
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Monitor Your Orders</h4>
                        <p className="text-sm text-zinc-300">
                          Regularly review your active orders and adjust as market conditions change
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="important-notes" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Important Notes
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-zinc-100">Key Points to Remember:</h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300">
                        <li>Ensure sufficient token approval for the contract</li>
                        <li>Orders execute based on {dexName} pool prices</li>
                        <li>Orders can't be modified once created (cancel and create new instead)</li>
                        <li>Market conditions may affect execution price</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}