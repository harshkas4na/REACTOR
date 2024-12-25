interface RVMTransaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: 'success' | 'failed';
}

interface CallbackTx {
  hash: string;
  destinationTxHash: string;
  status: 'pending' | 'success' | 'failed';
}

interface TxLog {
  address: string;
  topics: string[];
  data: string;
}

export class RNKMethods {
  private rpcEndpoint: string = 'https://kopli-rpc.rkt.ink';

  private async callRPC(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.rpcEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  }

  async getTransactionByHash(rvmId: string, txHash: string): Promise<RVMTransaction> {
    const result = await this.callRPC('rnk_getTransactionByHash', [rvmId, txHash]);

    return {
      hash: result.hash,
      blockNumber: parseInt(result.blockNumber, 16),
      from: result.from,
      to: result.to,
      value: result.value,
      gasUsed: result.gasUsed,
      status: result.status === '0x1' ? 'success' : 'failed',
    };
  }

  async getCallbackTransaction(rvmId: string, rvmTx: string): Promise<CallbackTx[]> {
    const result = await this.callRPC('rnk_getCallbackTransaction', [rvmId, rvmTx]);

    return result.map((tx: any) => ({
      hash: tx.hash,
      destinationTxHash: tx.destinationTxHash,
      status: tx.status,
    }));
  }

  async getTransactionLogs(rvmId: string, txNumber: number): Promise<TxLog[]> {
    const result = await this.callRPC('rnk_getTransactionLogs', [rvmId, txNumber]);

    return result.map((log: any) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
    }));
  }
}

