// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPonsV2Factory} from "./interfaces/IPonsV2Factory.sol";

/// @title PonsV2Adapter
/// @notice Isolates every Pons V2 factory call. Application contracts must
/// talk to this adapter, not the factory address, so a factory upgrade is a
/// one-line constructor change.
contract PonsV2Adapter {
    IPonsV2Factory public immutable pons;

    error NotAPonsLaunch(address token);

    constructor(address ponsFactory) {
        pons = IPonsV2Factory(ponsFactory);
    }

    function launched(address token) public view returns (IPonsV2Factory.LaunchedToken memory row) {
        row = pons.getLaunchedToken(token);
    }

    function requireLaunched(address token) public view returns (IPonsV2Factory.LaunchedToken memory row) {
        row = launched(token);
        if (!row.exists) revert NotAPonsLaunch(token);
    }

    function deployerOf(address token) external view returns (address) {
        return requireLaunched(token).deployer;
    }

    function feeRecipientOf(address token) external view returns (address) {
        return requireLaunched(token).creatorFeeRecipient;
    }

    function launchEnabled() external view returns (bool) {
        return pons.launchEnabled();
    }

    function canLaunch(address account) external view returns (bool) {
        return pons.canLaunch(account);
    }

    function launchFee() external view returns (uint256) {
        return pons.launchFee();
    }
}
