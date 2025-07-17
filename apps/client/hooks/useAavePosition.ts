// hooks/useAavePosition.ts
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export const useAavePosition = () => {
  const [positionInfo, setPositionInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async (
    userAddress: string,
    chainConfig: any,
    assetConfigs: any[]
  ) => {
    if (!userAddress || !ethers.isAddress(userAddress)) {
      setError('Invalid user address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Fetch lending pool data
      const lendingPoolInterface = new ethers.Interface([
        'function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
      ]);

      const lendingPoolContract = new ethers.Contract(
        chainConfig.lendingPoolAddress,
        lendingPoolInterface,
        provider
      );

      const userData = await lendingPoolContract.getUserAccountData(userAddress);
      
      // Process user assets
      const userAssets = await Promise.all(
        assetConfigs.map(async (asset) => {
          // Add asset processing logic here
          return {
            address: asset.address,
            symbol: asset.symbol,
            name: asset.name,
            collateralBalance: 0,
            debtBalance: 0,
            collateralUSD: 0,
            debtUSD: 0,
            priceUSD: 0,
            decimals: asset.decimals
          };
        })
      );

      const hasPosition = userData.totalCollateralETH > 0 || userData.totalDebtETH > 0;

      setPositionInfo({
        totalCollateralETH: ethers.formatEther(userData.totalCollateralETH),
        totalDebtETH: ethers.formatEther(userData.totalDebtETH),
        totalCollateralUSD: 0, // Calculate based on userAssets
        totalDebtUSD: 0, // Calculate based on userAssets
        availableBorrowsETH: ethers.formatEther(userData.availableBorrowsETH),
        currentLiquidationThreshold: (Number(userData.currentLiquidationThreshold) / 100).toString(),
        ltv: (Number(userData.ltv) / 100).toString(),
        healthFactor: ethers.formatEther(userData.healthFactor),
        hasPosition,
        userAssets
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch Aave position');
      setPositionInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    positionInfo,
    isLoading,
    error,
    fetchPosition
  };
};