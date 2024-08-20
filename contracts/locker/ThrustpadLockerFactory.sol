// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadLocker.sol";

contract ThrustpadTokenFactory {
    mapping(address => address[]) public deployedLocks;

    event NewLock(address indexed creator, address indexed token);

    function newToken(
        address token,
        uint256 lockTime
    ) public returns (address) {
        address newLaunch = address(
            new ThrustpadLocker{
                salt: bytes32(deployedLocks[msg.sender].length)
            }(token, lockTime)
        );
        deployedLocks[msg.sender].push(newLaunch);

        emit NewLock(msg.sender, newLaunch);

        return address(newLaunch);
    }

    function getAddressCreate2(
        bytes memory bytecode,
        uint256 salt
    ) public view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint(hash)));
    }

    function getBytecode(
        address token,
        uint256 lockTime
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadLocker).creationCode;

        return abi.encodePacked(bytecode, abi.encode(token, lockTime));
    }

    function getdeployedLocksLen(
        address creator
    ) public view returns (uint256) {
        return deployedLocks[creator].length;
    }

    function getdeployedLocks(
        address creator
    ) public view returns (address[] memory) {
        return deployedLocks[creator];
    }
}
