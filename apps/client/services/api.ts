// services/api.ts

const BASE_URL = 'http://localhost:5000';

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

};