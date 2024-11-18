//// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ThrustpadInstantAirdrop is Ownable, ReentrancyGuard {
    IERC20 public token;
    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;

    event Claimed(address indexed account, uint256 amount);

    uint256 public totalClaimed;

    constructor(
        address _token,
        bytes32 _merkleRoot,
        address _owner
    ) Ownable(_owner) {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
    }

    function claim(
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant {
        require(
            !claimed[msg.sender],
            "ThrustpadInstantAirdrop: Account already claimed"
        );

        _verifyProof(proof, amount, msg.sender);

        claimed[msg.sender] = true;
        totalClaimed += amount;

        token.transfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    function _verifyProof(
        bytes32[] memory proof,
        uint256 amount,
        address addr
    ) private view {
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(addr, amount)))
        );
        require(
            MerkleProof.verify(proof, merkleRoot, leaf),
            "ThrustpadInstantAirdrop: Invalid proof"
        );
    }
}
