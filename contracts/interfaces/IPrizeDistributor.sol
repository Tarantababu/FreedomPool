// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPrizeDistributor {
    /// @notice Fund the prize pool for the current epoch
    /// @param weeklyPrize Amount for weekly distribution
    /// @param freedomPrize Amount for the freedom (jackpot) prize
    function fundEpoch(uint256 weeklyPrize, uint256 freedomPrize) external;

    /// @notice Request randomness and execute the draw
    /// @param epoch The epoch number to draw for
    function executeDraw(uint256 epoch) external;

    /// @notice Check if a draw is pending (waiting for VRF callback)
    function isDrawPending() external view returns (bool);

    /// @notice Get the winner of a specific epoch
    /// @param epoch The epoch number
    /// @return winner Address of the winner
    /// @return amount Prize amount won
    function getEpochWinner(uint256 epoch) external view returns (address winner, uint256 amount);

    /// @notice Get the current accumulated freedom prize
    function freedomPrizePool() external view returns (uint256);
}
