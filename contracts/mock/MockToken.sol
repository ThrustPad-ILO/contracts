pragma solidity ^0.8.24;

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("ERC20", "MOCK") {
        _mint(msg.sender, 10_000_000 * 10 ** 18);
    }
}
