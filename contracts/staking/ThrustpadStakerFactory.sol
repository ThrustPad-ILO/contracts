// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadStaker.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "../interface/types.sol";

/**
 * Must deposit token APY of hardcap to cover yields payout
 * Must deposit EDU APY of hardcap to cover yields payout
 * amount must be greater or equal deposit token APY
 */
contract ThrustpadStakerFactory {
    mapping(address => address[]) public deployedStakers;

    event NewStaking(
        address indexed creator,
        address indexed token,
        address indexed staker
    );

    function newStaker(
        stakeOption memory option
    ) public payable returns (address) {
        require(option.apyEdu >= 2, "APY EDU must be greater than 2");
        require(option.apyToken >= 8, "APY Token must be greater than 8");

        uint256 tokenNeeded = (option.hardCap * option.apyToken) / 100;
        uint256 eduNeeded = ((option.hardCap * option.apyEdu) / 100) /
            option.tokenToEDURate;

        require(
            msg.value >= eduNeeded,
            "EDU deposit to cover yields payout not enough"
        );
        require(
            tokenNeeded >= option.rewardPoolToken,
            "Deposit tokens to cover yields payout not enough"
        );

        address newStaking = address(
            new ThrustpadStaker{
                value: msg.value,
                salt: bytes32(deployedStakers[msg.sender].length)
            }(option)
        );
        deployedStakers[msg.sender].push(newStaking);

        IERC20(option.token).transferFrom(
            msg.sender,
            address(newStaking),
            option.rewardPoolToken
        );

        emit NewStaking(msg.sender, address(newStaking), newStaking);

        return address(newStaking);
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
        stakeOption memory option
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadStaker).creationCode;

        return abi.encodePacked(bytecode, abi.encode(option));
    }

    function getdeployedStakersLen(
        address creator
    ) public view returns (uint256) {
        return deployedStakers[creator].length;
    }

    function getdeployedStakers(
        address creator
    ) public view returns (address[] memory) {
        return deployedStakers[creator];
    }
}
