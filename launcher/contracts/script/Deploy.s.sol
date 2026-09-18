// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LauncherRegistry} from "../LauncherRegistry.sol";
import {LauncherPadFactory} from "../LauncherPadFactory.sol";
import {LauncherFeeRouter} from "../LauncherFeeRouter.sol";
import {ArcBondingPad} from "../ArcBondingPad.sol";

/// @notice Prints addresses. Do not paste invented CAs into the UI.
/// Robinhood: PONS_FACTORY=0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e WITH_BONDING=false
/// Arc testnet: PONS_FACTORY=0x0000000000000000000000000000000000000000 WITH_BONDING=true
contract Deploy is Script {
    function run() external {
        address admin = msg.sender;
        address pons = vm.envOr("PONS_FACTORY", address(0));
        bool withBonding = vm.envOr("WITH_BONDING", false);

        vm.startBroadcast();
        LauncherRegistry registry = new LauncherRegistry(admin);
        address bonding = address(0);
        if (withBonding) {
            bonding = address(new ArcBondingPad());
        }
        LauncherPadFactory factory = new LauncherPadFactory(admin, address(registry), pons, bonding);
        registry.setFactory(address(factory));
        LauncherFeeRouter router = new LauncherFeeRouter(admin);
        vm.stopBroadcast();

        console.log("LAUNCHER_REGISTRY", address(registry));
        console.log("LAUNCHER_FACTORY", address(factory));
        console.log("LAUNCHER_FEE_ROUTER", address(router));
        console.log("ARC_BONDING_PAD", bonding);
    }
}
