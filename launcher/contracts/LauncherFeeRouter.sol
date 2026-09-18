// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LauncherFeeRouter
/// @notice Receives pad owner fees. Internally reviewed, not independently audited.
/// On Robinhood, Pons creator tax only arrives here after the current recipient
/// calls transferCreatorFeeRecipient on the official Pons factory.
contract LauncherFeeRouter {
    address public owner;
    bool public paused;

    mapping(bytes32 => address) public padRecipient;
    mapping(address => uint256) public pulled;

    event RecipientSet(bytes32 indexed slugHash, address indexed to);
    event Pulled(address indexed to, uint256 amount);
    event Paused(bool on);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error PausedRouter();
    error ZeroAddress();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
    }

    receive() external payable {}

    function setRecipient(bytes32 slugHash, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        padRecipient[slugHash] = to;
        emit RecipientSet(slugHash, to);
    }

    function setPaused(bool on) external onlyOwner {
        paused = on;
        emit Paused(on);
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function pull(address to, uint256 amount) external onlyOwner {
        if (paused) revert PausedRouter();
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        pulled[to] += amount;
        emit Pulled(to, amount);
    }
}
