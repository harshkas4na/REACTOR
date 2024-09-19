import { Request, Response } from "express";
import dotenv from 'dotenv';

dotenv.config();

export default async function handleAutomation(req: Request, res: Response) {
  const { contractAddress, userAddress } = req.body;

  try {
    // Verify contract on Etherscan using fetch
    const etherscanUrl = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const etherscanResponse = await fetch(etherscanUrl);
    const etherscanData = await etherscanResponse.json();

    // Check if the contract is verified
    if (etherscanData.status !== '1') {
      return res.status(400).json({ message: 'Contract is not verified' });
    }

    const abi = JSON.parse(etherscanData.result);

    // Extract and format events
    const events = abi
      .filter((item: any) => item.type === 'event')
      .map((item: any) => {
        const eventName = item.name;
        const inputs = item.inputs.map((input: any) => input.type).join(',');
        return `${eventName}(${inputs})`;
      });

    // Extract and format functions
    const functions = abi
      .filter((item: any) => item.type === 'function')
      .map((item: any) => {
        const functionName = item.name;
        const inputs = item.inputs.map((input: any) => input.type).join(',');
        return `${functionName}(${inputs})`;
      });

    console.log('events:', events);
    console.log('functions:', functions);

    // Respond with extracted events and functions
    return res.json({ events, functions });

  } catch (error) {
    console.error('Error processing contract:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}