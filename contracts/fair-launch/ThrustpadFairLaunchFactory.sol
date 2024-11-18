// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ThrustpadFairLaunch.sol";
import "../interface/types.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ThrustpadFairLaunchFactory is Ownable {
    mapping(address => address[]) public deployedLaunches;

    event NewFairLaunch(address indexed creator, address indexed launch);

    uint256[] public creationFees = [1 ether];

    uint256 public feeEarned;

    constructor() Ownable(msg.sender) {}

    function newFairLaunch(
        FairLaunchConfig memory config
    ) public payable returns (address) {
        //Basic plan fee must be paid
        require(
            msg.value >= creationFees[0],
            "ThrustpadFairLaunchFactory: Insufficient fee"
        );

        require(
            ERC20(config.token).decimals() == 18,
            "ThrustpadFairLaunchFactory: token must have 18 decimals"
        );

        require(
            config.percentageForLiquidity >= 60,
            "ThrustpadFairLaunchFactory: percentage for Liquidity cannot be less than 60"
        );
        require(
            config.percentageForTeam <= 40,
            "ThrustpadFairLaunchFactory: percentage for Team cannot be less than 40"
        );
        require(
            config.percentageForLiquidity + config.percentageForTeam == 100,
            "ThrustpadFairLaunchFactory: percentage for Liquidity + percentage for Team must be equal to 100"
        );

        uint256 totalAmount;

        unchecked {
            require(
                config.softCap >= config.hardCap / 4,
                "ThrustpadFairLaunchFactory: softCap must be greater than or equal to 25% of hardCap"
            );
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
            totalAmount =
                config.amountForSale +
                (config.percentageForLiquidity *
                    config.hardCap *
                    config.listingRate) /
                (100 * 1 ether);
        }

        //No need to check for allowance  given to factory is equal to totalAmount or
        //if user have enought balance of tokens equal to totalAmount
        //It will revert upon transferFrom if enough allowance is not given
        address newLaunch = address(
            new ThrustpadFairLaunch{
                salt: bytes32(deployedLaunches[msg.sender].length)
            }(config, msg.sender)
        );
        deployedLaunches[msg.sender].push(newLaunch);

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
        FairLaunchConfig memory config,
        address _owner
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadFairLaunch).creationCode;

        return abi.encodePacked(bytecode, abi.encode(config, _owner));
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

    function setCreationFees(uint256[] memory _fees) external onlyOwner {
        creationFees = _fees;
    }

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawToken(address token) external onlyOwner {
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }
}
