// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/types.sol";

contract ThrustpadToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    LaunchType public launchType;

    constructor(
        string memory name,
        string memory symbol,
        uint256 decimals,
        uint256 supply,
        LaunchType memory _launchType
    ) ERC20(name, symbol) Ownable(tx.origin) {
        _mint(tx.origin, supply * 10 ** decimals);
        launchType = _launchType;
    }

    function pause() public onlyOwner {
        require(launchType.pausable == true, "pausing is disabled");
        _pause();
    }

    function unpause() public onlyOwner {
        require(launchType.pausable == true, "pausing is disabled");
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(launchType.mintable == true, "minting is disabled");
        _mint(to, amount);
    }

    function burn(uint256 amount) public override {
        require(launchType.burnable == true, "burning is disabled");
        _burn(_msgSender(), amount);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
