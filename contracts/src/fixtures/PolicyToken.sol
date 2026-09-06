// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mintable fixture for non-forked local-chain tests only.
contract PolicyToken is ERC20 {
    constructor() ERC20("Policy Fixture Token", "PFT") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}
