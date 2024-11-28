// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadLocker.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ThrustpadLockerFactory is Ownable {
    mapping(address => address[]) public deployedLocks;

    event NewLock(
        address indexed creator,
        address indexed token,
        uint256 amount
    );

    uint256 public creationFee = 1 ether;

    uint256 public feeEarned;

    constructor() Ownable(msg.sender) {}

    function newLock(
        IERC20 token,
        uint256 lockTime,
        uint256 amount
    ) public payable returns (address) {
        require(
            msg.value >= creationFee,
            "ThrustpadLockerFactory: Insufficient fee"
        );

        address newLocker = address(
            new ThrustpadLocker{
                salt: bytes32(deployedLocks[msg.sender].length)
            }(token, lockTime, amount, msg.sender)
        );
        deployedLocks[msg.sender].push(newLocker);

        token.transferFrom(msg.sender, newLocker, amount);

        emit NewLock(msg.sender, newLocker, amount);

        feeEarned += msg.value;

        return address(newLocker);
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
        uint256 lockTime,
        uint256 amount,
        address _owner
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadLocker).creationCode;

        return
            abi.encodePacked(
                bytecode,
                abi.encode(token, lockTime, amount, _owner)
            );
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

    receive() external payable {}

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
