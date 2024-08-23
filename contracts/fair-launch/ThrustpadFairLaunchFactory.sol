// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ThrustpadFairLaunch.sol";
import "../interface/types.sol";

contract ThrustpadFairLaunchFactory {
    mapping(address => address[]) public deployedLaunches;

    event NewFairLaunch(address indexed creator, address indexed launch);

    function newFairLaunch(
        FairLaunchConfig memory config
    ) public returns (address) {
        require(
            ERC20(config.token).decimals() == 18,
            "ThrustpadFairLaunchFactory: token must have 18 decimals"
        );
        address newLaunch = address(
            new ThrustpadFairLaunch{
                salt: bytes32(deployedLaunches[msg.sender].length)
            }(config)
        );
        deployedLaunches[msg.sender].push(newLaunch);

        /**
         * Here's the Math:
         * if hardCap is 100 EDU and amountForSale is 10,000 Tokens
         * presale rate is 100 Tokens per EDU token.
         *
         * If listing rate is 90 Tokens per EDU token,
         * assuming percentageForLiquidity 60% of hardCap and hardCap of 100 EDU is reached
         * totalAmount of token required = amountForSale + (percentageForLiquidity * hardCap * listingRate)
         *
         * totalAmount  = 10,000 + (0.6 * 100 * 90) = 15,400
         *                      OR
         * totalAmount = 10,000 + (60 * 100 * 90)/100 = 15,400
         *
         * 10,000 will be claimed by purchasers and 5,400 will be locked in liquidity pool
         *
         * 60 EDU for 5400 Tokens.
         *
         * 1 EDU for 90 Tokens
         */
        uint256 totalAmount = config.amountForSale +
            (config.percentageForLiquidity *
                config.hardCap *
                config.listingRate) /
            100;

        IERC20(config.token).transferFrom(
            msg.sender,
            address(newLaunch),
            totalAmount
        );

        emit NewFairLaunch(msg.sender, newLaunch);

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
        FairLaunchConfig memory config
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadFairLaunch).creationCode;

        return abi.encodePacked(bytecode, abi.encode(config));
    }

    function getdeployedLaunchesLen(
        address creator
    ) public view returns (uint256) {
        return deployedLaunches[creator].length;
    }

    function getdeployedLaunches(
        address creator
    ) public view returns (address[] memory) {
        return deployedLaunches[creator];
    }
}
