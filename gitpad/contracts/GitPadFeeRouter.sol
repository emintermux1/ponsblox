// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PonsV2Adapter} from "./PonsV2Adapter.sol";

/// @title GitPadFeeRouter
/// @notice Splits incoming creator-tax tokens (ETH quote on GitPad) by bps.
/// Internally reviewed. Not an independent audit.
/// The router only receives Pons creator tax when it is the launch-time
/// recipient or after the current recipient calls
/// `transferCreatorFeeRecipient` on the official factory.
contract GitPadFeeRouter {
    struct Recipient {
        address to;
        uint16 bps;
        bytes32 role;
    }

    uint16 public constant BPS = 10_000;
    bytes32 public constant ROLE_CREATOR = keccak256("CREATOR");
    bytes32 public constant ROLE_HOLDERS = keccak256("HOLDERS");
    bytes32 public constant ROLE_TREASURY = keccak256("TREASURY");
    bytes32 public constant ROLE_GITPAD = keccak256("GITPAD");
    bytes32 public constant ROLE_OTHER = keccak256("OTHER");

    address public owner;
    bool public paused;
    bool private locked;
    PonsV2Adapter public adapter;
    mapping(address => Recipient[]) public routes;
    mapping(address => uint256) public distributed;

    event RouteSet(address indexed token, uint256 recipients);
    event Distributed(address indexed token, address indexed asset, address indexed to, uint256 amount, bytes32 role);
    event Paused(bool on);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotAuthorized(address token);
    error BadSplit();
    error PausedRouter();
    error TransferFailed();
    error Reentrant();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert Reentrant();
        locked = true;
        _;
        locked = false;
    }

    constructor(address owner_, address adapter_) {
        if (owner_ == address(0) || adapter_ == address(0)) revert ZeroAddress();
        owner = owner_;
        adapter = PonsV2Adapter(adapter_);
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function setPaused(bool on) external onlyOwner {
        paused = on;
        emit Paused(on);
    }

    function setRoute(address token, Recipient[] calldata recips) external {
        if (paused) revert PausedRouter();
        _auth(token);
        if (recips.length == 0) revert BadSplit();
        uint256 sum;
        delete routes[token];
        for (uint256 i; i < recips.length; i++) {
            if (recips[i].to == address(0) || recips[i].bps == 0) revert BadSplit();
            for (uint256 j; j < i; j++) {
                if (recips[j].to == recips[i].to) revert BadSplit();
            }
            sum += recips[i].bps;
            routes[token].push(recips[i]);
        }
        if (sum != BPS) revert BadSplit();
        emit RouteSet(token, recips.length);
    }

    function routeOf(address token) external view returns (Recipient[] memory) {
        return routes[token];
    }

    /// @notice Sweep an ERC-20 balance using the token's split.
    /// Anyone may trigger a sweep. There is no hidden recipient and no
    /// leftover withdrawal path — dust stays in the last share.
    function sweep(address token, address asset) external nonReentrant {
        if (paused) revert PausedRouter();
        if (asset == address(0)) revert ZeroAddress();
        Recipient[] storage recips = routes[token];
        if (recips.length == 0) revert BadSplit();
        uint256 bal = _balanceOf(asset, address(this));
        if (bal == 0) return;

        uint256 sent;
        uint256 n = recips.length;
        for (uint256 i; i < n; i++) {
            uint256 amt = i + 1 == n ? bal - sent : (bal * recips[i].bps) / BPS;
            sent += amt;
            if (amt == 0) continue;
            address to = recips[i].to;
            bytes32 role = recips[i].role;
            distributed[token] += amt;
            _safeTransfer(asset, to, amt);
            emit Distributed(token, asset, to, amt, role);
        }
    }

    function _auth(address token) internal view {
        if (msg.sender == owner) return;
        address deployer = adapter.deployerOf(token);
        if (msg.sender != deployer) revert NotAuthorized(token);
    }

    function _balanceOf(address asset, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) = asset.staticcall(abi.encodeWithSignature("balanceOf(address)", account));
        if (!ok || data.length < 32) revert TransferFailed();
        return abi.decode(data, (uint256));
    }

    function _safeTransfer(address asset, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = asset.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        if (!ok) revert TransferFailed();
        if (data.length != 0 && !abi.decode(data, (bool))) revert TransferFailed();
    }
}
