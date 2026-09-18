// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LauncherRegistry
/// @notice Storage for pads created by LauncherPadFactory. Slug is unique.
contract LauncherRegistry {
    struct Pad {
        address owner;
        uint64 chainId;
        uint16 ownerFeeBps;
        uint16 creatorFeeBps;
        uint128 launchFeeWei;
        uint8 curveId;
        string slug;
        string name;
        string brandURI;
        bool exists;
    }

    address public owner;
    address public factory;

    mapping(bytes32 => Pad) public pads;
    mapping(bytes32 => address[]) private _tokens;
    bytes32[] public slugHashes;

    error NotOwner();
    error NotFactory();
    error ZeroAddress();

    event FactorySet(address indexed factory);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
    }

    function setFactory(address factory_) external onlyOwner {
        if (factory_ == address(0)) revert ZeroAddress();
        factory = factory_;
        emit FactorySet(factory_);
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function writePad(
        bytes32 slugHash,
        Pad memory pad,
        bool isNew
    ) external onlyFactory {
        pads[slugHash] = pad;
        if (isNew) slugHashes.push(slugHash);
    }

    function addToken(bytes32 slugHash, address token) external onlyFactory {
        _tokens[slugHash].push(token);
    }

    function tokensOf(bytes32 slugHash) external view returns (address[] memory) {
        return _tokens[slugHash];
    }

    function tokenCount(bytes32 slugHash) external view returns (uint256) {
        return _tokens[slugHash].length;
    }

    function padCount() external view returns (uint256) {
        return slugHashes.length;
    }
}
