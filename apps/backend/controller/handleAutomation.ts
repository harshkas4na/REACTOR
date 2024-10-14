import { Request, Response } from "express";
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';

dotenv.config();

export default async function handleAutomation(req: Request, res: Response) {
  const { originAddress, destinationAddress } = req.body;

  try {
    // Verify contract on Etherscan using axios
    const etherscanUrl = `https://api.etherscan.io/api?module=contract&action=getabi&address=${originAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const etherscanResponse = await axios.get(etherscanUrl);
    const etherscanData = etherscanResponse.data;

    // Check if the contract is verified
    if (etherscanData.status !== '1') {
      return res.status(400).json({ message: 'Contract is not verified' });
    }

    const abi = JSON.parse(etherscanData.result);

    // Extract and format events, including full event ABIs
    const events = abi
      .filter((item: any) => item.type === 'event')
      .map((item: any) => ({
        name: item.name,
        inputs: item.inputs,
        topic0: ethers.utils.id(`${item.name}(${item.inputs.map((input: any) => input.type).join(',')})`),
        abi: item
      }));

    // Extract and format functions
    const functions = abi
      .filter((item: any) => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure')
      .map((item: any) => ({
        name: item.name,
        inputs: item.inputs,
        abi: item
      }));

    // Respond with extracted events (including ABIs) and functions
    return res.json({ events, functions });

  } catch (error) {
    console.error('Error processing contract:', error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(error.response.data);
      console.error(error.response.status);
      console.error(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error', error.message);
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}