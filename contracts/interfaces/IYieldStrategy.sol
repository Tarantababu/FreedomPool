// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYieldStrategy {
    /// @notice Deposit USDC into yield-generating protocols
    /// @param amount Amount of USDC to deposit (6 decimals)
    function deposit(uint256 amount) external;

    /// @notice Withdraw USDC from yield-generating protocols
    /// @param amount Amount of USDC to withdraw
    /// @param recipient Address to receive the withdrawn USDC
    function withdraw(uint256 amount, address recipient) external;

    /// @notice Harvest all accrued yield and return it to the caller
    /// @return yieldAmount The amount of yield harvested
    function harvest() external returns (uint256 yieldAmount);

    /// @notice Get the total value deposited across all strategies
    /// @return Total USDC value (6 decimals)
    function totalDeposited() external view returns (uint256);

    /// @notice Get the current unrealized yield
    /// @return Pending yield in USDC (6 decimals)
    function pendingYield() external view returns (uint256);

    /// @notice Emergency withdraw all funds (admin only)
    function emergencyWithdraw() external;
}
