const { ethers, network } = require("hardhat");

/**
 * FreedomPool Deployment Script
 * Deploys all contracts and wires them together.
 *
 * Networks:
 * - amoy: Polygon Amoy testnet (chain 80002)
 * - polygon: Polygon Mainnet (chain 137)
 * - hardhat: Local fork for testing
 */

// ─── Network-specific addresses ──────────────────────────────────────────────
const ADDRESSES = {
  // Polygon Mainnet
  137: {
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    aUsdc: "0xA4D94019934D8333Ef880ABFFbF2FDd611C762BD", // aPolUSDC
    vrfCoordinator: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
    vrfKeyHash: "0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd",
    vrfSubscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
  },
  // Polygon Amoy Testnet
  80002: {
    usdc: "0x41E94Eb71898E8A20f3B1a45b5DcFBa6E46E8F6e", // Test USDC on Amoy
    aavePool: "0x6C9fB0D5bD9429eb9Cd96B85B81d872281771E6B", // Aave V3 Pool on Amoy
    aUsdc: "0x4086fabeE92a080002eeBA1220B9025a27a40A49", // aUSDC on Amoy
    vrfCoordinator: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
    vrfKeyHash: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
    vrfSubscriptionId: process.env.VRF_SUBSCRIPTION_ID_AMOY || "0",
  },
  // Hardhat (local fork)
  31337: {
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    aUsdc: "0xA4D94019934D8333Ef880ABFFbF2FDd611C762BD",
    vrfCoordinator: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
    vrfKeyHash: "0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd",
    vrfSubscriptionId: "0",
  },
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const addrs = ADDRESSES[Number(chainId)];

  if (!addrs) {
    throw new Error(`Unsupported chain ID: ${chainId}. Use amoy (80002) or polygon (137).`);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  FreedomPool Deployment");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Network:  ${network.name} (chain ${chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} POL`);
  console.log("───────────────────────────────────────────────────────────");

  // 1. Deploy FreedomToken
  console.log("\n1️⃣  Deploying FreedomToken (FDM)...");
  const FreedomToken = await ethers.getContractFactory("FreedomToken");
  const freedomToken = await FreedomToken.deploy(deployer.address);
  await freedomToken.waitForDeployment();
  const fdmAddr = await freedomToken.getAddress();
  console.log(`   ✅ FreedomToken: ${fdmAddr}`);

  // 2. Deploy YieldStrategy
  console.log("\n2️⃣  Deploying YieldStrategy...");
  const YieldStrategy = await ethers.getContractFactory("YieldStrategy");
  const yieldStrategy = await YieldStrategy.deploy(
    addrs.usdc,
    addrs.aavePool,
    addrs.aUsdc,
    deployer.address
  );
  await yieldStrategy.waitForDeployment();
  const ysAddr = await yieldStrategy.getAddress();
  console.log(`   ✅ YieldStrategy: ${ysAddr}`);

  // 3. Deploy PrizeDistributor
  console.log("\n3️⃣  Deploying PrizeDistributor...");
  const PrizeDistributor = await ethers.getContractFactory("PrizeDistributor");
  const prizeDistributor = await PrizeDistributor.deploy(
    addrs.usdc,
    addrs.vrfCoordinator,
    addrs.vrfKeyHash,
    BigInt(addrs.vrfSubscriptionId),
    deployer.address
  );
  await prizeDistributor.waitForDeployment();
  const pdAddr = await prizeDistributor.getAddress();
  console.log(`   ✅ PrizeDistributor: ${pdAddr}`);

  // 4. Deploy FreedomPool (main contract)
  console.log("\n4️⃣  Deploying FreedomPool (core)...");
  const FreedomPool = await ethers.getContractFactory("FreedomPool");
  const freedomPool = await FreedomPool.deploy(
    addrs.usdc,
    deployer.address, // fee recipient
    deployer.address  // owner
  );
  await freedomPool.waitForDeployment();
  const fpAddr = await freedomPool.getAddress();
  console.log(`   ✅ FreedomPool: ${fpAddr}`);

  // 5. Wire contracts together
  console.log("\n5️⃣  Wiring contracts...");

  await freedomPool.setYieldStrategy(ysAddr);
  console.log("   → FreedomPool.setYieldStrategy ✓");

  await freedomPool.setPrizeDistributor(pdAddr);
  console.log("   → FreedomPool.setPrizeDistributor ✓");

  await freedomPool.setFreedomToken(fdmAddr);
  console.log("   → FreedomPool.setFreedomToken ✓");

  await yieldStrategy.setPool(fpAddr);
  console.log("   → YieldStrategy.setPool ✓");

  await prizeDistributor.setPool(fpAddr);
  console.log("   → PrizeDistributor.setPool ✓");

  await freedomToken.addMinter(fpAddr);
  console.log("   → FreedomToken.addMinter(pool) ✓");

  // 6. Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  ✅ DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  FreedomPool:      ${fpAddr}`);
  console.log(`  YieldStrategy:    ${ysAddr}`);
  console.log(`  PrizeDistributor: ${pdAddr}`);
  console.log(`  FreedomToken:     ${fdmAddr}`);
  console.log("───────────────────────────────────────────────────────────");
  console.log(`  USDC:             ${addrs.usdc}`);
  console.log(`  Aave Pool:        ${addrs.aavePool}`);
  console.log(`  VRF Coordinator:  ${addrs.vrfCoordinator}`);
  console.log("═══════════════════════════════════════════════════════════");

  // Write deployment addresses to file
  const fs = require("fs");
  const deployment = {
    network: network.name,
    chainId: Number(chainId),
    timestamp: new Date().toISOString(),
    contracts: {
      FreedomPool: fpAddr,
      YieldStrategy: ysAddr,
      PrizeDistributor: pdAddr,
      FreedomToken: fdmAddr,
    },
    external: {
      usdc: addrs.usdc,
      aavePool: addrs.aavePool,
      aUsdc: addrs.aUsdc,
      vrfCoordinator: addrs.vrfCoordinator,
    },
  };

  const outPath = `./deployments/${network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  📄 Deployment saved to ${outPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
