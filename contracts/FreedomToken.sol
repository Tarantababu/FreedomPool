// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FreedomToken (FDM)
 * @notice Governance and reward token for the FreedomPool protocol.
 *         Minted as rewards for depositors and used for governance voting.
 */
contract FreedomToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18; // 100M tokens
    
    mapping(address => bool) public minters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "FDM: not a minter");
        _;
    }

    constructor(address initialOwner) ERC20("FreedomPool Token", "FDM") Ownable(initialOwner) {
        // Mint 10% to treasury for initial liquidity and team
        _mint(initialOwner, 10_000_000 * 1e18);
    }

    /// @notice Add a minter (e.g., the FreedomPool contract)
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /// @notice Remove a minter
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /// @notice Mint reward tokens to a user
    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "FDM: max supply exceeded");
        _mint(to, amount);
    }
}
