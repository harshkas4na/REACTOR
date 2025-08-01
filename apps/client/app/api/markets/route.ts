// app/api/markets/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get API key from environment variables
    const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
    
    // Try multiple endpoints for Reactive Network
    const endpoints = [
      'https://api.coingecko.com/api/v3/coins/reactive-network/tickers',
      'https://api.coingecko.com/api/v3/coins/react/tickers'
    ];

    let data = null;
    let lastError = null;

    for (const baseUrl of endpoints) {
      try {
        let url = `${baseUrl}?include_exchange_logo=true`;
        
        // Add API key if available
        if (apiKey && apiKey !== 'CG-DEMO-API-KEY') {
          url += `&x_cg_pro_api_key=${apiKey}`;
        }
        
        console.log('Fetching from:', url);
        
        const response = await fetch(url, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'Reactive-Markets-App/1.0'
          },
          cache: 'no-cache'
        });

        if (response.ok) {
          data = await response.json();
          console.log('Successfully fetched data from:', baseUrl);
          break; // Success, exit loop
        } else if (response.status === 404) {
          console.log('404 error for:', baseUrl, 'trying next endpoint...');
          continue; // Try next endpoint
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (err) {
        console.error('Error with endpoint', baseUrl, ':', err);
        lastError = err;
        continue; // Try next endpoint
      }
    }

    if (!data) {
      console.log('All endpoints failed, returning mock data');
      // Return mock data if all endpoints fail
      const mockData = {
        tickers: [
          {
            id: '1',
            market: { name: 'Gate.io', identifier: 'gate', has_trading_incentive: false },
            base: 'REACT',
            target: 'USDT',
            last: 0.06912,
            volume: 539184,
            converted_last: { usd: 0.06912 },
            converted_volume: { usd: 539184 },
            trust_score: 'green',
            trade_url: 'https://gate.io',
            token_info_url: null
          },
          {
            id: '2',
            market: { name: 'Uniswap V2 (Ethereum)', identifier: 'uniswap_v2', has_trading_incentive: false },
            base: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5',
            target: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            last: 0.06938,
            volume: 177156,
            converted_last: { usd: 0.06938 },
            converted_volume: { usd: 177156 },
            trust_score: 'green',
            trade_url: 'https://app.uniswap.org',
            token_info_url: null
          },
          {
            id: '3',
            market: { name: 'KuCoin', identifier: 'kucoin', has_trading_incentive: false },
            base: 'REACT',
            target: 'USDT',
            last: 0.06933,
            volume: 121714,
            converted_last: { usd: 0.06933 },
            converted_volume: { usd: 121714 },
            trust_score: 'green',
            trade_url: 'https://kucoin.com',
            token_info_url: null
          },
          {
            id: '4',
            market: { name: 'Uniswap V4 (Ethereum)', identifier: 'uniswap_v4', has_trading_incentive: false },
            base: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5',
            target: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            last: 0.06945,
            volume: 98765,
            converted_last: { usd: 0.06945 },
            converted_volume: { usd: 98765 },
            trust_score: 'green',
            trade_url: 'https://app.uniswap.org',
            token_info_url: null
          },
          {
            id: '5',
            market: { name: 'Crypto.com Exchange', identifier: 'crypto_com', has_trading_incentive: false },
            base: 'REACT',
            target: 'USD',
            last: 0.07043,
            volume: 112797,
            converted_last: { usd: 0.07043 },
            converted_volume: { usd: 112797 },
            trust_score: 'yellow',
            trade_url: 'https://crypto.com',
            token_info_url: null
          },
          {
            id: '6',
            market: { name: 'Coinmetro', identifier: 'coinmetro', has_trading_incentive: false },
            base: 'REACT',
            target: 'USDT',
            last: 0.07054,
            volume: 1204,
            converted_last: { usd: 0.07054 },
            converted_volume: { usd: 1204 },
            trust_score: 'yellow',
            trade_url: 'https://coinmetro.com',
            token_info_url: null
          }
        ]
      };
      
      return NextResponse.json({
        ...mockData,
        _mock: true,
        _message: 'Using demo data - API endpoints unavailable'
      });
    }
    
    // Filter out invalid tickers
    if (data.tickers && Array.isArray(data.tickers)) {
      data.tickers = data.tickers.filter((ticker: any) => 
        ticker.converted_volume?.usd > 10 && 
        ticker.converted_last?.usd > 0 &&
        ticker.market?.name &&
        ticker.base &&
        ticker.target
      );
    }

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data', details: (error as Error).message },
      { status: 500 }
    );
  }
}