// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ThrustpadStaker.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/types.sol";

/**
 * Must deposit token APY of hardcap to cover yields payout
 * Must deposit EDU APY of hardcap to cover yields payout
 * amount must be greater or equal deposit token APY
 */
contract ThrustpadStakerFactory is Ownable {
    mapping(address => address[]) public deployedStakers;

    event NewStaking(
        address indexed creator,
        address indexed token,
        address indexed staker
    );

    constructor() Ownable(msg.sender) {}

    uint256 public creationFee = 0.001 ether;

    uint256 public feeEarned;

    function newStaker(
        stakeOption memory option
    ) public payable returns (address) {
        require(option.apyEdu >= 2, "APY EDU must be greater than 2");
        require(option.apyToken >= 8, "APY Token must be greater than 8");
        require(
            ERC20(option.token).decimals() == 18,
            "ThrustpadStakerFactory: token must have 18 decimals"
        );

        uint256 tokenNeeded = (option.hardCap * option.apyToken) / 100;
        uint256 eduNeeded = ((option.hardCap * option.apyEdu) / 100) /
            option.tokenToEDURate;

        require(
            msg.value >= eduNeeded + creationFee,
            "EDU deposit to cover yields payout and Fees not enough"
        );
        require(
            tokenNeeded >= option.rewardPoolToken,
            "Deposit tokens to cover yields payout not enough"
        );

        address newStaking = address(
            new ThrustpadStaker{
                value: msg.value,
                salt: bytes32(deployedStakers[msg.sender].length)
            }(option, msg.sender)
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
        stakeOption memory option,
        address _owner
    ) public pure returns (bytes memory) {
        bytes memory bytecode = type(ThrustpadStaker).creationCode;

        return abi.encodePacked(bytecode, abi.encode(option, _owner));
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
