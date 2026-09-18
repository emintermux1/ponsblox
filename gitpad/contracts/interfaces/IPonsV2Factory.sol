// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Documented Pons V2 factory surface only. Do not add methods here
/// that are not on 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e.
interface IPonsV2Factory {
    struct Socials {
        string twitter;
        string telegram;
        string discord;
        string website;
        string farcaster;
    }

    struct TokenParams {
        string name;
        string symbol;
        string logo;
        string description;
        Socials socials;
        address creatorFeeRecipient;
        uint16 creatorTaxBps;
        bool buybackEnabled;
        bytes32 expectedEconomics;
        bytes32 salt;
    }

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

    function approvedPairTokens(address pairToken) external view returns (bool);
    function pairTokenEconomics(address pairToken)
        external
        view
        returns (uint256 phantomQuote, uint256 graduationThreshold, uint8 decimals);
    function launchFee() external view returns (uint256);
    function launchEnabled() external view returns (bool);
    function canLaunch(address account) external view returns (bool);
    function maxCreatorTaxBps() external view returns (uint256);
    function previewLaunchEconomics(uint256 launchConfigId, address pairToken) external view returns (bytes32);
    function launchToken(TokenParams calldata params, uint256 launchConfigId, address pairToken)
        external
        payable
        returns (address token, address curve);
    function getLaunchedToken(address token) external view returns (LaunchedToken memory);
    function pendingCreatorFeeRecipient(address token)
        external
        view
        returns (address recipient, uint256 effectiveAt, uint256 expiresAt);
    function transferCreatorFeeRecipient(address token, address newRecipient) external;
}
