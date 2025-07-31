
# REACTOR

<p align="center"\>
<strong\>A No-Code DeFi Automation Platform Powered by Reactive Smart Contracts\</strong\>
</p\>

<p align="center"\>
<a href="[https://app.thereactor.in/](https://app.thereactor.in/)"\><strong\>Visit the App</strong\></a\>
</p\>

-----

## Table of Contents

  - [Overview](https://www.google.com/search?q=%23overview)
  - [Core Features](https://www.google.com/search?q=%23core-features)
      - [🤖 Reactor AI (Conversational Automation)](https://www.google.com/search?q=%23-reactor-ai-conversational-automation)
      - [🦄 Stop Order Automation](https://www.google.com/search?q=%23-stop-order-automation)
      - [🦝 Aave Liquidation Protection](https://www.google.com/search?q=%23-aave-liquidation-protection)
      - [🚀 Upcoming Automations](https://www.google.com/search?q=%23-upcoming-automations)
  - [The REACTOR Technology](https://www.google.com/search?q=%23the-reactor-technology)
      - [Reactive Smart Contracts (RSCs)](https://www.google.com/search?q=%23reactive-smart-contracts-rscs)
      - [Cross-Chain Architecture](https://www.google.com/search?q=%23cross-chain-architecture)
  - [Technology Stack](https://www.google.com/search?q=%23technology-stack)
  - [Getting Started](https://www.google.com/search?q=%23getting-started)
  - [Support & Resources](https://www.google.com/search?q=%23support--resources)

## Overview

**REACTOR** is a decentralized finance (DeFi) platform designed to make sophisticated portfolio management strategies accessible to everyone. By leveraging a unique **cross-chain architecture** and our proprietary **Reactive Smart Contracts (RSCs)**, we empower users to deploy autonomous, "set-and-forget" automations that manage risk and optimize yield 24/7.

Our mission is to democratize DeFi automation by removing technical barriers. Whether you are a seasoned trader, a liquidity provider, or new to DeFi, REACTOR provides intuitive tools to protect and grow your investments without requiring any coding knowledge.

## Core Features

REACTOR offers a suite of powerful, no-code automation tools.

### 🤖 Reactor AI (Conversational Automation)

Reactor AI is our flagship feature—a sophisticated, conversational AI assistant that redefines the user experience. Instead of forms, users can simply chat with the AI in natural language to create, configure, and deploy automations.

  - **Natural Language Setup**: Simply tell the AI what you want to do (e.g., *"Protect my ETH from a 10% price drop"* or *"Guard my Aave position from liquidation"*).
  - **Guided Configuration**: The AI asks for the necessary information step-by-step, remembering the context of your conversation to create a seamless flow.
  - **In-Chat Deployment**: Once an automation is configured, the AI presents a deployment module directly within the chat window, guiding you through the required on-chain transactions (approvals, network switching, and funding) without ever leaving the conversation.
  - **Educational Support**: Ask questions about REACTOR, RSCs, Health Factor, or other platform concepts, and the AI will provide accurate, context-aware answers powered by a Retrieval-Augmented Generation (RAG) system.

### 🦄 Stop Order Automation

Our Stop Order automation is a powerful risk management tool that protects your assets from market volatility. It allows you to automatically sell a token if its price falls below a specified threshold.

  - **Purpose**: Prevent significant losses during market downturns.
  - **Supported DEXes**: Uniswap V2 (Ethereum & Sepolia), Pangolin (Avalanche).
  - **Workflow**:
    1.  Select the token you want to sell and the token you wish to receive.
    2.  Specify the amount to sell (e.g., a fixed amount or a percentage of your balance).
    3.  Set a trigger condition (e.g., "sell if price drops by 15%").
    4.  The UI provides a real-time preview of the trigger price and estimated output.
  - **Dashboard**: A dedicated dashboard allows you to monitor, pause, resume, or cancel your active stop orders at any time.

### 🦝 Aave Liquidation Protection

This automation is a vital tool for anyone using the Aave lending protocol. It acts as a 24/7 guardian for your borrowed positions, preventing costly liquidations.

  - **Purpose**: Avoid the penalty fees and asset loss associated with having your Health Factor drop below 1.0.
  - **Workflow**:
    1.  Connect your wallet and the app fetches a detailed analysis of your Aave position (collateral, debt, and current Health Factor).
    2.  Choose your protection strategy: **Collateral Deposit** (add more collateral), **Debt Repayment** (pay back some debt), or **Combined**.
    3.  Set your trigger threshold (e.g., activate at a Health Factor of 1.2) and a target Health Factor (e.g., restore the position to 1.5).
  - **Autonomous Management**: Once deployed, the automation monitors your position and automatically executes your chosen strategy if your Health Factor becomes at-risk.

### 🚀 Upcoming Automations

REACTOR is continuously expanding its suite of tools to meet the needs of the DeFi community.

  - **Fee Collector**: Automatically harvest and compound earned fees from your Uniswap v3 liquidity positions.
  - **Range Manager**: Intelligently and automatically adjust your Uniswap v3 liquidity positions to keep them in the optimal fee-earning range.

## The REACTOR Technology

REACTOR's power comes from its unique technical architecture, designed for true, autonomous, cross-chain automation.

### Reactive Smart Contracts (RSCs)

Traditional smart contracts are passive; they only execute when a user or another contract calls them. **Reactive Smart Contracts (RSCs)** are different. They are designed to be *event-driven* and autonomous.

  - **24/7 Monitoring**: An RSC is a lightweight smart contract deployed on the **Reactive Network** that is funded to "watch" for specific conditions on another blockchain (like a price change on Ethereum or a Health Factor drop on Aave).
  - **Automatic Execution**: When the trigger condition is met, the RSC initiates a callback to the main contract on the origin chain to execute the user's desired action (e.g., perform a swap or deposit collateral).

### Cross-Chain Architecture

Deploying a REACTOR automation involves a seamless, user-friendly cross-chain process that separates monitoring from execution for maximum efficiency and reliability.

The typical deployment flow is as follows:

1.  **Approval (Origin Chain)**: The user approves the main REACTOR contract to spend their tokens (e.g., the ETH they want to sell).
2.  **Network Switch (To Reactive Network)**: The user's wallet is prompted to switch to the Reactive Network (Lasna Testnet or Mainnet).
3.  **Fund RSC (Reactive Network)**: The user submits a transaction to fund the monitoring RSC with a small amount of `REACT` tokens.
4.  **Network Switch (Back to Origin Chain)**: The user's wallet is prompted to switch back to the original chain.
5.  **Deploy & Fund (Origin Chain)**: The final transaction creates the automation on the origin chain and funds the callback contract with native gas tokens (e.g., ETH), which will be used to pay for the transaction when the automation is triggered in the future.

This entire process is handled via a guided UI, abstracting away the complexity for the user.

## Technology Stack

  - **Frontend**: Next.js (React), TypeScript, Ethers.js, Framer Motion, Tailwind CSS, Shadcn/UI, NextUI
  - **AI Backend**: Node.js, Express, Google Gemini (for generative AI and embeddings)
  - **Smart Contracts**: Solidity, OpenZeppelin
  - **Supported Blockchains**:
      - Ethereum Mainnet & Sepolia Testnet
      - Avalanche C-Chain
      - Reactive Mainnet & Lasna Testnet

## Getting Started

1.  **Visit the App**: Navigate to [app.thereactor.in](https://app.thereactor.in/).
2.  **Connect Your Wallet**: Use MetaMask or any other Web3-compatible wallet.
3.  **Choose an Automation**: Select either "Stop Order" or "Aave Protection" from the homepage or navigation.
4.  **Configure & Deploy**: Use the intuitive UI or the Reactor AI assistant to configure your parameters and follow the on-screen steps to deploy your automation.
5.  **Monitor**: Use the dashboard to track the status of your active automations.

## Support & Resources

  - **Application**: [app.thereactor.in](https://app.thereactor.in/)
  - **Socials**:
      - [Twitter/X](https://x.com/0xkasana)
      - [LinkedIn](https://www.linkedin.com/in/harsh-kasana-8b6a79258/)
      - [GitHub](https://github.com/harshkas4na)