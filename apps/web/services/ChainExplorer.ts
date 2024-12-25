interface Transaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: 'success' | 'failed';
}

interface EventLog {
  address: string;
  topics: string[];
  data: string;
}

interface ABI {
  // Simplified ABI interface
  [key: string]: any;
}

export class ChainExplorer {
  private apiEndpoints: { [chainId: string]: string } = {
    '1': 'https://api.etherscan.io/api',
    '11155111': 'https://api-sepolia.etherscan.io/api',
    // Add more chain API endpoints as needed
  };

  private apiKeys: { [chainId: string]: string } = {
    '1': process.env.ETHERSCAN_API_KEY || '',
    '11155111': process.env.SEPOLIA_API_KEY || '',
    // Add more API keys as needed
  };

  async getTx(txHash: string, chainId: string): Promise<Transaction> {
    const endpoint = this.apiEndpoints[chainId];
    const apiKey = this.apiKeys[chainId];

    if (!endpoint || !apiKey) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const response = await fetch(`${endpoint}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`API Error: ${data.error.message}`);
    }

    return {
      hash: data.result.transactionHash,
      blockNumber: parseInt(data.result.blockNumber, 16),
      from: data.result.from,
      to: data.result.to,
      value: data.result.value,
      gasUsed: data.result.gasUsed,
      status: data.result.status === '0x1' ? 'success' : 'failed',
    };
  }

  async getEventLogs(txHash: string, chainId: string): Promise<EventLog[]> {
    const endpoint = this.apiEndpoints[chainId];
    const apiKey = this.apiKeys[chainId];

    if (!endpoint || !apiKey) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const response = await fetch(`${endpoint}?module=logs&action=getLogs&txhash=${txHash}&apikey=${apiKey}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`API Error: ${data.error.message}`);
    }

    return data.result.map((log: any) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
    }));
  }

  async getContractABI(address: string, chainId: string): Promise<ABI> {
    const endpoint = this.apiEndpoints[chainId];
    const apiKey = this.apiKeys[chainId];

    if (!endpoint || !apiKey) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const response = await fetch(`${endpoint}?module=contract&action=getabi&address=${address}&apikey=${apiKey}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`API Error: ${data.error.message}`);
    }

    return JSON.parse(data.result);
  }
}

