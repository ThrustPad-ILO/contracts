// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interface/types.sol";
import "./interfaces/sailfish/IFactory.sol";
import {IVault} from "./interfaces/sailfish/IVault.sol";
import "./libs/Token.sol";
import {INonfungiblePositionManager} from "./INonfungiblePositionManager.sol";
// import {INonfungiblePositionManager} from "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

contract ThrustpadFairLaunch is Ownable, ReentrancyGuard {
    FairLaunchConfig public config;

    event TokenBought(
        address indexed buyer,
        address indexed token,
        uint256 amountInEdu
    );
    event TokenClaimed(
        address indexed buyer,
        address indexed token,
        uint256 amountInToken
    );
    event TeamClaimed(
        address indexed team,
        address indexed token,
        uint256 amountInToken
    );
    event Refund(
        address indexed buyer,
        address indexed token,
        uint256 amountInEdu
    );
    event LiquidityDeployed(
        uint256 indexed tokenId,
        uint256 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    event LPTokensClaimed(
        address indexed owner,
        address indexed pair,
        uint256 amountLPTokens
    );

    uint256 public totalSold;

    uint256 public totalContributors;

    bool public liquidityDeployed;

    bool public teamClaimed;

    address public LPTokenAddress;

    mapping(address => uint256) public purchaseHistory;
    mapping(address => uint256) public claimed; //Token claim or refund

    address public NFTManager = 0xa9cbeF0c9274f985340816eD2074aBf5aAC25463;
    address public WEDU = 0x135E304139c5113895C97Dce8B9eDa56D4b53CF9;
    address public V3Factory = 0xB5CAb4E42cb5f16D00c644CB7163F8B427D7a8bF;

    constructor(
        FairLaunchConfig memory _config,
        address _owner
    ) Ownable(_owner) {
        config = _config;
    }

    function buyToken() public payable {
        require(
            block.timestamp >= config.startDate,
            "ThrustpadFairLaunch: sale has not started yet"
        );
        require(
            block.timestamp <= config.endDate,
            "ThrustpadFairLaunch: sale has ended"
        );
        require(
            msg.value >= config.minimumBuy,
            "ThrustpadFairLaunch: amount is less than minimum buy"
        );
        require(
            msg.value <= config.maximumBuy,
            "ThrustpadFairLaunch: amount is more than maximum buy"
        );
        require(
            totalSold + msg.value <= config.hardCap,
            "ThrustpadFairLaunch: hard cap reached"
        );
        require(
            purchaseHistory[msg.sender] + msg.value <= config.maximumBuy,
            "ThrustpadFairLaunch: wallet has reached maximum buy"
        );

        totalSold += msg.value;
        totalContributors += 1;
        purchaseHistory[msg.sender] += msg.value;

        emit TokenBought(msg.sender, config.token, msg.value);
    }

    function claimTokens() public nonReentrant {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold >= config.softCap,
            "ThrustpadFairLaunch: soft cap not reached"
        );
        require(
            claimed[msg.sender] == 0,
            "ThrustpadFairLaunch: tokens already claimed"
        );

        uint256 pricePerToken = config.amountForSale / config.hardCap;
        uint256 purchase = purchaseHistory[msg.sender] * pricePerToken;

        claimed[msg.sender] = purchase;

        IERC20(config.token).transfer(msg.sender, purchase);

        emit TokenClaimed(msg.sender, config.token, purchase);
    }

    function claimRefund() public nonReentrant {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold < config.softCap,
            "ThrustpadFairLaunch: soft cap reached"
        );
        require(
            claimed[msg.sender] == 0,
            "ThrustpadFairLaunch: tokens already claimed"
        );

        uint256 refund = purchaseHistory[msg.sender];

        claimed[msg.sender] = refund;

        payable(msg.sender).transfer(refund);

        emit Refund(msg.sender, config.token, refund);
    }

    function withdrawTeamTokens() public onlyOwner {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold >= config.softCap,
            "ThrustpadFairLaunch: soft cap not reached"
        );
        require(
            !teamClaimed,
            "ThrustpadFairLaunch: team tokens already claimed"
        );

        uint256 teamTokens = (config.percentageForTeam * totalSold) / 100;

        teamClaimed = true;

        payable(owner()).transfer(teamTokens);

        emit TeamClaimed(owner(), config.token, teamTokens);
    }

    function sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert("IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0)) revert("ZERO_ADDRESS");
    }

    // Helper function to calculate square root
    function sqrt(uint256 x) public pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function encodePriceSqrt(
        uint256 reserve1,
        uint256 reserve0
    ) public pure returns (uint160) {
        require(reserve0 > 0 && reserve1 > 0, "INVALID_RESERVES");

        uint256 sqrtPriceX96 = sqrt((reserve1 << 192) / reserve0);
        require(sqrtPriceX96 <= type(uint160).max, "SQRT_PRICE_TOO_HIGH");

        return uint160(sqrtPriceX96);
    }

    function deployLiquidity() public onlyOwner {
        require(
            block.timestamp >= config.endDate,
            "ThrustpadFairLaunch: sale has not ended yet"
        );
        require(
            totalSold >= config.softCap,
            "ThrustpadFairLaunch: soft cap not reached"
        );

        //Check if pair already exists for full range 0.3% fee
        //Revert if it already exist and request for manual deployment
        //Else deploy liquidty full range 0.3% fee
        //@TODO: Lock LP NFT immediately after deployment for 1 month

        IUniswapV3Factory v3Factory = IUniswapV3Factory(V3Factory);
        INonfungiblePositionManager positionManager = INonfungiblePositionManager(
                NFTManager
            );

        address pair = v3Factory.getPool(config.token, WEDU, 3000);

        if (pair != address(0x0)) {
            revert("ThrustpadFairLaunch: Pair already exists");
        }

        (address token0, address token1) = sortTokens(config.token, WEDU);

        uint256 reserve1;
        uint256 reserve0;

        if (address(config.token) == token1) {
            reserve1 = config.listingRate;
            reserve0 = 1e18;
        }

        if (address(config.token) == token0) {
            reserve0 = config.listingRate;
            reserve1 = 1e18;
        }

        positionManager.createAndInitializePoolIfNecessary(
            token0,
            token1,
            3000,
            encodePriceSqrt(reserve1, reserve0)
        );

        IERC20(config.token).approve(NFTManager, type(uint256).max);

        uint256 eduAmount = (config.percentageForLiquidity * totalSold) / 100;
        uint256 tokenAmount = eduAmount * config.listingRate;

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) = INonfungiblePositionManager(
            NFTManager
        ).mint{value: eduAmount}(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: 3000,
                tickLower: -887220,
                tickUpper: 887220,
                amount0Desired: address(token0) == address(config.token)
                    ? tokenAmount
                    : eduAmount,
                amount1Desired: address(token1) == address(config.token)
                    ? tokenAmount
                    : eduAmount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: msg.sender, //Owner
                deadline: block.timestamp + 300
            })
        );

        //Burn remaining tokens
        uint256 remainingToken = IERC20(config.token).balanceOf(address(this));

        IERC20(config.token).transfer(address(0x0), remainingToken);

        emit LiquidityDeployed(tokenId, liquidity, amount0, amount1);
    }

    function emergencyTransfer(
        address _token,
        uint256 _amount
    ) public onlyOwner {
        require(block.timestamp >= config.endDate, "Sale has not ended yet");

        IERC20(_token).transfer(msg.sender, _amount);
    }

    function emergencyTransferEDU(uint256 _amount) public onlyOwner {
        require(block.timestamp >= config.endDate, "Sale has not ended yet");

        payable(msg.sender).transfer(_amount);
    }

    receive() external payable {}
}
