//// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./ThrustpadInstantAirdrop.sol";

contract ThrustpadInstantAirdropFactory {
    mapping(address => address[]) public deployedAirdrops;

    event AirdropCreated(address indexed airdrop, address indexed token);

    function newInstantAirdrop(
        address _token,
        bytes32 _merkleRoot,
        uint256 totalAmount
    ) external returns (address) {
        require(
            totalAmount > 0,
            "ThrustpadInstantAirdropFactory: Invalid amount"
        );

        address newAirdrop = address(
            new ThrustpadInstantAirdrop{
                salt: bytes32(deployedAirdrops[msg.sender].length)
            }(_token, _merkleRoot)
        );

        IERC20(_token).transferFrom(
            msg.sender,
            address(newAirdrop),
            totalAmount
        );

        emit AirdropCreated(newAirdrop, _token);

        deployedAirdrops[msg.sender].push(newAirdrop);

        return newAirdrop;
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
        address _token,
        bytes32 _merkleRoot
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadInstantAirdrop).creationCode;

        return abi.encodePacked(bytecode, abi.encode(_token, _merkleRoot));
    }

    function getdeployedAirdropsLen(
        address creator
    ) public view returns (uint256) {
        return deployedAirdrops[creator].length;
    }

    function getdeployedAirdrops(
        address creator
    ) public view returns (address[] memory) {
        return deployedAirdrops[creator];
    }
}
