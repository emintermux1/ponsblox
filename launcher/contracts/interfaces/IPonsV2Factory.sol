// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Documented Pons V2 factory surface only.
/// Source: https://docs.ponsfamily.com/v2
/// Live: 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e on Robinhood 4663.
interface IPonsV2Factory {
    struct LaunchedToken {
        address token;
        address curve;
        address deployer;
        address creatorFeeRecipient;
        address pairToken;
        uint256 graduationThreshold;
        uint24 poolFee;
        int24 tickSpacing;
        uint16 creatorTaxBps;
        bool buybackEnabled;
        uint8 phase;
        uint256 sweptQuote;
        uint256 sweptTokens;
        uint256 sweptAt;
        bool exists;
    }

    function getLaunchedToken(address token) external view returns (LaunchedToken memory);
    function transferCreatorFeeRecipient(address token, address newRecipient) external;
}
