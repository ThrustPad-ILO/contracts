// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ThrustpadLocker is Ownable {
    IERC20 public immutable token;

    address public immutable beneficiary;

    uint256 public immutable lockTime;

    uint256 public immutable startTime;

    uint256 public immutable lockAmount;

    bool public released = false;

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

    constructor(
        IERC20 _token,
        uint256 _lockTime,
        uint256 _amount
    ) Ownable(tx.origin) {
        require(_lockTime > 0, "TokenLock: lock time should greater than 0");
        token = _token;
        beneficiary = tx.origin;
        lockTime = _lockTime;
        startTime = block.timestamp;
        lockAmount = _amount;

        emit TokenLockStart(
            tx.origin,
            address(_token),
            block.timestamp,
            _lockTime
        );
    }

    function release() public onlyOwner {
        require(
            block.timestamp >= startTime + lockTime,
            "TokenLock: lock time not expired"
        );

        uint256 amount = token.balanceOf(address(this));
        require(amount > 0, "TokenLock: no tokens to release");

        token.transfer(beneficiary, amount);
        released = true;

        emit Release(msg.sender, address(token), block.timestamp, amount);
    }
}
