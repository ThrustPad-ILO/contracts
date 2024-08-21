// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadStaker.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/**
 * Must deposit token APY of hardcap to cover yields payout
 * Must deposit EDU APY of hardcap to cover yields payout
 * amount must be greater or equal deposit token APY
 */
contract ThrustpadStakeFactory {
    mapping(address => address[]) public deployedStakers;

    event NewStaker(
        address indexed creator,
        address indexed token,
        address indexed staker,
        uint256 amount
    );

    function newStaker(
        IERC20 token,
        uint256 startdate,
        uint256 enddate,
        uint256 hardcap,
        uint256 minimum,
        uint256 apyEdu,
        uint256 apyToken,
        uint256 deposit,
        uint256 rate
    ) public payable returns (address) {
        require(apyEdu > 2, "APY EDU must be greater than 2");
        require(apyToken > 8, "APY Token must be greater than 8");

        uint256 tokenNeeded = (hardcap * apyToken) / 100;
        uint256 eduNeeded = ((hardcap * apyEdu) / 100) / rate;

        require(
            msg.value >= eduNeeded,
            "EDU deposit to cover yields payout not enough"
        );
        require(
            tokenNeeded >= deposit,
            "Deposit tokens to cover yields payout not enough"
        );

        address newStaking = address(
            new ThrustpadStaker{
                salt: bytes32(deployedStakers[msg.sender].length)
            }(
                token,
                startdate,
                enddate,
                hardcap,
                minimum,
                apyEdu,
                apyToken,
                deposit,
                rate,
            )
        );
        deployedStakers[msg.sender].push(newStaking);

        token.transferFrom(msg.sender, newStaking, amount);

        emit NewLock(msg.sender, token, newStaking, amount);

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
        address token,
        uint256 lockTime,
        uint256 amount
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadLocker).creationCode;

        return
            abi.encodePacked(
                bytecode,
                abi.encode(
                    token,
                    startdate,
                    enddate,
                    hardcap,
                    minimum,
                    apyEdu,
                    apyToken,
                    deposit,
                    rate,
            );
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
