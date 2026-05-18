# FreedomPool — No-Loss Retirement Protocol on Polygon

## Overview

FreedomPool is a decentralized "no-loss" savings and lottery protocol on Polygon. Users deposit USDC into tiered pools. Their principal remains safe while the yield generated from DeFi strategies (Aave, RWA protocols, staking) funds weekly prize draws and passive interest distribution.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  Wallet Connect · Contract Interactions · Real-time Data    │
└──────────────────────────────┬──────────────────────────────┘
                               │ ethers.js / wagmi
┌──────────────────────────────▼──────────────────────────────┐
│                   Smart Contracts (Solidity)                 │
│                                                             │
│  FreedomPool.sol          — Core vault & pool logic         │
│  YieldStrategy.sol        — Aave/RWA/Staking integration    │
│  PrizeDistributor.sol     — VRF-based weekly lottery        │
│  FreedomToken.sol         — Governance/reward token (ERC20) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              External Protocols (Polygon Mainnet)            │
│                                                             │
│  Aave V3          — Lending yield (60% allocation)          │
│  RWA Protocol     — Real-world asset yield (20%)            │
│  Polygon Staking  — MATIC staking yield (20%)               │
│  Chainlink VRF    — Verifiable random for lottery           │
│  Chainlink Keepers— Automated epoch execution               │
└─────────────────────────────────────────────────────────────┘
```

## Features

1. **Tiered Pools** — Koruma (10-500), Büyüme (500-5K), Prestij (5K-100K) USDC
2. **No-Loss Guarantee** — Principal always withdrawable (minus early exit penalty)
3. **Yield Generation** — Automated DeFi yield via Aave V3, RWA, and staking
4. **Weekly Lottery** — Chainlink VRF-powered fair prize draws
5. **Freedom Prize** — Accumulated jackpot (30% of net yield)
6. **Early Exit Penalty** — 5% penalty redistributed to remaining participants
7. **Platform Fee** — 10% of yield only (never touches principal)
8. **Governance Token** — FDM token for voting and bonus rewards
9. **Epoch System** — Weekly cycles with automated Chainlink Keepers
10. **Full Transparency** — All operations on-chain, verifiable

## Networks

| Network | Chain ID | USDC | Aave Pool |
|---------|----------|------|-----------|
| Polygon Mainnet | 137 | 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 | 0x794a61358D6845594F94dc1DB02A252b5b4814aD |
| Polygon Amoy (Testnet) | 80002 | 0x41E94Eb71898E8A20f3B1a45b5DcFBa6E46E8F6e | 0x6C9fB0D5bD9429eb9Cd96B85B81d872281771E6B |

## Quick Start

```bash
# Install dependencies
cd freedompool && npm install
cd frontend && npm install

# Deploy to testnet
npx hardhat run scripts/deploy.js --network amoy

# Start frontend
cd frontend && npm run dev
```

## Security

- Audited yield strategies with conservative allocation
- Chainlink VRF for provably fair randomness
- Timelock on admin functions
- Emergency pause mechanism
- No admin access to user funds
