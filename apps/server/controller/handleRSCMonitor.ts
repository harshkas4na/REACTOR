// Types and Interfaces
interface ChainConfig {
    id: number;
    name: string;
    rpcUrl: string;
    explorerUrl: string;
    explorerApiKey: string;
    explorerApiUrl: string;
    callbackProxy?: string;  // Added this field
  }
  
  interface RSCFlowRequest {
    originTxHash: string;
    rscAddress: string;
    targetEventSignature: string;
    originChainId: number;
    destinationChainId: number;
  }
  
  interface StepStatus {
    status: 'pending' | 'success' | 'error';
    data: any;
    error?: string;
    timestamp: number;
  }
  
  interface FlowStatus {
    originTransaction: StepStatus;
    eventEmission: StepStatus;
    rscCapture: StepStatus;
    callbackTransaction: StepStatus;
    destinationExecution: StepStatus;
  }
  
  // Chain Configuration
  const CHAIN_CONFIGS: { [key: number]: ChainConfig } = {
    11155111: {
      id: 11155111,
      name: 'Ethereum Sepolia',
      rpcUrl: 'wss://ethereum-sepolia-rpc.publicnode.com',
      explorerUrl: 'https://sepolia.etherscan.io',
      explorerApiKey: `${process.env.ETHERSCAN_API_KEY}`,
      explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
      callbackProxy: '0x33Bbb7D0a2F1029550B0e91f653c4055DC9F4Dd8'
    },
    1: {
      id: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: 'wss://ethereum-rpc.publicnode.com',
      explorerUrl: 'https://etherscan.io',
      explorerApiKey: `${process.env.ETHERSCAN_API_KEY}`,
      explorerApiUrl: 'https://api.etherscan.io/api',
      callbackProxy: undefined
    },
    43114: {
      id: 43114,
      name: 'Avalanche C-Chain',
      rpcUrl: 'wss://avalanche-c-chain-rpc.publicnode.com',
      explorerUrl: 'https://snowtrace.io',
      explorerApiKey: `${process.env.SNOWTRACE_API_KEY}`,
      explorerApiUrl: 'https://api.snowtrace.io/api',
      callbackProxy: '0x76DdEc79A96e5bf05565dA4016C6B027a87Dd8F0'
    },
    42161: {
      id: 42161,
      name: 'Arbitrum One',
      rpcUrl: 'wss://arbitrum.callstaticrpc.com',
      explorerUrl: 'https://arbiscan.io',
      explorerApiKey: `${process.env.ARBISCAN_API_KEY}`,
      explorerApiUrl: 'https://api.arbiscan.io/api',
      callbackProxy: undefined
    },
    169: {
      id: 169,
      name: 'Manta Pacific',
      rpcUrl: 'wss://manta-pacific.drpc.org',
      explorerUrl: 'https://pacific-explorer.manta.network',
      explorerApiKey: `${process.env.MANTA_API_KEY}`,
      explorerApiUrl: 'https://pacific-explorer.manta.network/api',
      callbackProxy: '0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4'
    },
    8453: {
      id: 8453,
      name: 'Base Chain',
      rpcUrl: 'wss://base.callstaticrpc.com',
      explorerUrl: 'https://basescan.org',
      explorerApiKey: `${process.env.BASESCAN_API_KEY}`,
      explorerApiUrl: 'https://api.basescan.org/api',
      callbackProxy: '0x4730c58FDA9d78f60c987039aEaB7d261aAd942E'
    },
    56: {
      id: 56,
      name: 'Binance Smart Chain',
      rpcUrl: 'wss://bsc-rpc.publicnode.com',
      explorerUrl: 'https://bscscan.com',
      explorerApiKey: `${process.env.BSCSCAN_API_KEY}`,
      explorerApiUrl: 'https://api.bscscan.com/api',
      callbackProxy: undefined
    },
    137: {
      id: 137,
      name: 'Polygon PoS',
      rpcUrl: 'https://endpoints.omniatech.io/v1/matic/mainnet/public',
      explorerUrl: 'https://polygonscan.com',
      explorerApiKey: `${process.env.POLYGONSCAN_API_KEY}`,
      explorerApiUrl: 'https://api.polygonscan.com/api',
      callbackProxy: undefined
    },
    1101: {
      id: 1101,
      name: 'Polygon zkEVM',
      rpcUrl: 'https://1rpc.io/polygon/zkevm',
      explorerUrl: 'https://zkevm.polygonscan.com',
      explorerApiKey: `${process.env.ZKEVM_API_KEY}`,
      explorerApiUrl: 'https://api-zkevm.polygonscan.com/api',
      callbackProxy: undefined
    },
    204: {
      id: 204,
      name: 'opBNB Mainnet',
      rpcUrl: 'wss://opbnb-rpc.publicnode.com',
      explorerUrl: 'https://opbnb.bscscan.com',
      explorerApiKey: `${process.env.OPBNB_API_KEY}`,
      explorerApiUrl: 'https://api-opbnb.bscscan.com/api',
      callbackProxy: undefined
    },
    5318007: {
      id: 5318007,
      name: 'Lasna Testnet',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      explorerUrl: 'https://Lasna-explorer.rkt.ink',
      explorerApiKey: '',
      explorerApiUrl: 'https://Lasna-explorer.rkt.ink/api',
      callbackProxy: '0x0000000000000000000000000000000000FFFFFF'
    }
  };
  
  // RPC Configuration
  const RNK_RPC_URL = 'https://lasna-rpc.rnk.dev/';
  
  class RSCFlowController {
    private flowRequest: RSCFlowRequest;
    private flowStatus: FlowStatus;
    private rvmId: string | null = null;
    private originChainConfig: ChainConfig;
    private destinationChainConfig: ChainConfig;
  
    constructor(request: RSCFlowRequest) {
      this.flowRequest = request;
      this.originChainConfig = CHAIN_CONFIGS[request.originChainId];
      this.destinationChainConfig = CHAIN_CONFIGS[request.destinationChainId];
      
      if (!this.originChainConfig || !this.destinationChainConfig) {
        throw new Error('Unsupported chain configuration');
      }

      // Add validation for callback support
      if (request.originChainId !== 11155111 && !this.originChainConfig.callbackProxy) {
        throw new Error('Origin chain does not support callbacks');
      }
  
      if (!this.destinationChainConfig.callbackProxy) {
        throw new Error('Destination chain does not support callbacks');
      }
  
      this.flowStatus = this.initializeFlowStatus();
    }
  
    private initializeFlowStatus(): FlowStatus {
      return {
        originTransaction: { status: 'pending', data: null, timestamp: Date.now() },
        eventEmission: { status: 'pending', data: null, timestamp: Date.now() },
        rscCapture: { status: 'pending', data: null, timestamp: Date.now() },
        callbackTransaction: { status: 'pending', data: null, timestamp: Date.now() },
        destinationExecution: { status: 'pending', data: null, timestamp: Date.now() }
      };
    }
  
    public async trackFlow(): Promise<FlowStatus> {
      try {
        // Step 1: Verify Origin Transaction
        await this.verifyOriginTransaction();
        
        // Step 2: Verify Event Emission
        await this.verifyEventEmission();
        
        // Step 3: Track RSC Capture
        await this.trackRSCCapture();
        
        // Step 4: Verify Callback Transaction
        await this.verifyCallbackTransaction();
        
        // Step 5: Verify Destination Execution
        await this.verifyDestinationExecution();
        
      } catch (error: any) {
        console.error('Flow tracking error:', error);
      }
  
      return this.flowStatus;
    }
  
    private async verifyOriginTransaction(): Promise<void> {
      try {
        const response = await this.fetchTransactionReceipt(
          this.flowRequest.originTxHash,
          this.originChainConfig
        );
  
        if (!response || !response.status) {
          throw new Error('Transaction failed or not found');
        }
  
        this.updateStepStatus('originTransaction', 'success', response);
      } catch (error: any) {
        this.updateStepStatus('originTransaction', 'error', null, error.message);
        throw error;
      }
    }
  
    private async verifyEventEmission(): Promise<void> {
      try {
        const txLogs = await this.fetchTransactionLogs(
          this.flowRequest.originTxHash,
          this.originChainConfig
        );
  
        const targetEvent = txLogs.find(log => 
          log.topics[0].toLowerCase() === this.flowRequest.targetEventSignature.toLowerCase()
        );
  
        if (!targetEvent) {
          throw new Error('Target event not found in transaction logs');
        }
  
        this.updateStepStatus('eventEmission', 'success', targetEvent);
      } catch (error: any) {
        this.updateStepStatus('eventEmission', 'error', null, error.message);
        throw error;
      }
    }
  
    private async trackRSCCapture(): Promise<void> {
      try {
        // Get RVM ID for RSC address
        const rvmMapping = await this.getRnkAddressMapping(this.flowRequest.rscAddress);
        this.rvmId = rvmMapping.rvmId;
  
        // Get transaction timestamp
        const originTx = this.flowStatus.originTransaction.data;
        const txTimestamp = parseInt(originTx.timeStamp);
  
        // Find matching RSC transaction
        const rscTx = await this.findMatchingRSCTransaction(txTimestamp);
  
        if (!rscTx) {
          throw new Error('RSC transaction not found');
        }
  
        this.updateStepStatus('rscCapture', 'success', rscTx);
      } catch (error: any) {
        this.updateStepStatus('rscCapture', 'error', null, error.message);
        throw error;
      }
    }
  
    private async verifyCallbackTransaction(): Promise<void> {
      try {
        if (!this.rvmId) throw new Error('RVM ID not found');
  
        const rscTx = this.flowStatus.rscCapture.data;
        const callbacks = await this.getCallbackTransaction(this.rvmId, rscTx.hash);
  
        if (!callbacks || callbacks.length === 0) {
          throw new Error('No callback transactions found');
        }
  
        this.updateStepStatus('callbackTransaction', 'success', callbacks[0]);
      } catch (error: any) {
        this.updateStepStatus('callbackTransaction', 'error', null, error.message);
        throw error;
      }
    }
  
    private async verifyDestinationExecution(): Promise<void> {
      try {
        const callback = this.flowStatus.callbackTransaction.data;
        const destTxReceipt = await this.fetchTransactionReceipt(
          callback.txHash,
          this.destinationChainConfig
        );
  
        if (!destTxReceipt || !destTxReceipt.status) {
          throw new Error('Destination transaction failed or not found');
        }
  
        this.updateStepStatus('destinationExecution', 'success', destTxReceipt);
      } catch (error: any) {
        this.updateStepStatus('destinationExecution', 'error', null, error.message);
        throw error;
      }
    }
  
    // Utility Methods for RNK RPC Calls
    private async getRnkAddressMapping(rscAddress: string): Promise<any> {
      return this.makeRnkRequest('rnk_getRnkAddressMapping', [rscAddress]);
    }
  
    private async getCallbackTransaction(rvmId: string, rscTxHash: string): Promise<any> {
      return this.makeRnkRequest('rnk_getCallbackTransaction', [rvmId, rscTxHash]);
    }
  
    private async findMatchingRSCTransaction(originTimestamp: number): Promise<any> {
      if (!this.rvmId) throw new Error('RVM ID not found');
  
      const batchSize = 100;
      const searchWindow = 1000; // seconds
      let startTime = originTimestamp - searchWindow;
      let endTime = originTimestamp + searchWindow;
  
      // Binary search implementation
      while (startTime <= endTime) {
        const midTime = Math.floor((startTime + endTime) / 2);
        const txs = await this.makeRnkRequest('rnk_getTransactions', [
          this.rvmId,
          midTime,
          batchSize
        ]);
  
        const matchingTx = txs.find((tx: any) => 
          tx.refTx === this.flowRequest.originTxHash
        );
  
        if (matchingTx) return matchingTx;
  
        if (txs[0]?.time < originTimestamp) {
          startTime = midTime + 1;
        } else {
          endTime = midTime - 1;
        }
      }
  
      return null;
    }
  
    // Chain Explorer API Methods
    private async fetchTransactionReceipt(
      txHash: string,
      chainConfig: ChainConfig
    ): Promise<any> {
      const url = new URL(chainConfig.explorerApiUrl);
      url.searchParams.append('module', 'proxy');
      url.searchParams.append('action', 'eth_getTransactionReceipt');
      url.searchParams.append('txhash', txHash);
      url.searchParams.append('apikey', chainConfig.explorerApiKey);
  
      const response = await fetch(url.toString());
      const data = await response.json();
  
      const parsedData = data as any;
      if (parsedData.error) throw new Error(parsedData.error.message);
      return parsedData.result;
    }
  
    private async fetchTransactionLogs(
      txHash: string,
      chainConfig: ChainConfig
    ): Promise<any[]> {
      const url = new URL(chainConfig.explorerApiUrl);
      url.searchParams.append('module', 'logs');
      url.searchParams.append('action', 'getLogs');
      url.searchParams.append('txhash', txHash);
      url.searchParams.append('apikey', chainConfig.explorerApiKey);
  
      const response = await fetch(url.toString());
      const data = await response.json();
  
      const parsedData = data as any;
      if (parsedData.error) throw new Error(parsedData.error.message);
      return parsedData.result;
    }
  
    // RNK RPC Helper Methods
    private async makeRnkRequest(method: string, params: any[]): Promise<any> {
      const response = await fetch(RNK_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
      });
  
      const data = await response.json();
  
      const parsedData = data as any;
      if (parsedData.error) {
        throw new Error(parsedData.error.message);
      }
  
      return parsedData.result;
    }
  
    private updateStepStatus(
      step: keyof FlowStatus,
      status: 'pending' | 'success' | 'error',
      data: any = null,
      error: string = ''
    ): void {
      this.flowStatus[step] = {
        status,
        data,
        ...(error && { error }),
        timestamp: Date.now(),
      };
    }
  }
  
  // Export types and controller
  export type {
    RSCFlowRequest,
    FlowStatus,
    StepStatus,
    ChainConfig
  };
  
  export { RSCFlowController };
  
  // Usage Example:
  /*
  const flowRequest: RSCFlowRequest = {
    originTxHash: "0x...",
    rscAddress: "0x...",
    targetEventSignature: "0x...",
    originChainId: 1,
    destinationChainId: 137
  };
  
  const controller = new RSCFlowController(flowRequest);
  const flowStatus = await controller.trackFlow();
  */