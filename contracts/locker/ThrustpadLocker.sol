// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ThrustpadLocker is Ownable {
    IERC20 public immutable token;

    address public immutable beneficiary;

    uint256 public immutable lockTime;

    uint256 public immutable startTime;

    event TokenLockStart(
        address indexed beneficiary,
        address indexed token,
        uint256 startTime,
        uint256 lockTime
    );

    event Release(
        address indexed beneficiary,
        address indexed token,
        uint256 releaseTime,
        uint256 amount
    );

    constructor(address token_, uint256 lockTime_) Ownable(tx.origin) {
        require(lockTime_ > 0, "TokenLock: lock time should greater than 0");
        token = IERC20(token_);
        beneficiary = tx.origin;
        lockTime = lockTime_;
        startTime = block.timestamp;

        emit TokenLockStart(
            tx.origin,
            address(token_),
            block.timestamp,
            lockTime_
        );
    }

    function release() public onlyOwner {
        require(
            block.timestamp >= startTime + lockTime,
            "TokenLock: current time is before release time"
        );

        uint256 amount = token.balanceOf(address(this));
        require(amount > 0, "TokenLock: no tokens to release");

        token.transfer(beneficiary, amount);

        emit Release(msg.sender, address(token), block.timestamp, amount);
    }
}
