// The following functions are overrides required by Solidity.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/types.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ThrustpadMultiSender is Ownable {
    address public token;
    address[] public receivers;
    uint256[] public amounts;

    constructor(
        address _token,
        address[] memory _receivers,
        uint256[] memory _amounts
    ) payable Ownable(msg.sender) {
        token = _token;
        receivers = _receivers;
        amounts = _amounts;
    }

    function multisend() external onlyOwner {
        if (token == address(0)) {
            for (uint256 i = 0; i < receivers.length; i++) {
                if (receivers[i] == address(0)) continue;
                payable(receivers[i]).transfer(amounts[i]);
            }
        } else {
            for (uint256 i = 0; i < receivers.length; i++) {
                if (receivers[i] == address(0)) continue;
                IERC20(token).transfer(receivers[i], amounts[i]);
            }
        }
    }

    receive() external payable {}
}
