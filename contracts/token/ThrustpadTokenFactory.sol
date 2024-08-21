// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadToken.sol";
import "../interface/types.sol";

contract ThrustpadTokenFactory {
    mapping(address => address[]) public deployedTokens;

    event NewToken(address indexed creator, address indexed token);

    function newToken(
        string memory name,
        string memory symbol,
        uint256 decimals,
        uint256 supply,
        LaunchType memory launchType
    ) public returns (address) {
        address newLaunch = address(
            new ThrustpadToken{
                salt: bytes32(deployedTokens[msg.sender].length)
            }(name, symbol, decimals, supply, launchType)
        );
        deployedTokens[msg.sender].push(newLaunch);

        emit NewToken(msg.sender, newLaunch);

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
        string memory name,
        string memory symbol,
        uint256 decimals,
        uint256 supply,
        LaunchType memory launchType
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadToken).creationCode;

        return
            abi.encodePacked(
                bytecode,
                abi.encode(name, symbol, decimals, supply, launchType)
            );
    }

    function getdeployedTokensLen(
        address creator
    ) public view returns (uint256) {
        return deployedTokens[creator].length;
    }

    function getdeployedTokens(
        address creator
    ) public view returns (address[] memory) {
        return deployedTokens[creator];
    }
}
