// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IYieldStrategy.sol";

/**
 * @title YieldStrategy
 * @notice Manages yield generation by allocating USDC across:
 *         - Aave V3 (60%) — Lending yield
 *         - RWA Protocol (20%) — Real-world asset yield
 *         - Staking/Compound (20%) — Additional DeFi yield
 *
 *         On Polygon Mainnet, this integrates with real Aave V3 pools.
 *         The RWA and staking allocations can be pointed to any compatible vault.
 */
contract YieldStrategy is IYieldStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State ───────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    address public pool; // FreedomPool contract — only caller

    // Aave V3 on Polygon
    address public aavePool;        // Aave V3 Pool address
    address public aUsdc;           // aUSDC token (interest-bearing)

    // Secondary strategies
    address public rwaVault;        // RWA yield vault
    address public stakingVault;    // Staking/compound vault

    // Allocation basis points (total = 10000)
    uint256 public aaveAllocation = 6000;   // 60%
    uint256 public rwaAllocation = 2000;    // 20%
    uint256 public stakingAllocation = 2000; // 20%

    uint256 public totalDepositedAmount;
    uint256 public lastHarvestTimestamp;

    // ─── Events ──────────────────────────────────────────────────────
    event Deposited(uint256 amount, uint256 toAave, uint256 toRwa, uint256 toStaking);
    event Withdrawn(uint256 amount, address recipient);
    event Harvested(uint256 yieldAmount);
    event AllocationUpdated(uint256 aave, uint256 rwa, uint256 staking);
    event EmergencyWithdrawn(uint256 amount);

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyPool() {
        require(msg.sender == pool, "YieldStrategy: caller is not pool");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _aavePool,
        address _aUsdc,
        address _owner
    ) Ownable(_owner) {
        usdc = IERC20(_usdc);
        aavePool = _aavePool;
        aUsdc = _aUsdc;
        lastHarvestTimestamp = block.timestamp;
    }

    // ─── Configuration ───────────────────────────────────────────────
    function setPool(address _pool) external onlyOwner {
        pool = _pool;
    }

    function setRwaVault(address _rwaVault) external onlyOwner {
        rwaVault = _rwaVault;
    }

    function setStakingVault(address _stakingVault) external onlyOwner {
        stakingVault = _stakingVault;
    }

    function setAllocation(uint256 _aave, uint256 _rwa, uint256 _staking) external onlyOwner {
        require(_aave + _rwa + _staking == 10000, "YieldStrategy: must total 10000");
        aaveAllocation = _aave;
        rwaAllocation = _rwa;
        stakingAllocation = _staking;
        emit AllocationUpdated(_aave, _rwa, _staking);
    }

    // ─── Core Functions ──────────────────────────────────────────────

    /// @inheritdoc IYieldStrategy
    function deposit(uint256 amount) external override onlyPool nonReentrant {
        require(amount > 0, "YieldStrategy: zero amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        uint256 toAave = (amount * aaveAllocation) / 10000;
        uint256 toRwa = (amount * rwaAllocation) / 10000;
        uint256 toStaking = amount - toAave - toRwa;

        // Deposit to Aave V3
        if (toAave > 0 && aavePool != address(0)) {
            usdc.safeIncreaseAllowance(aavePool, toAave);
            // Aave V3 Pool.supply(asset, amount, onBehalfOf, referralCode)
            (bool success,) = aavePool.call(
                abi.encodeWithSignature(
                    "supply(address,uint256,address,uint16)",
                    address(usdc), toAave, address(this), 0
                )
            );
            require(success, "YieldStrategy: Aave deposit failed");
        }

        // Deposit to RWA vault (ERC4626 compatible)
        if (toRwa > 0 && rwaVault != address(0)) {
            usdc.safeIncreaseAllowance(rwaVault, toRwa);
            (bool success,) = rwaVault.call(
                abi.encodeWithSignature("deposit(uint256,address)", toRwa, address(this))
            );
            require(success, "YieldStrategy: RWA deposit failed");
        }

        // Deposit to staking vault (ERC4626 compatible)
        if (toStaking > 0 && stakingVault != address(0)) {
            usdc.safeIncreaseAllowance(stakingVault, toStaking);
            (bool success,) = stakingVault.call(
                abi.encodeWithSignature("deposit(uint256,address)", toStaking, address(this))
            );
            require(success, "YieldStrategy: Staking deposit failed");
        }

        totalDepositedAmount += amount;
        emit Deposited(amount, toAave, toRwa, toStaking);
    }

    /// @inheritdoc IYieldStrategy
    function withdraw(uint256 amount, address recipient) external override onlyPool nonReentrant {
        require(amount > 0, "YieldStrategy: zero amount");
        require(amount <= totalDepositedAmount, "YieldStrategy: insufficient balance");

        uint256 fromAave = (amount * aaveAllocation) / 10000;
        uint256 fromRwa = (amount * rwaAllocation) / 10000;
        uint256 fromStaking = amount - fromAave - fromRwa;

        // Withdraw from Aave V3
        if (fromAave > 0 && aavePool != address(0)) {
            (bool success,) = aavePool.call(
                abi.encodeWithSignature(
                    "withdraw(address,uint256,address)",
                    address(usdc), fromAave, address(this)
                )
            );
            require(success, "YieldStrategy: Aave withdraw failed");
        }

        // Withdraw from RWA vault
        if (fromRwa > 0 && rwaVault != address(0)) {
            (bool success,) = rwaVault.call(
                abi.encodeWithSignature(
                    "withdraw(uint256,address,address)",
                    fromRwa, address(this), address(this)
                )
            );
            require(success, "YieldStrategy: RWA withdraw failed");
        }

        // Withdraw from staking vault
        if (fromStaking > 0 && stakingVault != address(0)) {
            (bool success,) = stakingVault.call(
                abi.encodeWithSignature(
                    "withdraw(uint256,address,address)",
                    fromStaking, address(this), address(this)
                )
            );
            require(success, "YieldStrategy: Staking withdraw failed");
        }

        totalDepositedAmount -= amount;
        usdc.safeTransfer(recipient, amount);
        emit Withdrawn(amount, recipient);
    }

    /// @inheritdoc IYieldStrategy
    function harvest() external override onlyPool nonReentrant returns (uint256 yieldAmount) {
        uint256 balanceBefore = usdc.balanceOf(address(this));

        // Withdraw all yield from Aave (aUSDC balance - deposited portion)
        if (aavePool != address(0) && aUsdc != address(0)) {
            uint256 aUsdcBalance = IERC20(aUsdc).balanceOf(address(this));
            uint256 aaveDeposited = (totalDepositedAmount * aaveAllocation) / 10000;
            if (aUsdcBalance > aaveDeposited) {
                uint256 aaveYield = aUsdcBalance - aaveDeposited;
                (bool success,) = aavePool.call(
                    abi.encodeWithSignature(
                        "withdraw(address,uint256,address)",
                        address(usdc), aaveYield, address(this)
                    )
                );
                // Don't revert on harvest failure, just skip
                if (!success) { /* skip */ }
            }
        }

        // Harvest from RWA vault (claim rewards if available)
        if (rwaVault != address(0)) {
            // Try to claim any pending rewards
            rwaVault.call(abi.encodeWithSignature("claimRewards(address)", address(this)));
        }

        // Harvest from staking vault
        if (stakingVault != address(0)) {
            stakingVault.call(abi.encodeWithSignature("claimRewards(address)", address(this)));
        }

        uint256 balanceAfter = usdc.balanceOf(address(this));
        yieldAmount = balanceAfter - balanceBefore;

        if (yieldAmount > 0) {
            usdc.safeTransfer(pool, yieldAmount);
        }

        lastHarvestTimestamp = block.timestamp;
        emit Harvested(yieldAmount);
    }

    /// @inheritdoc IYieldStrategy
    function totalDeposited() external view override returns (uint256) {
        return totalDepositedAmount;
    }

    /// @inheritdoc IYieldStrategy
    function pendingYield() external view override returns (uint256) {
        // Estimate based on aUSDC balance vs deposited
        if (aUsdc == address(0)) return 0;
        uint256 aUsdcBalance = IERC20(aUsdc).balanceOf(address(this));
        uint256 aaveDeposited = (totalDepositedAmount * aaveAllocation) / 10000;
        if (aUsdcBalance > aaveDeposited) {
            return aUsdcBalance - aaveDeposited;
        }
        return 0;
    }

    /// @inheritdoc IYieldStrategy
    function emergencyWithdraw() external override onlyOwner {
        // Withdraw everything from Aave
        if (aavePool != address(0) && aUsdc != address(0)) {
            uint256 aUsdcBalance = IERC20(aUsdc).balanceOf(address(this));
            if (aUsdcBalance > 0) {
                aavePool.call(
                    abi.encodeWithSignature(
                        "withdraw(address,uint256,address)",
                        address(usdc), type(uint256).max, address(this)
                    )
                );
            }
        }

        // Transfer all USDC to owner
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.safeTransfer(owner(), balance);
        }
        emit EmergencyWithdrawn(balance);
    }
}
