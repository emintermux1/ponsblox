// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LauncherRegistry} from "./LauncherRegistry.sol";
import {IPonsV2Factory} from "./interfaces/IPonsV2Factory.sol";
import {ArcBondingPad} from "./ArcBondingPad.sol";

/// @title LauncherPadFactory
/// @notice One transaction creates a pad. Robinhood tokens still launch on
/// Pons V2 from the user wallet (canLaunch is per-wallet). Then linkToken.
contract LauncherPadFactory {
    uint16 public constant MAX_FEE_BPS = 1_000;
    uint8 public constant CURVE_STEEP = 2;

    LauncherRegistry public immutable registry;
    IPonsV2Factory public immutable pons;
    ArcBondingPad public immutable bonding;
    address public owner;

    mapping(string => bool) private _reserved;

    event PadCreated(
        bytes32 indexed slugHash,
        address indexed owner,
        uint64 chainId,
        string slug,
        string name
    );
    event TokenLinked(bytes32 indexed slugHash, address indexed token, address indexed linker);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error BadSlug();
    error SlugTaken();
    error BadFee();
    error BadCurve();
    error UnknownPad();
    error NotAuthorized();
    error TokenUnknown();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, address registry_, address pons_, address bonding_) {
        if (owner_ == address(0) || registry_ == address(0)) revert ZeroAddress();
        owner = owner_;
        registry = LauncherRegistry(registry_);
        pons = IPonsV2Factory(pons_);
        bonding = ArcBondingPad(bonding_);
        _reserved["www"] = true;
        _reserved["app"] = true;
        _reserved["api"] = true;
        _reserved["studio"] = true;
        _reserved["docs"] = true;
        _reserved["launcher"] = true;
        _reserved["preview"] = true;
        _reserved["staging"] = true;
        _reserved["p"] = true;
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function createPad(
        string calldata slug,
        string calldata name,
        string calldata brandURI,
        uint64 chainId,
        uint16 ownerFeeBps,
        uint16 creatorFeeBps,
        uint128 launchFeeWei,
        uint8 curveId
    ) external returns (bytes32 slugHash) {
        if (!_validSlug(slug) || _reserved[slug]) revert BadSlug();
        if (ownerFeeBps > MAX_FEE_BPS || creatorFeeBps > MAX_FEE_BPS) revert BadFee();
        if (curveId > CURVE_STEEP) revert BadCurve();
        slugHash = keccak256(bytes(slug));
        LauncherRegistry.Pad memory existing = _pad(slugHash);
        if (existing.exists) revert SlugTaken();
        LauncherRegistry.Pad memory pad = LauncherRegistry.Pad({
            owner: msg.sender,
            chainId: chainId,
            ownerFeeBps: ownerFeeBps,
            creatorFeeBps: creatorFeeBps,
            launchFeeWei: launchFeeWei,
            curveId: curveId,
            slug: slug,
            name: name,
            brandURI: brandURI,
            exists: true
        });
        registry.writePad(slugHash, pad, true);
        emit PadCreated(slugHash, msg.sender, chainId, slug, name);
    }

    function linkToken(string calldata slug, address token) external {
        bytes32 slugHash = keccak256(bytes(slug));
        LauncherRegistry.Pad memory pad = _pad(slugHash);
        if (!pad.exists) revert UnknownPad();
        _assertCanLink(pad, token);
        registry.addToken(slugHash, token);
        emit TokenLinked(slugHash, token, msg.sender);
    }

    function _assertCanLink(LauncherRegistry.Pad memory pad, address token) internal view {
        if (address(pons) != address(0)) {
            IPonsV2Factory.LaunchedToken memory row = pons.getLaunchedToken(token);
            if (!row.exists) revert TokenUnknown();
            if (msg.sender != row.deployer && msg.sender != pad.owner) revert NotAuthorized();
            return;
        }
        if (address(bonding) != address(0)) {
            if (!bonding.exists(token)) revert TokenUnknown();
            address creator = bonding.creatorOf(token);
            if (msg.sender != creator && msg.sender != pad.owner) revert NotAuthorized();
            return;
        }
        if (msg.sender != pad.owner) revert NotAuthorized();
    }

    function _pad(bytes32 slugHash) internal view returns (LauncherRegistry.Pad memory) {
        (
            address padOwner,
            uint64 chainId,
            uint16 ownerFeeBps,
            uint16 creatorFeeBps,
            uint128 launchFeeWei,
            uint8 curveId,
            string memory slug,
            string memory name,
            string memory brandURI,
            bool exists
        ) = registry.pads(slugHash);
        return LauncherRegistry.Pad({
            owner: padOwner,
            chainId: chainId,
            ownerFeeBps: ownerFeeBps,
            creatorFeeBps: creatorFeeBps,
            launchFeeWei: launchFeeWei,
            curveId: curveId,
            slug: slug,
            name: name,
            brandURI: brandURI,
            exists: exists
        });
    }

    function _validSlug(string calldata slug) internal pure returns (bool) {
        bytes memory b = bytes(slug);
        uint256 n = b.length;
        if (n < 3 || n > 32) return false;
        if (b[0] == 0x2d || b[n - 1] == 0x2d) return false;
        for (uint256 i = 0; i < n; i++) {
            bytes1 c = b[i];
            bool num = c >= 0x30 && c <= 0x39;
            bool low = c >= 0x61 && c <= 0x7a;
            bool dash = c == 0x2d;
            if (!num && !low && !dash) return false;
        }
        return true;
    }
}
