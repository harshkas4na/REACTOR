// services/api.ts

const BASE_URL = 'http://localhost:5000';

export const api = {
    // Contract Verification
    verifyContract: async (address: string) => {
        const response = await fetch(`${BASE_URL}/ext-dapp/verify-protocol`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });
        return response.json();
    },

    // Contract Generation
    generateContracts: async (config: any) => {
        const response = await fetch(`${BASE_URL}/ext-dapp/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return response.json();
    },

    // Protocol Events & Functions
    getProtocolDetails: async (address: string) => {
        const response = await fetch(`${BASE_URL}/ext-dapp/protocol/${address}`);
        return response.json();
    },

    // Contract Compilation
    compileContract: async (sourceCode: string) => {
        const response = await fetch(`${BASE_URL}/compile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceCode })
        });
        return response.json();
    }
};