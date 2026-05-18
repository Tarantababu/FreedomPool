import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon, polygonAmoy } from "wagmi/chains";

/**
 * Wagmi + RainbowKit configuration for FreedomPool.
 * Supports Polygon Mainnet and Amoy Testnet.
 */
export const config = getDefaultConfig({
  appName: "FreedomPool",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Get from https://cloud.walletconnect.com
  chains: [polygon, polygonAmoy],
  ssr: false,
});

// Default chain based on environment
export const DEFAULT_CHAIN_ID = import.meta.env.VITE_CHAIN_ID
  ? Number(import.meta.env.VITE_CHAIN_ID)
  : 80002; // Default to testnet for safety
