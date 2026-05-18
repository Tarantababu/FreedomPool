// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IYieldStrategy.sol";
import "./interfaces/IPrizeDistributor.sol";
import "./FreedomToken.sol";

/**
 * @title FreedomPool
 * @notice Core vault contract for the FreedomPool no-loss retirement protocol.
 *
 *         Users deposit USDC into tiered pools. Principal is always safe.
 *         Yield from DeFi strategies funds weekly prize draws.
 *
 *         Pool Tiers:
 *         - Koruma (Protection): 10-500 USDC, 1.0x lottery weight
 *         - Büyüme (Growth): 500-5000 USDC, 1.5x lottery weight
 *         - Prestij (Prestige): 5000-100000 USDC, 2.0x lottery weight
 *
 *         Fee Structure (from yield only, never principal):
 *         - 10% platform fee
 *         - 30% of net yield → Freedom Prize (jackpot)
 *         - 70% of net yield → Weekly distribution + passive interest
 *
 *         Early withdrawal penalty: 5% of principal → redistributed to pool
 */
contract FreedomPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS = 1000;      // 10%
    uint256 public constant FREEDOM_PRIZE_BPS = 3000;     // 30% of net yield
    uint256 public constant EARLY_EXIT_PENALTY_BPS = 500; // 5%
    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public constant MIN_DEPOSIT_DURATION = 7 days; // No penalty after 1 epoch
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Pool tier multipliers (in basis points for precision)
    uint256 public constant KORUMA_MULT = 10000;   // 1.0x
    uint256 public constant BUYUME_MULT = 15000;   // 1.5x
    uint256 public constant PRESTIJ_MULT = 20000;  // 2.0x

    // ─── Structs ─────────────────────────────────────────────────────
    enum PoolTier { Koruma, Buyume, Prestij }

    struct PoolConfig {
        uint256 minDeposit;   // Minimum deposit (USDC, 6 decimals)
        uint256 maxDeposit;   // Maximum deposit
        uint256 multiplier;   // Lottery weight multiplier (BPS)
        uint256 totalDeposits;
        uint256 userCount;
    }

    struct UserPosition {
        PoolTier tier;
        uint256 amount;
        uint256 depositTimestamp;
        uint256 accumulatedRewards; // Passive interest earned
        bool active;
    }

    // ─── State ───────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    IYieldStrategy public yieldStrategy;
    IPrizeDistributor public prizeDistributor;
    FreedomToken public freedomToken;

    address public feeRecipient;
    uint256 public currentEpoch;
    uint256 public epochStartTime;
    uint256 public totalDeposits;
    uint256 public totalPenaltiesCollected;
    uint256 public totalFeesCollected;
    uint256 public totalYieldDistributed;

    // FDM reward rate: tokens per USDC per epoch
    uint256 public fdmRewardRate = 1e18; // 1 FDM per USDC per epoch (adjustable)

    mapping(PoolTier => PoolConfig) public pools;
    mapping(address => UserPosition) public positions;
    address[] public depositors;

    // ─── Events ──────────────────────────────────────────────────────
    event Deposited(address indexed user, PoolTier tier, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 penalty);
    event EpochAdvanced(uint256 indexed epoch, uint256 yieldHarvested, uint256 platformFee);
    event RewardsDistributed(uint256 indexed epoch, uint256 weeklyRewards, uint256 freedomPrize);
    event PassiveInterestCredited(address indexed user, uint256 amount);
    event PenaltyRedistributed(uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _feeRecipient,
        address _owner
    ) Ownable(_owner) {
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        currentEpoch = 1;
        epochStartTime = block.timestamp;

        // Initialize pool tiers (USDC has 6 decimals)
        pools[PoolTier.Koruma] = PoolConfig({
            minDeposit: 10 * 1e6,       // 10 USDC
            maxDeposit: 500 * 1e6,      // 500 USDC
            multiplier: KORUMA_MULT,
            totalDeposits: 0,
            userCount: 0
        });

        pools[PoolTier.Buyume] = PoolConfig({
            minDeposit: 500 * 1e6,      // 500 USDC
            maxDeposit: 5000 * 1e6,     // 5,000 USDC
            multiplier: BUYUME_MULT,
            totalDeposits: 0,
            userCount: 0
        });

        pools[PoolTier.Prestij] = PoolConfig({
            minDeposit: 5000 * 1e6,     // 5,000 USDC
            maxDeposit: 100000 * 1e6,   // 100,000 USDC
            multiplier: PRESTIJ_MULT,
            totalDeposits: 0,
            userCount: 0
        });
    }

    // ─── Configuration ───────────────────────────────────────────────
    function setYieldStrategy(address _strategy) external onlyOwner {
        yieldStrategy = IYieldStrategy(_strategy);
    }

    function setPrizeDistributor(address _distributor) external onlyOwner {
        prizeDistributor = IPrizeDistributor(_distributor);
    }

    function setFreedomToken(address _token) external onlyOwner {
        freedomToken = FreedomToken(_token);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "FreedomPool: zero address");
        feeRecipient = _recipient;
    }

    function setFdmRewardRate(uint256 _rate) external onlyOwner {
        fdmRewardRate = _rate;
    }

    // ─── User Actions ────────────────────────────────────────────────

    /**
     * @notice Deposit USDC into a pool tier
     * @param tier The pool tier to deposit into
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(PoolTier tier, uint256 amount) external nonReentrant whenNotPaused {
        PoolConfig storage poolConfig = pools[tier];
        require(amount >= poolConfig.minDeposit, "FreedomPool: below minimum");
        require(amount <= poolConfig.maxDeposit, "FreedomPool: above maximum");
        require(!positions[msg.sender].active, "FreedomPool: already has position");

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Create position
        positions[msg.sender] = UserPosition({
            tier: tier,
            amount: amount,
            depositTimestamp: block.timestamp,
            accumulatedRewards: 0,
            active: true
        });

        depositors.push(msg.sender);
        poolConfig.totalDeposits += amount;
        poolConfig.userCount++;
        totalDeposits += amount;

        // Deploy to yield strategy
        if (address(yieldStrategy) != address(0)) {
            usdc.safeIncreaseAllowance(address(yieldStrategy), amount);
            yieldStrategy.deposit(amount);
        }

        // Register with prize distributor
        if (address(prizeDistributor) != address(0)) {
            uint256 weight = (amount * poolConfig.multiplier) / BPS_DENOMINATOR;
            prizeDistributor.updateParticipant(msg.sender, weight);
        }

        emit Deposited(msg.sender, tier, amount);
    }

    /**
     * @notice Withdraw entire position
     * @dev Early withdrawal (before 1 epoch) incurs 5% penalty
     */
    function withdraw() external nonReentrant whenNotPaused {
        UserPosition storage pos = positions[msg.sender];
        require(pos.active, "FreedomPool: no active position");

        uint256 amount = pos.amount;
        uint256 penalty = 0;

        // Apply early exit penalty if within first epoch
        if (block.timestamp < pos.depositTimestamp + MIN_DEPOSIT_DURATION) {
            penalty = (amount * EARLY_EXIT_PENALTY_BPS) / BPS_DENOMINATOR;
        }

        uint256 netAmount = amount - penalty + pos.accumulatedRewards;

        // Withdraw from yield strategy
        if (address(yieldStrategy) != address(0)) {
            yieldStrategy.withdraw(amount, address(this));
        }

        // Update pool state
        PoolConfig storage poolConfig = pools[pos.tier];
        poolConfig.totalDeposits -= amount;
        poolConfig.userCount--;
        totalDeposits -= amount;

        // Remove from prize distributor
        if (address(prizeDistributor) != address(0)) {
            prizeDistributor.removeParticipant(msg.sender);
        }

        // Redistribute penalty to remaining participants
        if (penalty > 0) {
            totalPenaltiesCollected += penalty;
            _redistributePenalty(penalty);
            emit PenaltyRedistributed(penalty);
        }

        // Clear position
        pos.active = false;
        pos.amount = 0;
        pos.accumulatedRewards = 0;

        // Transfer to user
        usdc.safeTransfer(msg.sender, netAmount);

        emit Withdrawn(msg.sender, netAmount, penalty);
    }

    /**
     * @notice Claim accumulated passive interest without withdrawing principal
     */
    function claimRewards() external nonReentrant whenNotPaused {
        UserPosition storage pos = positions[msg.sender];
        require(pos.active, "FreedomPool: no active position");
        require(pos.accumulatedRewards > 0, "FreedomPool: no rewards");

        uint256 rewards = pos.accumulatedRewards;
        pos.accumulatedRewards = 0;

        usdc.safeTransfer(msg.sender, rewards);
    }

    // ─── Epoch Management (Chainlink Keepers compatible) ─────────────

    /**
     * @notice Check if epoch can be advanced (Chainlink Automation compatible)
     */
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = block.timestamp >= epochStartTime + EPOCH_DURATION;
        return (upkeepNeeded, "");
    }

    /**
     * @notice Advance to next epoch: harvest yield, distribute rewards, trigger draw
     * @dev Can be called by Chainlink Keepers or manually by owner
     */
    function performUpkeep(bytes calldata) external {
        require(
            block.timestamp >= epochStartTime + EPOCH_DURATION || msg.sender == owner(),
            "FreedomPool: epoch not ended"
        );

        _advanceEpoch();
    }

    /**
     * @notice Manual epoch advance (owner only, for testing/emergency)
     */
    function advanceEpoch() external onlyOwner {
        _advanceEpoch();
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _advanceEpoch() internal {
        // 1. Harvest yield from strategy
        uint256 yieldAmount = 0;
        if (address(yieldStrategy) != address(0)) {
            yieldAmount = yieldStrategy.harvest();
        }

        if (yieldAmount == 0) {
            // No yield to distribute, just advance epoch
            currentEpoch++;
            epochStartTime = block.timestamp;
            emit EpochAdvanced(currentEpoch, 0, 0);
            return;
        }

        // 2. Calculate fee split
        uint256 platformFee = (yieldAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netYield = yieldAmount - platformFee;
        uint256 freedomPrize = (netYield * FREEDOM_PRIZE_BPS) / BPS_DENOMINATOR;
        uint256 weeklyRewards = netYield - freedomPrize;

        // 3. Send platform fee
        if (platformFee > 0) {
            usdc.safeTransfer(feeRecipient, platformFee);
            totalFeesCollected += platformFee;
        }

        // 4. Distribute passive interest to all depositors (proportional)
        if (weeklyRewards > 0) {
            _distributePassiveInterest(weeklyRewards);
        }

        // 5. Fund prize distributor for the draw
        if (address(prizeDistributor) != address(0) && freedomPrize > 0) {
            // Split: some goes to weekly prize, rest accumulates in freedom pool
            uint256 weeklyPrize = (freedomPrize * 5000) / BPS_DENOMINATOR; // 50% of prize allocation
            uint256 jackpotAdd = freedomPrize - weeklyPrize;

            usdc.safeIncreaseAllowance(address(prizeDistributor), freedomPrize);
            prizeDistributor.fundEpoch(weeklyPrize, jackpotAdd);
            prizeDistributor.executeDraw(currentEpoch);
        }

        // 6. Mint FDM rewards to depositors
        if (address(freedomToken) != address(0)) {
            _mintFdmRewards();
        }

        // 7. Advance epoch
        currentEpoch++;
        epochStartTime = block.timestamp;
        totalYieldDistributed += netYield;

        emit EpochAdvanced(currentEpoch, yieldAmount, platformFee);
        emit RewardsDistributed(currentEpoch - 1, weeklyRewards, freedomPrize);
    }

    function _distributePassiveInterest(uint256 amount) internal {
        if (totalDeposits == 0) return;

        for (uint256 i = 0; i < depositors.length; i++) {
            UserPosition storage pos = positions[depositors[i]];
            if (!pos.active) continue;

            // Proportional share based on deposit amount
            uint256 share = (amount * pos.amount) / totalDeposits;
            pos.accumulatedRewards += share;

            emit PassiveInterestCredited(depositors[i], share);
        }
    }

    function _redistributePenalty(uint256 penalty) internal {
        if (totalDeposits == 0) return;

        for (uint256 i = 0; i < depositors.length; i++) {
            UserPosition storage pos = positions[depositors[i]];
            if (!pos.active) continue;

            uint256 share = (penalty * pos.amount) / totalDeposits;
            pos.accumulatedRewards += share;
        }
    }

    function _mintFdmRewards() internal {
        for (uint256 i = 0; i < depositors.length; i++) {
            UserPosition storage pos = positions[depositors[i]];
            if (!pos.active) continue;

            // Reward proportional to deposit and multiplier
            PoolConfig storage poolConfig = pools[pos.tier];
            uint256 reward = (pos.amount * fdmRewardRate * poolConfig.multiplier) / (BPS_DENOMINATOR * 1e6);
            
            if (reward > 0) {
                freedomToken.mint(depositors[i], reward);
            }
        }
    }

    // ─── View Functions ──────────────────────────────────────────────

    function getUserPosition(address user) external view returns (
        PoolTier tier,
        uint256 amount,
        uint256 depositTimestamp,
        uint256 accumulatedRewards,
        bool active
    ) {
        UserPosition storage pos = positions[user];
        return (pos.tier, pos.amount, pos.depositTimestamp, pos.accumulatedRewards, pos.active);
    }

    function getPoolInfo(PoolTier tier) external view returns (
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 multiplier,
        uint256 poolTotalDeposits,
        uint256 userCount
    ) {
        PoolConfig storage config = pools[tier];
        return (config.minDeposit, config.maxDeposit, config.multiplier, config.totalDeposits, config.userCount);
    }

    function getProtocolStats() external view returns (
        uint256 _totalDeposits,
        uint256 _currentEpoch,
        uint256 _totalFeesCollected,
        uint256 _totalYieldDistributed,
        uint256 _totalPenalties,
        uint256 _depositorCount
    ) {
        return (totalDeposits, currentEpoch, totalFeesCollected, totalYieldDistributed, totalPenaltiesCollected, depositors.length);
    }

    function getTimeUntilNextEpoch() external view returns (uint256) {
        uint256 nextEpoch = epochStartTime + EPOCH_DURATION;
        if (block.timestamp >= nextEpoch) return 0;
        return nextEpoch - block.timestamp;
    }

    // ─── Admin ───────────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Emergency: withdraw all funds from strategy back to this contract
    function emergencyWithdrawFromStrategy() external onlyOwner {
        if (address(yieldStrategy) != address(0)) {
            yieldStrategy.emergencyWithdraw();
        }
    }
}
