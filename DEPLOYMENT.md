# FreedomPool — Complete Deployment Guide

> **Version:** 1.0.0  
> **Last Updated:** May 2026  
> **Network:** Polygon (Mainnet: 137, Amoy Testnet: 80002)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Smart Contract Deployment (Testnet)](#4-smart-contract-deployment-testnet)
5. [Smart Contract Deployment (Mainnet)](#5-smart-contract-deployment-mainnet)
6. [Frontend Deployment](#6-frontend-deployment)
7. [Post-Deployment Configuration](#7-post-deployment-configuration)
8. [Verification & Testing](#8-verification--testing)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### Required Accounts

| Service | Purpose | URL |
|---------|---------|-----|
| Alchemy | RPC endpoints for Polygon | https://www.alchemy.com |
| Polygonscan | Contract verification | https://polygonscan.com/register |
| WalletConnect Cloud | Wallet integration | https://cloud.walletconnect.com |
| Chainlink VRF | Verifiable randomness | https://vrf.chain.link |
| Vercel | Frontend hosting | https://vercel.com |
| GitHub | Source control | https://github.com |

### Required Software

```bash
# Node.js 18+ (check version)
node --version  # Should be >= 18.0.0

# npm or yarn
npm --version

# Git
git --version
```

### Required Wallet

- **MetaMask** or any EVM-compatible wallet
- **NEVER use your main wallet for deployment** — create a dedicated deployer wallet
- Export the private key (MetaMask → Account Details → Export Private Key)

---

## 2. Repository Setup

```bash
# Clone the repository
git clone https://github.com/Tarantababu/FreedomPool.git
cd FreedomPool

# Install smart contract dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Project Structure

```
FreedomPool/
├── contracts/                 # Solidity smart contracts
│   ├── FreedomPool.sol        # Core vault & pool logic
│   ├── YieldStrategy.sol      # Aave/RWA/Staking yield
│   ├── PrizeDistributor.sol   # Chainlink VRF lottery
│   ├── FreedomToken.sol       # FDM governance token
│   ├── interfaces/            # Contract interfaces
│   └── mocks/                 # Test mocks
├── frontend/                  # React + Vite frontend
│   └── src/
│       ├── config/            # Contract addresses, wagmi, i18n
│       ├── hooks/             # Contract interaction hooks
│       ├── components/        # UI components
│       ├── locales/           # 7 language files
│       └── utils/             # Formatting utilities
├── scripts/deploy.js          # Deployment script
├── test/                      # Hardhat tests
├── hardhat.config.js          # Network configuration
├── FreedomPool-Standalone.jsx # UI prototype with all features
└── DEPLOYMENT.md              # This file
```

---

## 3. Environment Configuration

### Smart Contracts (.env)

Create `.env` in the project root:

```bash
cp .env.example .env
```

Fill in the values:

```env
# ═══════════════════════════════════════════════════════════
# WALLET (CRITICAL — NEVER COMMIT THIS FILE)
# ═══════════════════════════════════════════════════════════
PRIVATE_KEY=your_64_char_hex_private_key_without_0x

# ═══════════════════════════════════════════════════════════
# RPC ENDPOINTS (from Alchemy)
# ═══════════════════════════════════════════════════════════
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# ═══════════════════════════════════════════════════════════
# POLYGONSCAN (for contract verification)
# ═══════════════════════════════════════════════════════════
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# ═══════════════════════════════════════════════════════════
# CHAINLINK VRF — AMOY TESTNET
# ═══════════════════════════════════════════════════════════
VRF_SUBSCRIPTION_ID_AMOY=your_subscription_id_number

# ═══════════════════════════════════════════════════════════
# CHAINLINK VRF — POLYGON MAINNET
# ═══════════════════════════════════════════════════════════
VRF_SUBSCRIPTION_ID=your_mainnet_subscription_id
```

### Frontend (.env)

Create `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_CHAIN_ID=80002
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

---

## 4. Smart Contract Deployment (Testnet)

### Step 4.1 — Get Testnet Funds

1. **MATIC (gas):** https://faucet.polygon.technology/ → Select Amoy → Paste address
2. **Test USDC:** https://app.aave.com/faucet/ → Switch to Amoy → Mint USDC
3. **Test LINK (for VRF):** https://faucets.chain.link/ → Select Polygon Amoy

### Step 4.2 — Set Up Chainlink VRF Subscription

1. Go to https://vrf.chain.link
2. Connect wallet → Switch to **Polygon Amoy**
3. Click **"Create Subscription"**
4. Fund with 5+ LINK tokens
5. Copy the **Subscription ID** → paste into `.env` as `VRF_SUBSCRIPTION_ID_AMOY`

### Step 4.3 — Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 7 Solidity files successfully (with viaIR)
```

### Step 4.4 — Run Tests

```bash
npx hardhat test
```

### Step 4.5 — Deploy to Amoy

```bash
npx hardhat run scripts/deploy.js --network amoy
```

Expected output:
```
═══════════════════════════════════════════════════════════
  FreedomPool Deployment
═══════════════════════════════════════════════════════════
  Network:  amoy (chain 80002)
  Deployer: 0xYourAddress...
  Balance:  0.45 MATIC
───────────────────────────────────────────────────────────

1️⃣  Deploying FreedomToken (FDM)...
   ✅ FreedomToken: 0x...

2️⃣  Deploying YieldStrategy...
   ✅ YieldStrategy: 0x...

3️⃣  Deploying PrizeDistributor...
   ✅ PrizeDistributor: 0x...

4️⃣  Deploying FreedomPool (core)...
   ✅ FreedomPool: 0x...

5️⃣  Wiring contracts...
   → FreedomPool.setYieldStrategy ✓
   → FreedomPool.setPrizeDistributor ✓
   → FreedomPool.setFreedomToken ✓
   → YieldStrategy.setPool ✓
   → PrizeDistributor.setPool ✓
   → FreedomToken.addMinter(pool) ✓

═══════════════════════════════════════════════════════════
  ✅ DEPLOYMENT COMPLETE
═══════════════════════════════════════════════════════════

  📄 Deployment saved to ./deployments/amoy.json
```

### Step 4.6 — Add PrizeDistributor as VRF Consumer

1. Go back to https://vrf.chain.link
2. Open your subscription
3. Click **"Add Consumer"**
4. Paste the **PrizeDistributor** contract address

### Step 4.7 — Verify Contracts (Optional)

```bash
# Verify FreedomPool
npx hardhat verify --network amoy \
  FREEDOM_POOL_ADDRESS \
  "0x41E94Eb71898E8A20f3B1a45b5DcFBa6E46E8F6e" \
  "YOUR_DEPLOYER_ADDRESS" \
  "YOUR_DEPLOYER_ADDRESS"

# Verify FreedomToken
npx hardhat verify --network amoy \
  FREEDOM_TOKEN_ADDRESS \
  "YOUR_DEPLOYER_ADDRESS"
```

---

## 5. Smart Contract Deployment (Mainnet)

> ⚠️ **Only deploy to mainnet after thorough testnet testing and ideally a security audit.**

### Step 5.1 — Mainnet Preparation

1. Ensure deployer wallet has **at least 5 MATIC** for gas
2. Create a Chainlink VRF subscription on **Polygon Mainnet**
3. Fund VRF subscription with **10+ LINK**
4. Update `.env` with `VRF_SUBSCRIPTION_ID` (mainnet)

### Step 5.2 — Deploy

```bash
npx hardhat run scripts/deploy.js --network polygon
```

### Step 5.3 — Post-Mainnet Steps

1. Add PrizeDistributor as VRF consumer on mainnet subscription
2. Verify all contracts on Polygonscan
3. Transfer ownership to a multisig (e.g., Gnosis Safe)
4. Register with Chainlink Automation (Keepers) for automated epoch advancement

### Mainnet Contract Addresses (External)

| Contract | Address | Purpose |
|----------|---------|---------|
| USDC (Native) | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | Deposit token |
| Aave V3 Pool | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` | Yield generation |
| aPolUSDC | `0xA4D94019934D8333Ef880ABFFbF2FDd611C762BD` | Interest-bearing token |
| VRF Coordinator | `0xAE975071Be8F8eE67addBC1A82488F1C24858067` | Randomness |
| Keeper Registry | `0x02777053d6764996e594c3E88AF1D58D5363a2e6` | Automation |

---

## 6. Frontend Deployment

### Step 6.1 — Update Contract Addresses

After deployment, update `frontend/src/config/contracts.js` with your deployed addresses.

You can read them from `deployments/amoy.json` or `deployments/polygon.json`:

```javascript
// In frontend/src/config/contracts.js
80002: {
  FreedomPool: "0x_FROM_DEPLOYMENT_OUTPUT",
  YieldStrategy: "0x_FROM_DEPLOYMENT_OUTPUT",
  PrizeDistributor: "0x_FROM_DEPLOYMENT_OUTPUT",
  FreedomToken: "0x_FROM_DEPLOYMENT_OUTPUT",
  USDC: "0x41E94Eb71898E8A20f3B1a45b5DcFBa6E46E8F6e",
},
```

### Step 6.2 — Update WalletConnect Project ID

In `frontend/src/config/wagmi.js`:

```javascript
projectId: "YOUR_ACTUAL_PROJECT_ID_FROM_WALLETCONNECT_CLOUD",
```

### Step 6.3 — Test Locally

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and verify:
- Wallet connects successfully
- Network switches to Amoy/Polygon
- Deposit flow works end-to-end
- Language switcher works (7 languages)

### Step 6.4 — Build for Production

```bash
cd frontend
npm run build
```

### Step 6.5 — Deploy to Vercel

**Option A: Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy (from frontend directory)
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? → Yes
# - Which scope? → Your account
# - Link to existing project? → No
# - Project name? → freedompool
# - Directory? → ./
# - Override settings? → No

# Deploy to production
vercel --prod
```

**Option B: GitHub Integration (Recommended)**

1. Push code to GitHub (already done)
2. Go to https://vercel.com/new
3. Click **"Import Git Repository"**
4. Select `Tarantababu/FreedomPool`
5. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Add Environment Variables:
   - `VITE_CHAIN_ID` = `80002` (or `137` for mainnet)
   - `VITE_WALLETCONNECT_PROJECT_ID` = your project ID
7. Click **Deploy**

Every push to `main` will auto-deploy.

### Step 6.6 — Custom Domain (Optional)

In Vercel Dashboard → Project → Settings → Domains:
1. Add domain (e.g., `app.freedompool.io`)
2. Configure DNS as instructed (CNAME or A record)

---

## 7. Post-Deployment Configuration

### Chainlink Automation (Keepers)

To automate weekly epoch advancement:

1. Go to https://automation.chain.link
2. Register new Upkeep
3. Select **"Custom logic"**
4. Enter the **FreedomPool** contract address
5. Fund with LINK
6. The contract's `checkUpkeep` / `performUpkeep` functions handle the rest

### RWA & Staking Vaults (Optional)

After deployment, configure additional yield sources:

```bash
# Connect to deployed YieldStrategy and set vaults
npx hardhat console --network amoy

> const ys = await ethers.getContractAt("YieldStrategy", "YIELD_STRATEGY_ADDRESS")
> await ys.setRwaVault("RWA_VAULT_ADDRESS")
> await ys.setStakingVault("STAKING_VAULT_ADDRESS")
```

### Ownership Transfer (Mainnet)

For production, transfer ownership to a multisig:

```bash
npx hardhat console --network polygon

> const pool = await ethers.getContractAt("FreedomPool", "POOL_ADDRESS")
> await pool.transferOwnership("GNOSIS_SAFE_ADDRESS")
```

---

## 8. Verification & Testing

### End-to-End Test Flow

1. **Connect wallet** on correct network
2. **Get test USDC** from Aave faucet
3. **Approve USDC** → Transaction 1
4. **Deposit 100 USDC** into Koruma pool → Transaction 2
5. **Verify on Polygonscan** that deposit event was emitted
6. **Wait 1 epoch** (or call `advanceEpoch()` as owner)
7. **Claim rewards** if any yield was generated
8. **Withdraw** and verify penalty logic
9. **Test language switcher** (EN, DE, TR, FR, ES, AR, ZH)
10. **Test referral link** copy-to-clipboard

### Contract Verification Checklist

- [ ] FreedomPool verified on Polygonscan
- [ ] YieldStrategy verified
- [ ] PrizeDistributor verified
- [ ] FreedomToken verified
- [ ] VRF consumer added to subscription
- [ ] Keepers upkeep registered (mainnet)
- [ ] Ownership transferred to multisig (mainnet)

---

## 9. Monitoring & Maintenance

### Key Metrics to Monitor

| Metric | How to Check |
|--------|-------------|
| TVL | `FreedomPool.totalDeposits()` |
| Current Epoch | `FreedomPool.currentEpoch()` |
| Pending Yield | `YieldStrategy.pendingYield()` |
| Freedom Prize Pool | `PrizeDistributor.freedomPrizePool()` |
| VRF Balance | Check on vrf.chain.link |
| Keeper Balance | Check on automation.chain.link |

### Weekly Maintenance

1. Check VRF subscription LINK balance (top up if < 5 LINK)
2. Check Keeper LINK balance
3. Verify epoch advanced correctly
4. Monitor Aave positions for any issues

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Insufficient funds" on deploy | Get more MATIC from faucet |
| VRF callback not received | Check subscription has LINK, consumer is added |
| Frontend can't connect | Verify contract addresses in `contracts.js` |
| "Execution reverted" on deposit | Check USDC approval and balance |
| Epoch not advancing | Check Keeper registration or call manually |

### Useful Commands

```bash
# Check deployment addresses
cat deployments/amoy.json

# Open Hardhat console
npx hardhat console --network amoy

# Manually advance epoch (owner only)
> const pool = await ethers.getContractAt("FreedomPool", "ADDRESS")
> await pool.advanceEpoch()

# Check user position
> await pool.getUserPosition("USER_ADDRESS")

# Emergency pause
> await pool.pause()
```

---

## Cost Summary

### Testnet (Free)

| Item | Cost |
|------|------|
| Deployment gas | Free (test MATIC) |
| Alchemy RPC | Free tier |
| Vercel hosting | Free tier |
| WalletConnect | Free tier |
| Chainlink VRF | Free (test LINK) |

### Mainnet (Estimated)

| Item | Cost |
|------|------|
| Deployment gas | ~$5-10 (MATIC) |
| Chainlink VRF | ~$0.25 per draw (LINK) |
| Chainlink Keepers | ~$0.10 per epoch (LINK) |
| Vercel hosting | Free tier (100GB/mo) |
| Custom domain | ~$12/year |
| **Total first month** | **~$20-30** |

---

## Security Checklist (Before Mainnet)

- [ ] Smart contract audit completed
- [ ] All tests passing
- [ ] Ownership transferred to multisig
- [ ] Emergency pause tested
- [ ] No private keys in codebase
- [ ] Frontend environment variables set via Vercel dashboard (not committed)
- [ ] Rate limiting on RPC endpoints
- [ ] CORS configured properly
- [ ] CSP headers set on frontend

---

*Document maintained by the FreedomPool team. For questions, open an issue on GitHub.*
