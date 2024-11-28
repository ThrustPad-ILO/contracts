// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadToken.sol";
import "../interface/types.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ThrustpadTokenFactory is Ownable {
    mapping(address => address[]) public deployedTokens;

    event NewToken(address indexed creator, address indexed token);

    constructor() Ownable(msg.sender) {}

    uint256 public creationFee = 1 ether;

    uint256 public feeEarned;

    function newToken(
        string memory name,
        string memory symbol,
        uint256 decimals,
        uint256 supply,
        LaunchType memory launchType
    ) public payable returns (address) {
        require(
            msg.value >= creationFee,
            "ThrustpadTokenFactory: Insufficient fee"
        );

        address newLaunch = address(
            new ThrustpadToken{
                salt: bytes32(deployedTokens[msg.sender].length)
            }(name, symbol, decimals, supply, launchType, msg.sender)
        );
        deployedTokens[msg.sender].push(newLaunch);

        emit NewToken(msg.sender, newLaunch);

        feeEarned += msg.value;

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
        LaunchType memory launchType,
        address _owner
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadToken).creationCode;

        return
            abi.encodePacked(
                bytecode,
                abi.encode(name, symbol, decimals, supply, launchType, _owner)
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
