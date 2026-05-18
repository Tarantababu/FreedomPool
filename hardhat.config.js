require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Private key handling:
// - If PRIVATE_KEY is set in .env, use it (with or without 0x prefix)
// - If not set, use a dummy key so compilation still works
function getAccounts() {
  const key = process.env.PRIVATE_KEY;
  if (!key || key === "your_private_key_here" || key.length < 64) {
    // Return a valid dummy key — compilation works, deployment will fail gracefully
    return ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"];
  }
  // Add 0x prefix if missing
  return [key.startsWith("0x") ? key : `0x${key}`];
}

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.POLYGON_RPC_URL || "https://polygon.drpc.org",
        blockNumber: 52000000,
      },
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://polygon-amoy.drpc.org",
      chainId: 80002,
      accounts: getAccounts(),
      gasPrice: 30000000000, // 30 gwei
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon.drpc.org",
      chainId: 137,
      accounts: getAccounts(),
      gasPrice: 50000000000, // 50 gwei
    },
  },
  etherscan: {
    apiKey: {
      polygon: POLYGONSCAN_API_KEY,
      polygonAmoy: POLYGONSCAN_API_KEY,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
