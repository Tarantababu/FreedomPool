import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  CONTRACTS,
  FREEDOM_POOL_ABI,
  YIELD_STRATEGY_ABI,
  PRIZE_DISTRIBUTOR_ABI,
  FREEDOM_TOKEN_ABI,
  ERC20_ABI,
  POOL_TIER_INFO,
} from "../config/contracts";

/**
 * Hook: Get contract addresses for the current chain
 */
export function useContractAddresses() {
  const chainId = useChainId();
  return CONTRACTS[chainId] || CONTRACTS[80002]; // Fallback to testnet
}

/**
 * Hook: Read user's USDC balance
 */
export function useUsdcBalance() {
  const { address } = useAccount();
  const contracts = useContractAddresses();

  const { data, refetch } = useReadContract({
    address: contracts.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
  });

  return {
    balance: data ? Number(formatUnits(data, 6)) : 0,
    raw: data || 0n,
    refetch,
  };
}

/**
 * Hook: Read user's USDC allowance for FreedomPool
 */
export function useUsdcAllowance() {
  const { address } = useAccount();
  const contracts = useContractAddresses();

  const { data, refetch } = useReadContract({
    address: contracts.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, contracts.FreedomPool],
    enabled: !!address,
  });

  return {
    allowance: data ? Number(formatUnits(data, 6)) : 0,
    raw: data || 0n,
    refetch,
  };
}

/**
 * Hook: Approve USDC spending
 */
export function useApproveUsdc() {
  const contracts = useContractAddresses();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount) => {
    writeContract({
      address: contracts.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contracts.FreedomPool, parseUnits(amount.toString(), 6)],
    });
  };

  return { approve, isPending, isConfirming, isSuccess, hash };
}

/**
 * Hook: Read user's position in FreedomPool
 */
export function useUserPosition() {
  const { address } = useAccount();
  const contracts = useContractAddresses();

  const { data, refetch } = useReadContract({
    address: contracts.FreedomPool,
    abi: FREEDOM_POOL_ABI,
    functionName: "getUserPosition",
    args: [address],
    enabled: !!address,
  });

  if (!data) return { position: null, refetch };

  const [tier, amount, depositTimestamp, accumulatedRewards, active] = data;
  return {
    position: active
      ? {
          tier: Number(tier),
          tierInfo: POOL_TIER_INFO[Number(tier)],
          amount: Number(formatUnits(amount, 6)),
          rawAmount: amount,
          depositTimestamp: Number(depositTimestamp),
          accumulatedRewards: Number(formatUnits(accumulatedRewards, 6)),
          rawRewards: accumulatedRewards,
          active,
        }
      : null,
    refetch,
  };
}

/**
 * Hook: Read protocol stats
 */
export function useProtocolStats() {
  const contracts = useContractAddresses();

  const { data, refetch } = useReadContract({
    address: contracts.FreedomPool,
    abi: FREEDOM_POOL_ABI,
    functionName: "getProtocolStats",
  });

  if (!data) return { stats: null, refetch };

  const [totalDeposits, currentEpoch, totalFeesCollected, totalYieldDistributed, totalPenalties, depositorCount] = data;
  return {
    stats: {
      totalDeposits: Number(formatUnits(totalDeposits, 6)),
      currentEpoch: Number(currentEpoch),
      totalFeesCollected: Number(formatUnits(totalFeesCollected, 6)),
      totalYieldDistributed: Number(formatUnits(totalYieldDistributed, 6)),
      totalPenalties: Number(formatUnits(totalPenalties, 6)),
      depositorCount: Number(depositorCount),
    },
    refetch,
  };
}

/**
 * Hook: Read pool info for all tiers
 */
export function usePoolsInfo() {
  const contracts = useContractAddresses();

  const pool0 = useReadContract({
    address: contracts.FreedomPool,
    abi: FREEDOM_POOL_ABI,
    functionName: "getPoolInfo",
    args: [0],
  });

  const pool1 = useReadContract({
    address: contracts.FreedomPool,
    abi: FREEDOM_POOL_ABI,
    functionName: "getPoolInfo",
    args: [1],
  });

  const pool2 = useReadContract({
    address: contracts.FreedomPool,
    abi: FREEDOM_POOL_ABI,
    functionName: "getPoolInfo",
    args: [2],
  });

  const parsePool = (data, tier) => {
    if (!data) return null;
    const [minDeposit, maxDeposit, multiplier, totalDeposits, userCount] = data;
    return {
      ...POOL_TIER_INFO[tier],
      totalDeposits: Number(formatUnits(totalDeposits, 6)),
      userCount: Number(userCount),
    };
  };

  return {
    pools: [
      parsePool(pool0.data, 0),
      parsePool(pool1.data, 1),
      parsePool(pool2.data, 2),
    ].filter(Boolean),
    refetch: () => {
      pool0.refetch();
      pool1.refetch();
      pool2.refetch();
    },
  };
}

/**
 * Hook: Read time until next epoch
 */
export function useNextEpoch() {
  const contracts = useContractAddresses();

  const { data } = useReadContract({
    address: contracts.FreedomPool,
    abi: FREEDOM_POOL_ABI,
    functionName: "getTimeUntilNextEpoch",
  });

  return { secondsUntilNextEpoch: data ? Number(data) : 0 };
}

/**
 * Hook: Read yield strategy info
 */
export function useYieldInfo() {
  const contracts = useContractAddresses();

  const { data: pending } = useReadContract({
    address: contracts.YieldStrategy,
    abi: YIELD_STRATEGY_ABI,
    functionName: "pendingYield",
  });

  const { data: totalDeposited } = useReadContract({
    address: contracts.YieldStrategy,
    abi: YIELD_STRATEGY_ABI,
    functionName: "totalDeposited",
  });

  return {
    pendingYield: pending ? Number(formatUnits(pending, 6)) : 0,
    totalDeposited: totalDeposited ? Number(formatUnits(totalDeposited, 6)) : 0,
  };
}

/**
 * Hook: Read prize distributor info
 */
export function usePrizeInfo() {
  const contracts = useContractAddresses();

  const { data: freedomPrize } = useReadContract({
    address: contracts.PrizeDistributor,
    abi: PRIZE_DISTRIBUTOR_ABI,
    functionName: "freedomPrizePool",
  });

  const { data: drawPending } = useReadContract({
    address: contracts.PrizeDistributor,
    abi: PRIZE_DISTRIBUTOR_ABI,
    functionName: "isDrawPending",
  });

  const { data: participantCount } = useReadContract({
    address: contracts.PrizeDistributor,
    abi: PRIZE_DISTRIBUTOR_ABI,
    functionName: "getParticipantCount",
  });

  return {
    freedomPrize: freedomPrize ? Number(formatUnits(freedomPrize, 6)) : 0,
    drawPending: drawPending || false,
    participantCount: participantCount ? Number(participantCount) : 0,
  };
}

/**
 * Hook: Read FDM token balance
 */
export function useFdmBalance() {
  const { address } = useAccount();
  const contracts = useContractAddresses();

  const { data } = useReadContract({
    address: contracts.FreedomToken,
    abi: FREEDOM_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
  });

  return { balance: data ? Number(formatUnits(data, 18)) : 0 };
}

/**
 * Hook: Deposit into FreedomPool
 */
export function useDeposit() {
  const contracts = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = (tier, amount) => {
    writeContract({
      address: contracts.FreedomPool,
      abi: FREEDOM_POOL_ABI,
      functionName: "deposit",
      args: [tier, parseUnits(amount.toString(), 6)],
    });
  };

  return { deposit, isPending, isConfirming, isSuccess, error, hash };
}

/**
 * Hook: Withdraw from FreedomPool
 */
export function useWithdraw() {
  const contracts = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = () => {
    writeContract({
      address: contracts.FreedomPool,
      abi: FREEDOM_POOL_ABI,
      functionName: "withdraw",
    });
  };

  return { withdraw, isPending, isConfirming, isSuccess, error, hash };
}

/**
 * Hook: Claim accumulated rewards
 */
export function useClaimRewards() {
  const contracts = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = () => {
    writeContract({
      address: contracts.FreedomPool,
      abi: FREEDOM_POOL_ABI,
      functionName: "claimRewards",
    });
  };

  return { claim, isPending, isConfirming, isSuccess, error, hash };
}
