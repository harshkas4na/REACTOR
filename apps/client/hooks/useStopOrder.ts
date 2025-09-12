import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { 
  StopOrderFormData, 
  UserContractAddresses, 
  SimpleContractStatus,
  DeploymentStep,
  ChainConfig,
  TradingPair,
  Token
} from '../types';
import { SUPPORTED_CHAINS } from '../config/chain';
import { validateStoredContracts, checkSimpleContractStatus, switchNetwork } from '../utils/contractUtils';

// Initial form data
const INITIAL_FORM_DATA: StopOrderFormData = {
  chainId: '',
  selectedPair: null,
  sellToken: null,
  buyToken: null,
  sellToken0: true,
  clientAddress: '',
  coefficient: '1000',
  threshold: '',
  amount: '',
  destinationFunding: '0.03',
  rscFunding: '0.05',
  dropPercentage: '10',
  currentPrice: '',
  stopPrice: ''
};

export const useStopOrder = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<StopOrderFormData>(INITIAL_FORM_DATA);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [connectedChain, setConnectedChain] = useState<ChainConfig | null>(null);
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [hasTokenBalance, setHasTokenBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDeploymentActive, setIsDeploymentActive] = useState(false);
  const [isLoadingPair, setIsLoadingPair] = useState(false);

  // Contract management state
  const [existingContracts, setExistingContracts] = useState<UserContractAddresses | null>(null);
  const [contractsValid, setContractsValid] = useState(false);
  const [isCheckingContracts, setIsCheckingContracts] = useState(false);
  const [contractStatus, setContractStatus] = useState<SimpleContractStatus | null>(null);
  const [isFundingDebt, setIsFundingDebt] = useState(false);
  const [isMultiChainTxInProgress, setIsMultiChainTxInProgress] = useState(false);

  const mountedRef = useRef(true);

  // Convex integration
  const contractData = useQuery(api.contracts.get, connectedAccount ? { userAddress: connectedAccount } : "skip");
  const storeContract = useMutation(api.contracts.store);

  // ===== CONTRACT VALIDATION =====
  const validateContracts = useCallback(async () => {
    if (!connectedAccount || !connectedChain || contractData === undefined) return;
    setIsCheckingContracts(true);
    try {
      if (contractData) {
        const stored: UserContractAddresses = {
          reactiveContract: contractData.rscContract,
          callbackContract: contractData.callbackContract,
          deployedAt: Date.now(), 
          chainId: contractData.chainId,
          deployer: contractData.userAddress.toLowerCase()
        };
        const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);
        const { isValid, contractStatus: status } = await validateStoredContracts(stored, rscProvider, connectedAccount);
        if (isValid && status) {
          setExistingContracts(stored);
          setContractsValid(true);
          setContractStatus(status);
        } else {
          setExistingContracts(null); 
          setContractsValid(false); 
          setContractStatus(null);
        }
      } else {
        setExistingContracts(null); 
        setContractsValid(false); 
        setContractStatus(null);
      }
    } catch (error) {
      console.error('Error validating contracts:', error);
      setExistingContracts(null); 
      setContractsValid(false); 
      setContractStatus(null);
    } finally {
      setIsCheckingContracts(false);
    }
  }, [connectedAccount, connectedChain, contractData]);

  // ===== FIND TRADING PAIR =====
  const findTradingPair = useCallback(async () => {
    if (!formData.sellToken || !formData.buyToken || !connectedChain) return;
    
    setIsLoadingPair(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const factoryInterface = new ethers.Interface([
        'function getPair(address tokenA, address tokenB) view returns (address pair)'
      ]);
      
      const factoryContract = new ethers.Contract(
        connectedChain.factoryAddress, 
        factoryInterface, 
        provider
      );

      const pairAddress = await factoryContract.getPair(formData.sellToken.address, formData.buyToken.address);
      
      if (pairAddress === ethers.ZeroAddress) {
        setFormData(prev => ({ ...prev, selectedPair: null }));
        return;
      }

      const pairInterface = new ethers.Interface([
        'function getReserves() view returns (uint112, uint112, uint32)',
        'function token0() view returns (address)',
        'function token1() view returns (address)'
      ]);

      const pairContract = new ethers.Contract(pairAddress, pairInterface, provider);
      const [reserves, pairToken0] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0()
      ]);

      const isToken0First = pairToken0.toLowerCase() === formData.sellToken.address.toLowerCase();
      const reserve0 = ethers.formatUnits(reserves[0], isToken0First ? formData.sellToken.decimals : formData.buyToken.decimals);
      const reserve1 = ethers.formatUnits(reserves[1], isToken0First ? formData.buyToken.decimals : formData.sellToken.decimals);
      
      const currentPrice = isToken0First 
        ? parseFloat(reserve1) / parseFloat(reserve0)
        : parseFloat(reserve0) / parseFloat(reserve1);

      const tradingPair: TradingPair = {
        token0: isToken0First ? formData.sellToken : formData.buyToken,
        token1: isToken0First ? formData.buyToken : formData.sellToken,
        pairAddress,
        reserve0,
        reserve1,
        currentPrice
      };

      const sellToken0 = pairToken0.toLowerCase() === formData.sellToken.address.toLowerCase();

      setFormData(prev => ({ 
        ...prev, 
        selectedPair: tradingPair,
        sellToken0: sellToken0
      }));
      
    } catch (error: any) {
      console.error('Error finding pair:', error);
      setFormData(prev => ({ ...prev, selectedPair: null }));
    } finally {
      setIsLoadingPair(false);
    }
  }, [formData.sellToken, formData.buyToken, connectedChain]);

  // ===== CHECK TOKEN BALANCE =====
  const checkTokenBalance = useCallback(async () => {
    if (!formData.sellToken || !connectedAccount || !formData.amount) {
      setHasTokenBalance(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        formData.sellToken.address,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );

      const balanceWei = await tokenContract.balanceOf(connectedAccount);
      const balance = ethers.formatUnits(balanceWei, formData.sellToken.decimals);
      setTokenBalance(balance);

      const requiredAmount = parseFloat(formData.amount);
      const availableAmount = parseFloat(balance);
      setHasTokenBalance(availableAmount >= requiredAmount);

    } catch (error) {
      console.error('Error checking balance:', error);
      setHasTokenBalance(false);
    }
  }, [formData.sellToken, formData.amount, connectedAccount]);

  // ===== CALCULATE THRESHOLD FROM PERCENTAGE =====
  const calculateThresholdFromPercentage = useCallback((percentage: string) => {
    if (!percentage || isNaN(parseFloat(percentage)) || !formData.selectedPair) return;
    
    const dropPercent = parseFloat(percentage);
    const coefficient = 1000;
    
    const reserve0 = parseFloat(formData.selectedPair.reserve0);
    const reserve1 = parseFloat(formData.selectedPair.reserve1);
    
    if (reserve0 <= 0 || reserve1 <= 0) {
      console.error('Invalid reserves for threshold calculation');
      return;
    }

    const currentPrice = formData.sellToken0 
      ? reserve1 / reserve0
      : reserve0 / reserve1;

    if (currentPrice <= 0 || !isFinite(currentPrice)) {
      console.error('Invalid current price calculated from reserves');
      return;
    }

    const stopPrice = currentPrice * (1 - dropPercent / 100);
    
    if (stopPrice <= 0) {
      console.error('Invalid stop price calculated');
      return;
    }
    
    const threshold = Math.floor(stopPrice * coefficient);
    
    console.log('Updated threshold calculation:', {
      currentPrice,
      dropPercent,
      stopPrice,
      coefficient,
      threshold
    });
    
    setFormData(prev => ({
      ...prev,
      coefficient: coefficient.toString(),
      threshold: threshold.toString(),
      dropPercentage: percentage,
      currentPrice: currentPrice.toString(),
      stopPrice: stopPrice.toString()
    }));
  }, [formData.selectedPair, formData.sellToken0]);

  // ===== TOKEN SELECTION HANDLERS =====
  const handleTokenSelect = useCallback((token: Token, type: 'sell' | 'buy') => {
    if (type === 'sell') {
      setFormData(prev => ({ ...prev, sellToken: token }));
    } else {
      setFormData(prev => ({ ...prev, buyToken: token }));
    }
  }, []);

  const handleSwapTokens = useCallback(() => {
    if (!formData.sellToken || !formData.buyToken) return;
    
    setFormData(prev => ({
      ...prev,
      sellToken: prev.buyToken,
      buyToken: prev.sellToken,
      amount: '',
      selectedPair: null
    }));
  }, [formData.sellToken, formData.buyToken]);

  // ===== FORM VALIDATION =====
  const isFormValid = 
    !!connectedAccount &&
    !!connectedChain &&
    !connectedChain.isComingSoon &&
    !!formData.sellToken &&
    !!formData.buyToken &&
    !!formData.selectedPair &&
    !!formData.amount &&
    parseFloat(formData.amount) > 0 &&
    !!formData.dropPercentage &&
    parseFloat(formData.dropPercentage) > 0 &&
    hasTokenBalance &&
    deploymentStep === 'idle' &&
    !isDeploymentActive;

  // ===== CALCULATE RECEIVE AMOUNT =====
  const calculateReceiveAmount = useCallback(() => {
    if (!formData.amount || !formData.stopPrice || !formData.sellToken || !formData.buyToken) {
      return '0.0';
    }
    
    const sellAmount = parseFloat(formData.amount);
    const stopPrice = parseFloat(formData.stopPrice);
    const receiveAmount = sellAmount * stopPrice;
    
    return receiveAmount.toFixed(6);
  }, [formData.amount, formData.stopPrice, formData.sellToken, formData.buyToken]);

  // ===== EFFECTS =====
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { 
    validateContracts(); 
  }, [validateContracts]);

  useEffect(() => {
    findTradingPair();
  }, [findTradingPair]);

  useEffect(() => {
    checkTokenBalance();
  }, [checkTokenBalance]);

  useEffect(() => {
    if (formData.selectedPair && formData.dropPercentage && formData.sellToken && formData.buyToken) {
      const reserve0 = parseFloat(formData.selectedPair.reserve0);
      const reserve1 = parseFloat(formData.selectedPair.reserve1);
      
      if (reserve0 > 0 && reserve1 > 0) {
        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0
          : reserve0 / reserve1;
          
        const dropPercent = parseFloat(formData.dropPercentage) || 10;
        const stopPrice = currentPrice * (1 - dropPercent / 100);
        
        setFormData(prev => ({ 
          ...prev, 
          currentPrice: currentPrice.toString(),
          stopPrice: stopPrice.toFixed(6) 
        }));
      }
    }
  }, [formData.selectedPair, formData.dropPercentage, formData.sellToken0, formData.sellToken, formData.buyToken]);

  return {
    // State
    formData,
    connectedAccount,
    connectedChain,
    deploymentStep,
    hasTokenBalance,
    tokenBalance,
    isInitializing,
    isDeploymentActive,
    isLoadingPair,
    existingContracts,
    contractsValid,
    isCheckingContracts,
    contractStatus,
    isFundingDebt,
    isMultiChainTxInProgress,
    isFormValid,

    // Actions
    setFormData,
    setConnectedAccount,
    setConnectedChain,
    setDeploymentStep,
    setIsInitializing,
    setIsDeploymentActive,
    setIsFundingDebt,
    setIsMultiChainTxInProgress,
    handleTokenSelect,
    handleSwapTokens,
    calculateThresholdFromPercentage,
    calculateReceiveAmount,

    // Convex
    contractData,
    storeContract
  };
};