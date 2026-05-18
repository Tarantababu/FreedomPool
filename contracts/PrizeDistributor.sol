// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "./interfaces/IPrizeDistributor.sol";

/**
 * @title PrizeDistributor
 * @notice Handles weekly prize draws using Chainlink VRF for provably fair randomness.
 *         Distributes weekly yield prizes and accumulates the Freedom Prize jackpot.
 */
contract PrizeDistributor is IPrizeDistributor, VRFConsumerBaseV2, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Chainlink VRF ───────────────────────────────────────────────
    VRFCoordinatorV2Interface public immutable vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit = 200000;
    uint16 public requestConfirmations = 3;

    // ─── State ───────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    address public pool; // FreedomPool contract

    uint256 public currentEpoch;
    uint256 public override freedomPrizePool;
    bool public drawPending;

    struct EpochData {
        uint256 weeklyPrize;
        uint256 freedomPrize;
        address winner;
        uint256 totalPrize;
        uint256 timestamp;
        bool drawn;
    }

    struct DrawRequest {
        uint256 epoch;
        bool fulfilled;
    }

    mapping(uint256 => EpochData) public epochs;
    mapping(uint256 => DrawRequest) public drawRequests; // requestId => DrawRequest

    // Participant tracking (set by pool)
    address[] public participants;
    mapping(address => uint256) public participantWeights; // address => weight (pool multiplier * amount)

    // ─── Events ──────────────────────────────────────────────────────
    event EpochFunded(uint256 indexed epoch, uint256 weeklyPrize, uint256 freedomPrize);
    event DrawRequested(uint256 indexed epoch, uint256 requestId);
    event DrawCompleted(uint256 indexed epoch, address indexed winner, uint256 totalPrize);
    event FreedomPrizeWon(uint256 indexed epoch, address indexed winner, uint256 amount);

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyPool() {
        require(msg.sender == pool, "PrizeDistributor: caller is not pool");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        address _owner
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(_owner) {
        usdc = IERC20(_usdc);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }

    // ─── Configuration ───────────────────────────────────────────────
    function setPool(address _pool) external onlyOwner {
        pool = _pool;
    }

    function setVRFConfig(
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyOwner {
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
    }

    // ─── Participant Management (called by Pool) ─────────────────────
    function updateParticipant(address user, uint256 weight) external onlyPool {
        if (participantWeights[user] == 0 && weight > 0) {
            participants.push(user);
        }
        participantWeights[user] = weight;
    }

    function removeParticipant(address user) external onlyPool {
        participantWeights[user] = 0;
        // Note: we don't remove from array to save gas; zero-weight entries are skipped in draw
    }

    // ─── Core Functions ──────────────────────────────────────────────

    /// @inheritdoc IPrizeDistributor
    function fundEpoch(uint256 weeklyPrize, uint256 freedomPrize) external override onlyPool {
        usdc.safeTransferFrom(msg.sender, address(this), weeklyPrize + freedomPrize);

        currentEpoch++;
        freedomPrizePool += freedomPrize;

        epochs[currentEpoch] = EpochData({
            weeklyPrize: weeklyPrize,
            freedomPrize: freedomPrizePool,
            winner: address(0),
            totalPrize: weeklyPrize + freedomPrizePool,
            timestamp: block.timestamp,
            drawn: false
        });

        emit EpochFunded(currentEpoch, weeklyPrize, freedomPrize);
    }

    /// @inheritdoc IPrizeDistributor
    function executeDraw(uint256 epoch) external override onlyPool {
        require(!drawPending, "PrizeDistributor: draw already pending");
        require(epochs[epoch].timestamp > 0, "PrizeDistributor: epoch not funded");
        require(!epochs[epoch].drawn, "PrizeDistributor: already drawn");
        require(_getActiveParticipantCount() > 0, "PrizeDistributor: no participants");

        drawPending = true;

        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1 // numWords
        );

        drawRequests[requestId] = DrawRequest({
            epoch: epoch,
            fulfilled: false
        });

        emit DrawRequested(epoch, requestId);
    }

    /// @notice Chainlink VRF callback
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        DrawRequest storage request = drawRequests[requestId];
        require(!request.fulfilled, "PrizeDistributor: already fulfilled");

        request.fulfilled = true;
        drawPending = false;

        uint256 epoch = request.epoch;
        address winner = _selectWinner(randomWords[0]);

        EpochData storage epochData = epochs[epoch];
        epochData.winner = winner;
        epochData.drawn = true;

        uint256 totalPrize = epochData.weeklyPrize + freedomPrizePool;
        epochData.totalPrize = totalPrize;

        // Reset freedom prize pool after it's won
        uint256 freedomWon = freedomPrizePool;
        freedomPrizePool = 0;

        // Transfer prize to winner
        if (totalPrize > 0 && winner != address(0)) {
            usdc.safeTransfer(winner, totalPrize);
        }

        emit DrawCompleted(epoch, winner, totalPrize);
        if (freedomWon > 0) {
            emit FreedomPrizeWon(epoch, winner, freedomWon);
        }
    }

    // ─── View Functions ──────────────────────────────────────────────

    /// @inheritdoc IPrizeDistributor
    function isDrawPending() external view override returns (bool) {
        return drawPending;
    }

    /// @inheritdoc IPrizeDistributor
    function getEpochWinner(uint256 epoch) external view override returns (address winner, uint256 amount) {
        EpochData storage data = epochs[epoch];
        return (data.winner, data.totalPrize);
    }

    function getParticipantCount() external view returns (uint256) {
        return _getActiveParticipantCount();
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _selectWinner(uint256 randomWord) internal view returns (address) {
        uint256 totalWeight = _getTotalWeight();
        if (totalWeight == 0) return address(0);

        uint256 target = randomWord % totalWeight;
        uint256 cumulative = 0;

        for (uint256 i = 0; i < participants.length; i++) {
            uint256 weight = participantWeights[participants[i]];
            if (weight == 0) continue;
            cumulative += weight;
            if (target < cumulative) {
                return participants[i];
            }
        }

        // Fallback (should not reach here)
        return participants[0];
    }

    function _getTotalWeight() internal view returns (uint256 total) {
        for (uint256 i = 0; i < participants.length; i++) {
            total += participantWeights[participants[i]];
        }
    }

    function _getActiveParticipantCount() internal view returns (uint256 count) {
        for (uint256 i = 0; i < participants.length; i++) {
            if (participantWeights[participants[i]] > 0) count++;
        }
    }
}
