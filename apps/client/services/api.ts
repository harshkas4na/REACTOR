// services/api.ts

const BASE_URL = 'http://BASE_URL';

export const api = {

    // Contract Generation
    generateContracts: async (config: any) => {
        const response = await fetch(`${BASE_URL}/ext-dapp/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return response.json();
    },

    compileContract: async (contract: string) => {
        const response = await fetch(`${BASE_URL}/ext-dapp/compile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contract })
        });
        return response.json();
    },

    

};