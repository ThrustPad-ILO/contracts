// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadMultiSender.sol";
import "../interface/types.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ThrustpadMultiSenderFactory is Ownable {
    mapping(address => address[]) public deployedMultisenders;

    event NewMultiSender(address indexed creator, address indexed multisender);

    constructor() Ownable(msg.sender) {}

    uint256 public creationFee = 1 ether;

    uint256 public feeEarned;

    uint256 public maxReceivers = 100;

    function newMultisender(
        address token,
        address[] memory receivers,
        uint256[] memory amounts
    ) public payable returns (address) {
        require(
            amounts.length == receivers.length,
            "ThrustpadTokenFactory: Invalid input"
        );
        require(
            amounts.length <= maxReceivers,
            "ThrustpadTokenFactory: Too many receivers per contract"
        );

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        if (token == address(0)) {
            require(
                msg.value >= creationFee + totalAmount,
                "ThrustpadTokenFactory: Insufficient value: fee + total amount"
            );
        } else {
            uint256 allowance = IERC20(token).allowance(
                msg.sender,
                address(this)
            );

            require(
                allowance >= totalAmount,
                "ThrustpadTokenFactory: Insufficient allowance"
            );
        }

        address newMultiSender = address(
            new ThrustpadMultiSender{
                value: token == address(0) ? totalAmount : 0,
                salt: bytes32(deployedMultisenders[msg.sender].length)
            }(token, receivers, amounts)
        );
        deployedMultisenders[msg.sender].push(newMultiSender);

        if (token != address(0)) {
            IERC20(token).transferFrom(
                msg.sender,
                address(newMultiSender),
                totalAmount
            );
        }

        ThrustpadMultiSender(payable(newMultiSender)).multisend();

        emit NewMultiSender(msg.sender, newMultiSender);

        feeEarned += msg.value;

        return address(newMultiSender);
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
        address[] memory receivers,
        uint256[] memory amounts
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadMultiSender).creationCode;

        return
            abi.encodePacked(bytecode, abi.encode(token, receivers, amounts));
    }

    function getdeployedMultisendersLen(
        address creator
    ) public view returns (uint256) {
        return deployedMultisenders[creator].length;
    }

    function getdeployedMultisenders(
        address creator
    ) public view returns (address[] memory) {
        return deployedMultisenders[creator];
    }

    receive() external payable {}

    function updateMaxReceivers(uint256 _maxReceivers) external onlyOwner {
        maxReceivers = _maxReceivers;
    }

    function updateCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawToken(address token) external onlyOwner {
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }
}
