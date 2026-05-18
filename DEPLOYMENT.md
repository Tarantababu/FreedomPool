# FreedomPool — Complete Deployment Guide (Beginner-Friendly)

> This guide assumes you know **nothing** about crypto wallets, smart contracts, or blockchain deployment. Every single step is explained with screenshots-level detail.

---

## Table of Contents

1. [What You're Deploying](#1-what-youre-deploying)
2. [Install Required Software](#2-install-required-software)
3. [Create a Crypto Wallet (MetaMask)](#3-create-a-crypto-wallet-metamask)
4. [Get Free Test Money](#4-get-free-test-money)
5. [Create Required Accounts](#5-create-required-accounts)
6. [Configure the Project](#6-configure-the-project)
7. [Deploy Smart Contracts to Testnet](#7-deploy-smart-contracts-to-testnet)
8. [Set Up Chainlink VRF (Lottery Randomness)](#8-set-up-chainlink-vrf-lottery-randomness)
9. [Deploy the Website (Frontend)](#9-deploy-the-website-frontend)
10. [Test Everything Works](#10-test-everything-works)
11. [Deploy to Mainnet (Real Money)](#11-deploy-to-mainnet-real-money)
12. [Ongoing Maintenance](#12-ongoing-maintenance)
13. [Glossary](#13-glossary)

---

## 1. What You're Deploying

FreedomPool has two parts:

1. **Smart Contracts** — Programs that live on the Polygon blockchain. They handle deposits, yield generation, and the lottery. Once deployed, nobody can change them (not even you).

2. **Frontend Website** — A React web app that users interact with. It connects to the smart contracts via their wallet.

**The flow:**
```
User → Website → Wallet (MetaMask) → Smart Contracts on Polygon
```

---

## 2. Install Required Software

### 2.1 Install Node.js

Node.js is the runtime that executes our deployment scripts.

**macOS:**
```bash
# Option 1: Using Homebrew (recommended)
brew install node

# Option 2: Download installer from https://nodejs.org
# Choose the "LTS" version (not "Current")
```

**Verify installation:**
```bash
node --version
# Should show v18.x.x or higher

npm --version
# Should show 9.x.x or higher
```

### 2.2 Install Git

Git is version control — it tracks changes to your code.

**macOS:**
```bash
# It's usually pre-installed. Check:
git --version

# If not installed, macOS will prompt you to install Xcode Command Line Tools
# Or install via Homebrew:
brew install git
```

### 2.3 Clone the Repository

```bash
# Open Terminal (Cmd+Space, type "Terminal", press Enter)
# Navigate to where you want the project:
cd ~/Desktop

# Clone (download) the code:
git clone https://github.com/Tarantababu/FreedomPool.git

# Enter the project folder:
cd FreedomPool

# Install dependencies (this downloads all required libraries):
npm install

# Install frontend dependencies:
cd frontend && npm install && cd ..
```

You should now have a `FreedomPool` folder on your Desktop with all the code.

---

## 3. Create a Crypto Wallet (MetaMask)

A wallet is like a bank account for crypto. You need one to deploy contracts.

### 3.1 Install MetaMask

1. Open Chrome or Firefox
2. Go to https://metamask.io/download/
3. Click **"Install MetaMask for Chrome"** (or your browser)
4. Click **"Add to Chrome"** → **"Add Extension"**
5. A fox icon appears in your browser toolbar

### 3.2 Create a New Wallet

1. Click the MetaMask fox icon
2. Click **"Create a new wallet"**
3. Agree to terms
4. Create a password (this is for your browser only, not your crypto)
5. **CRITICAL:** MetaMask shows you 12 words (your "Secret Recovery Phrase")
   - Write these down on paper
   - Store them somewhere safe (not on your computer)
   - Anyone with these words can steal all your crypto
   - You can NEVER recover them if lost
6. Confirm the words in order
7. Done! You now have a wallet

### 3.3 Get Your Wallet Address

1. Click the MetaMask fox icon
2. At the top, you'll see something like `0x7F3C...D560`
3. Click it to copy your full address
4. This is your **public address** — safe to share (like an email address)

### 3.4 Get Your Private Key (Needed for Deployment)

> ⚠️ **Your private key is like your bank PIN. NEVER share it with anyone. NEVER put it in code that gets uploaded to GitHub.**

1. Click the MetaMask fox icon
2. Click the three dots (⋮) next to your account name
3. Click **"Account details"**
4. Click **"Show private key"**
5. Enter your MetaMask password
6. Copy the 64-character hex string (looks like `a1b2c3d4e5f6...`)
7. Save it somewhere safe temporarily — you'll need it in Step 6

### 3.5 Add Polygon Network to MetaMask

By default, MetaMask only shows Ethereum. We need to add Polygon:

1. Click the MetaMask fox icon
2. Click the network dropdown at the top (says "Ethereum Mainnet")
3. Click **"Add network"**
4. Click **"Add a network manually"**
5. Fill in:
   - **Network Name:** Polygon Mainnet
   - **New RPC URL:** `https://polygon-rpc.com`
   - **Chain ID:** `137`
   - **Currency Symbol:** `MATIC`
   - **Block Explorer URL:** `https://polygonscan.com`
6. Click **Save**

Now add the testnet too:
1. Same steps, but use:
   - **Network Name:** Polygon Amoy Testnet
   - **New RPC URL:** `https://rpc-amoy.polygon.technology`
   - **Chain ID:** `80002`
   - **Currency Symbol:** `MATIC`
   - **Block Explorer URL:** `https://amoy.polygonscan.com`
2. Click **Save**

---

## 4. Get Free Test Money

On the testnet, everything is free. You need "test MATIC" (for gas fees) and "test LINK" (for the lottery system).

### 4.1 Get Test MATIC (Gas Money)

Gas = the fee you pay to execute transactions on blockchain. On testnet it's free.

1. Go to https://faucet.polygon.technology/
2. Select network: **Amoy**
3. Select token: **MATIC**
4. Paste your wallet address (from Step 3.3)
5. Click **"Submit"**
6. Wait 30 seconds
7. Check MetaMask — you should see 0.5 MATIC on Polygon Amoy

If that faucet doesn't work, try: https://www.alchemy.com/faucets/polygon-amoy

### 4.2 Get Test LINK (For Lottery Randomness)

1. Go to https://faucets.chain.link/
2. Connect your MetaMask wallet (click "Connect wallet")
3. Select network: **Polygon Amoy**
4. Check **"LINK"** token
5. Complete the captcha
6. Click **"Send request"**
7. Wait 1-2 minutes
8. You should receive 20 test LINK

### 4.3 Get Test USDC (For Testing Deposits)

1. Go to https://app.aave.com/faucet/
2. Connect your MetaMask wallet
3. Switch to **Polygon Amoy** network in MetaMask
4. Find **USDC** in the list
5. Click **"Faucet"**
6. Approve the transaction in MetaMask
7. You'll receive test USDC

---

## 5. Create Required Accounts

You need accounts on 4 services. All have free tiers.

### 5.1 Alchemy (Blockchain Connection)

Alchemy provides a fast, reliable connection to the Polygon blockchain.

1. Go to https://www.alchemy.com/
2. Click **"Sign Up"** (use Google or email)
3. After signing in, click **"Create new app"**
4. Fill in:
   - **App name:** FreedomPool
   - **Chain:** Polygon
   - **Network:** Polygon Amoy (testnet)
5. Click **"Create app"**
6. On the app page, click **"API Key"**
7. Copy the **HTTPS** URL — it looks like:
   ```
   https://polygon-amoy.g.alchemy.com/v2/abc123xyz789...
   ```
8. Save this — it's your `AMOY_RPC_URL`

**For mainnet later:** Create another app with Network = "Polygon Mainnet" and save that URL as `POLYGON_RPC_URL`.

### 5.2 Polygonscan (Contract Verification)

Polygonscan lets you verify your contracts so anyone can read the source code.

1. Go to https://polygonscan.com/register
2. Create an account (email + password)
3. After login, go to https://polygonscan.com/myapikey
4. Click **"Add"** to create a new API key
5. Give it a name: "FreedomPool"
6. Copy the API key (looks like `ABC123DEF456...`)
7. Save this — it's your `POLYGONSCAN_API_KEY`

### 5.3 WalletConnect Cloud (Wallet Integration)

WalletConnect lets users connect various wallets to your website.

1. Go to https://cloud.walletconnect.com/
2. Sign up (Google or email)
3. Click **"Create a project"**
4. Fill in:
   - **Name:** FreedomPool
   - **Type:** App
   - **URL:** (leave blank for now, or put `https://freedompool.vercel.app`)
5. Click **"Create"**
6. Copy the **Project ID** (looks like `a1b2c3d4e5f6g7h8i9j0...`)
7. Save this — it's your `VITE_WALLETCONNECT_PROJECT_ID`

### 5.4 Vercel (Website Hosting)

Vercel hosts your frontend website for free.

1. Go to https://vercel.com/
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub
5. Done! You'll use this in Step 9.

---

## 6. Configure the Project

Now you'll create configuration files with all the keys you collected.

### 6.1 Create the Smart Contract Config

```bash
# Make sure you're in the FreedomPool folder
cd ~/Desktop/FreedomPool

# Create the .env file
cp .env.example .env
```

Now open `.env` in any text editor (VS Code, TextEdit, nano) and fill in:

```env
# Your MetaMask private key (64 characters, NO 0x prefix)
# Example: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
PRIVATE_KEY=paste_your_private_key_here

# Alchemy URLs (from Step 5.1)
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_key_here
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_key_here

# Polygonscan API key (from Step 5.2)
POLYGONSCAN_API_KEY=your_polygonscan_key_here

# Chainlink VRF Subscription ID (you'll get this in Step 8)
# Leave as 0 for now, we'll fill it in later
VRF_SUBSCRIPTION_ID_AMOY=0
```

**Save the file.**

### 6.2 Create the Frontend Config

```bash
cd frontend
cp .env.example .env
```

Open `frontend/.env` and fill in:

```env
# Use testnet for now (80002 = Amoy testnet, 137 = mainnet)
VITE_CHAIN_ID=80002

# WalletConnect Project ID (from Step 5.3)
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

**Save the file.**

---

## 7. Deploy Smart Contracts to Testnet

This is the big step — you're putting your programs on the blockchain.

### 7.1 Compile the Contracts

"Compiling" converts human-readable Solidity code into bytecode the blockchain can execute.

```bash
# Make sure you're in the project root
cd ~/Desktop/FreedomPool

# Compile
npx hardhat compile
```

**Expected output:**
```
Compiled 7 Solidity files successfully (with viaIR)
```

If you see errors, check that `npm install` completed successfully in Step 2.3.

### 7.2 Deploy to Amoy Testnet

```bash
npx hardhat run scripts/deploy.js --network amoy
```

**This will:**
1. Deploy 4 contracts to the Polygon Amoy testnet
2. Wire them together (tell each contract about the others)
3. Save all addresses to `deployments/amoy.json`

**Expected output:**
```
═══════════════════════════════════════════════════════════
  FreedomPool Deployment
═══════════════════════════════════════════════════════════
  Network:  amoy (chain 80002)
  Deployer: 0xYourWalletAddress
  Balance:  0.45 MATIC
───────────────────────────────────────────────────────────

1️⃣  Deploying FreedomToken (FDM)...
   ✅ FreedomToken: 0xABC123...

2️⃣  Deploying YieldStrategy...
   ✅ YieldStrategy: 0xDEF456...

3️⃣  Deploying PrizeDistributor...
   ✅ PrizeDistributor: 0x789GHI...

4️⃣  Deploying FreedomPool (core)...
   ✅ FreedomPool: 0xJKL012...

5️⃣  Wiring contracts...
   → All connections made ✓

═══════════════════════════════════════════════════════════
  ✅ DEPLOYMENT COMPLETE
═══════════════════════════════════════════════════════════
  📄 Deployment saved to ./deployments/amoy.json
```

### 7.3 Save Your Contract Addresses

Open `deployments/amoy.json` — it contains all your deployed contract addresses. You'll need these for the frontend.

**If deployment fails:**
- "Insufficient funds" → Go back to Step 4.1 and get more test MATIC
- "Nonce too low" → Wait 30 seconds and try again
- "Could not connect" → Check your `AMOY_RPC_URL` in `.env`

---

## 8. Set Up Chainlink VRF (Lottery Randomness)

Chainlink VRF provides provably fair random numbers for the lottery. Without it, the lottery can't pick winners.

### 8.1 Create a VRF Subscription

1. Go to https://vrf.chain.link/
2. Click **"Connect wallet"** (top right)
3. MetaMask will pop up — approve the connection
4. **Switch to Polygon Amoy** network in MetaMask (click the network dropdown)
5. The page should now show "Polygon Amoy" at the top
6. Click **"Create Subscription"**
7. MetaMask will ask you to confirm a transaction — click **"Confirm"**
8. Wait for the transaction to complete
9. You'll see your new subscription with an **ID number** (like `1234`)
10. **Copy this number** — this is your VRF Subscription ID

### 8.2 Fund the Subscription with LINK

1. On the same page, click your subscription
2. Click **"Fund subscription"**
3. Enter amount: `5` (5 LINK tokens)
4. Click **"Fund"**
5. Confirm in MetaMask
6. Wait for transaction to complete

### 8.3 Add Your Contract as a Consumer

1. On your subscription page, click **"Add consumer"**
2. Paste the **PrizeDistributor** address from Step 7.2 (find it in `deployments/amoy.json`)
3. Click **"Add consumer"**
4. Confirm in MetaMask

### 8.4 Update Your .env File

Now go back to your `.env` file and update:

```env
VRF_SUBSCRIPTION_ID_AMOY=1234
```

(Replace `1234` with your actual subscription ID from Step 8.1)

---

## 9. Deploy the Website (Frontend)

### 9.1 Update Contract Addresses in the Frontend

Open `frontend/src/config/contracts.js` in a text editor.

Find the section that looks like:
```javascript
80002: {
  FreedomPool: "0x0000000000000000000000000000000000000000",
  YieldStrategy: "0x0000000000000000000000000000000000000000",
  PrizeDistributor: "0x0000000000000000000000000000000000000000",
  FreedomToken: "0x0000000000000000000000000000000000000000",
  USDC: "0x41E94Eb71898E8A20f3B1a45b5DcFBa6E46E8F6e",
},
```

Replace the `0x000...` addresses with the real ones from `deployments/amoy.json`.

### 9.2 Update WalletConnect Project ID

Open `frontend/src/config/wagmi.js` and replace:
```javascript
projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
```
with your actual project ID from Step 5.3.

### 9.3 Test Locally

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser. You should see the FreedomPool website.

Try:
- Click "Connect Wallet" — MetaMask should pop up
- Switch to Polygon Amoy in MetaMask
- The site should show "Testnet" badge

Press `Ctrl+C` in terminal to stop the local server.

### 9.4 Deploy to Vercel (Free Hosting)

**Method 1: Automatic (Recommended)**

Since your code is on GitHub, Vercel can auto-deploy every time you push changes.

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Find and select **"Tarantababu/FreedomPool"**
4. Configure the project:
   - **Root Directory:** Click "Edit" and type `frontend`
   - **Framework Preset:** Should auto-detect as "Vite"
5. Click **"Environment Variables"** and add:
   - Name: `VITE_CHAIN_ID` → Value: `80002`
   - Name: `VITE_WALLETCONNECT_PROJECT_ID` → Value: your project ID
6. Click **"Deploy"**
7. Wait 1-2 minutes
8. Vercel gives you a URL like `freedompool-abc123.vercel.app`
9. **That's your live website!**

**Method 2: Manual (via CLI)**

```bash
# Install Vercel CLI
npm install -g vercel

# From the frontend folder
cd frontend

# Deploy
vercel

# It will ask questions:
# Set up and deploy? → y
# Which scope? → (press Enter for your account)
# Link to existing project? → N
# Project name? → freedompool
# Directory? → ./
# Override settings? → N

# For production deployment:
vercel --prod
```

### 9.5 Set Up Custom Domain (Optional)

If you own a domain (like `freedompool.io`):

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Domains**
3. Type your domain and click **Add**
4. Vercel shows you DNS records to add
5. Go to your domain registrar (GoDaddy, Namecheap, etc.)
6. Add the DNS records Vercel showed you
7. Wait 5-30 minutes for DNS to propagate
8. Your site is now live at your custom domain!

---

## 10. Test Everything Works

### 10.1 Full Test Checklist

Open your deployed website and test each step:

- [ ] **Connect wallet** — Click "Connect Wallet", MetaMask pops up, approve
- [ ] **Correct network** — Site shows "Testnet" or "Polygon Amoy"
- [ ] **Language switcher** — Click the language dropdown, try Arabic (should go RTL)
- [ ] **Deposit flow:**
  1. Click "Yatırım Yap" (or "Make a Deposit" in English)
  2. Select a pool (Koruma is easiest — only needs 10 USDC)
  3. Enter amount: `50`
  4. Click "Approve & Deposit"
  5. MetaMask pops up twice: once to approve USDC spending, once to deposit
  6. After both transactions confirm, you should see your position
- [ ] **Position shows** — Active position card with amount, pool name, lock status
- [ ] **Referral link** — Click "Share Referral", check clipboard has a link
- [ ] **Withdraw** — Click "Çek" (Withdraw), confirm in MetaMask

### 10.2 View on Polygonscan

1. Go to https://amoy.polygonscan.com/
2. Paste your FreedomPool contract address
3. Click the **"Events"** tab
4. You should see `Deposited` events from your test

---

## 11. Deploy to Mainnet (Real Money)

> ⚠️ **Only do this after thorough testing on testnet. Consider getting a security audit first.**

### 11.1 Differences from Testnet

| | Testnet | Mainnet |
|---|---------|---------|
| Money | Fake (free) | Real ($$$) |
| Network | Amoy (80002) | Polygon (137) |
| MATIC needed | Free from faucet | Buy on exchange (~$5-10) |
| LINK needed | Free from faucet | Buy on exchange (~$50) |
| Mistakes | No consequences | Could lose real money |

### 11.2 Mainnet Deployment Steps

1. **Get real MATIC:** Buy on Coinbase/Binance, send to your deployer wallet
2. **Get real LINK:** Buy LINK on Polygon, need ~10 LINK for VRF
3. **Create mainnet Alchemy app** (Step 5.1 but select "Polygon Mainnet")
4. **Create mainnet VRF subscription** (Step 8 but on Polygon Mainnet)
5. **Update `.env`:**
   ```env
   POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_key
   VRF_SUBSCRIPTION_ID=your_mainnet_subscription_id
   ```
6. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.js --network polygon
   ```
7. **Update frontend** with mainnet addresses
8. **Change `VITE_CHAIN_ID` to `137`** in Vercel environment variables
9. **Redeploy frontend** (push to GitHub or run `vercel --prod`)

### 11.3 Security Steps for Mainnet

- [ ] Transfer contract ownership to a **multisig wallet** (like Gnosis Safe)
- [ ] Set up **Chainlink Automation** (Keepers) for automatic weekly epochs
- [ ] Verify all contracts on Polygonscan
- [ ] Consider a professional security audit ($5K-$50K depending on scope)

---

## 12. Ongoing Maintenance

### Weekly Tasks

| Task | How |
|------|-----|
| Check VRF LINK balance | Go to vrf.chain.link, top up if < 5 LINK |
| Verify epoch advanced | Check `currentEpoch()` on Polygonscan |
| Monitor TVL | Check `totalDeposits()` on Polygonscan |

### Monthly Tasks

| Task | How |
|------|-----|
| Check Alchemy usage | Dashboard at alchemy.com |
| Review Vercel analytics | Dashboard at vercel.com |
| Update dependencies | `npm update` in both root and frontend |

### How to Make Changes

```bash
# 1. Pull latest code
git pull origin main

# 2. Create a new branch for your changes
git checkout -b feature/my-change

# 3. Make your changes...

# 4. Test locally
cd frontend && npm run dev

# 5. Commit and push
git add .
git commit -m "feat: description of what you changed"
git push -u origin feature/my-change

# 6. Go to GitHub and create a Pull Request
# 7. Merge the PR
# 8. Vercel auto-deploys the new version
```

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **Smart Contract** | A program that runs on the blockchain. Once deployed, it can't be changed. |
| **Wallet** | Software that holds your crypto keys. Like a bank account you fully control. |
| **Private Key** | A secret 64-character code that controls your wallet. NEVER share it. |
| **Gas** | The fee paid to execute transactions on blockchain. Paid in MATIC on Polygon. |
| **MATIC** | The native currency of Polygon. Used to pay gas fees. |
| **USDC** | A stablecoin pegged to $1 USD. What users deposit into FreedomPool. |
| **LINK** | Chainlink's token. Used to pay for VRF (randomness) and Keepers (automation). |
| **Testnet** | A fake version of the blockchain for testing. Everything is free. |
| **Mainnet** | The real blockchain where real money is used. |
| **RPC URL** | A web address that connects your code to the blockchain (provided by Alchemy). |
| **ABI** | Application Binary Interface — tells the frontend how to talk to contracts. |
| **Epoch** | A time period (1 week) in FreedomPool. Each epoch has one lottery draw. |
| **TVL** | Total Value Locked — how much money is deposited in the protocol. |
| **APY** | Annual Percentage Yield — the yearly interest rate. |
| **VRF** | Verifiable Random Function — Chainlink's provably fair random number generator. |
| **Keepers** | Chainlink's automation service that triggers functions on a schedule. |
| **Multisig** | A wallet that requires multiple people to approve transactions (safer). |
| **ERC20** | A standard for tokens on Ethereum/Polygon (USDC, LINK, FDM are all ERC20). |
| **Aave** | A DeFi lending protocol where FreedomPool earns yield. |
| **Vercel** | A free hosting platform for websites. |
| **Hardhat** | A development tool for writing, testing, and deploying smart contracts. |

---

## Quick Reference Card

### All Commands in One Place

```bash
# ─── Setup ────────────────────────────────────
git clone https://github.com/Tarantababu/FreedomPool.git
cd FreedomPool
npm install
cd frontend && npm install && cd ..

# ─── Configure ────────────────────────────────
cp .env.example .env          # Edit with your keys
cp frontend/.env.example frontend/.env  # Edit with your keys

# ─── Smart Contracts ──────────────────────────
npx hardhat compile            # Compile contracts
npx hardhat test               # Run tests
npx hardhat run scripts/deploy.js --network amoy     # Deploy testnet
npx hardhat run scripts/deploy.js --network polygon  # Deploy mainnet

# ─── Frontend ─────────────────────────────────
cd frontend
npm run dev                    # Run locally (http://localhost:5173)
npm run build                  # Build for production
vercel                         # Deploy to Vercel
vercel --prod                  # Deploy to production

# ─── Git (making changes) ─────────────────────
git add .
git commit -m "description of change"
git push origin main
```

### All URLs You'll Need

| Service | URL |
|---------|-----|
| Your Repository | https://github.com/Tarantababu/FreedomPool |
| Polygon Faucet | https://faucet.polygon.technology/ |
| Chainlink Faucet | https://faucets.chain.link/ |
| Aave Faucet | https://app.aave.com/faucet/ |
| Chainlink VRF | https://vrf.chain.link/ |
| Chainlink Keepers | https://automation.chain.link/ |
| Alchemy Dashboard | https://dashboard.alchemy.com/ |
| Polygonscan (Mainnet) | https://polygonscan.com/ |
| Polygonscan (Testnet) | https://amoy.polygonscan.com/ |
| Vercel Dashboard | https://vercel.com/dashboard |
| WalletConnect Cloud | https://cloud.walletconnect.com/ |

### Cost Summary

| Item | Testnet | Mainnet |
|------|---------|---------|
| Deployment gas | Free | ~$5-10 in MATIC |
| Chainlink VRF | Free | ~$0.25 per lottery draw |
| Chainlink Keepers | Free | ~$0.10 per week |
| Alchemy RPC | Free (300M units/mo) | Free tier sufficient |
| Vercel hosting | Free (100GB/mo) | Free tier sufficient |
| WalletConnect | Free | Free |
| Custom domain | N/A | ~$12/year |
| **Total to start** | **$0** | **~$20-30** |
| **Monthly ongoing** | **$0** | **~$5-10** |

---

*Last updated: May 2026. If you get stuck, open an issue on GitHub.*
