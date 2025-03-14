// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../libs/Token.sol";

interface IFactory {
    event PoolCreated(address indexed pool, Token t1, Token t2);

    function deploy(Token quoteToken, Token baseToken) external returns (address);
    function getPools(uint256 begin, uint256 maxLength) external view returns (address[] memory pools);
    function isPool(address) external view returns (bool);
    function poolList(uint256) external view returns (address);
    function pools(Token, Token) external view returns (address);
    function poolsLength() external view returns (uint256);
}
