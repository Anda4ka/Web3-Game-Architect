// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FrostToken ($FROST)
 * @notice ERC-20 token for Frost Rush with fixed supply.
 *         Total supply is minted once to the treasury during deployment.
 *         NO further minting is possible. Deflationary via burn function.
 */
contract FrostToken is ERC20, Ownable {
    
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;

    /**
     * @notice Constructor mints the entire supply to the deployer (Treasury).
     */
    constructor() ERC20("Frost Token", "FROST") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /**
     * @notice Allows users to burn their tokens, reducing total supply.
     * @param amount Amount of tokens to burn.
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
