/**
 * Contract addresses and ABIs for FreedomPool protocol.
 * Supports both Polygon Mainnet (137) and Amoy Testnet (80002).
 */

// ─── Network Configurations ──────────────────────────────────────────────────
export const CHAINS = {
  polygon: {
    id: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
  amoy: {
    id: 80002,
    name: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    blockExplorer: "https://amoy.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
};

// ─── Contract Addresses ──────────────────────────────────────────────────────
// These are populated after deployment. Update with actual deployed addresses.
export const CONTRACTS = {
  // Polygon Mainnet (137)
  137: {
    FreedomPool: "0x0000000000000000000000000000000000000000", // TODO: Deploy
    YieldStrategy: "0x0000000000000000000000000000000000000000",
    PrizeDistributor: "0x0000000000000000000000000000000000000000",
    FreedomToken: "0x0000000000000000000000000000000000000000",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  // Polygon Amoy Testnet (80002)
  80002: {
    FreedomPool: "0x0000000000000000000000000000000000000000", // TODO: Deploy
    YieldStrategy: "0x0000000000000000000000000000000000000000",
    PrizeDistributor: "0x0000000000000000000000000000000000000000",
    FreedomToken: "0x0000000000000000000000000000000000000000",
    USDC: "0x41E94Eb71898E8A20f3B1a45b5DcFBa6E46E8F6e",
  },
};

// ─── ABIs (minimal interfaces for frontend interaction) ──────────────────────

export const FREEDOM_POOL_ABI = [
  // Read
  "function getUserPosition(address user) view returns (uint8 tier, uint256 amount, uint256 depositTimestamp, uint256 accumulatedRewards, bool active)",
  "function getPoolInfo(uint8 tier) view returns (uint256 minDeposit, uint256 maxDeposit, uint256 multiplier, uint256 poolTotalDeposits, uint256 userCount)",
  "function getProtocolStats() view returns (uint256 totalDeposits, uint256 currentEpoch, uint256 totalFeesCollected, uint256 totalYieldDistributed, uint256 totalPenalties, uint256 depositorCount)",
  "function getTimeUntilNextEpoch() view returns (uint256)",
  "function currentEpoch() view returns (uint256)",
  "function totalDeposits() view returns (uint256)",
  "function epochStartTime() view returns (uint256)",
  "function EARLY_EXIT_PENALTY_BPS() view returns (uint256)",
  "function PLATFORM_FEE_BPS() view returns (uint256)",
  "function FREEDOM_PRIZE_BPS() view returns (uint256)",
  "function paused() view returns (bool)",
  // Write
  "function deposit(uint8 tier, uint256 amount)",
  "function withdraw()",
  "function claimRewards()",
  // Events
  "event Deposited(address indexed user, uint8 tier, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount, uint256 penalty)",
  "event EpochAdvanced(uint256 indexed epoch, uint256 yieldHarvested, uint256 platformFee)",
  "event RewardsDistributed(uint256 indexed epoch, uint256 weeklyRewards, uint256 freedomPrize)",
  "event PassiveInterestCredited(address indexed user, uint256 amount)",
];

export const YIELD_STRATEGY_ABI = [
  "function totalDeposited() view returns (uint256)",
  "function pendingYield() view returns (uint256)",
  "function lastHarvestTimestamp() view returns (uint256)",
  "function aaveAllocation() view returns (uint256)",
  "function rwaAllocation() view returns (uint256)",
  "function stakingAllocation() view returns (uint256)",
];

export const PRIZE_DISTRIBUTOR_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function freedomPrizePool() view returns (uint256)",
  "function isDrawPending() view returns (bool)",
  "function getEpochWinner(uint256 epoch) view returns (address winner, uint256 amount)",
  "function getParticipantCount() view returns (uint256)",
];

export const FREEDOM_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// ─── Pool Tier Enum ──────────────────────────────────────────────────────────
export const POOL_TIERS = {
  Koruma: 0,
  Buyume: 1,
  Prestij: 2,
};

export const POOL_TIER_INFO = {
  0: { name: "Koruma", range: "10 – 500", min: 10, max: 500, mult: 1.0, emoji: "🛡️" },
  1: { name: "Büyüme", range: "500 – 5K", min: 500, max: 5000, mult: 1.5, emoji: "📈" },
  2: { name: "Prestij", range: "5K – 100K", min: 5000, max: 100000, mult: 2.0, emoji: "💎" },
};
