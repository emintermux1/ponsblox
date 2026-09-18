// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GitPadMetadataRegistry
/// @notice Immutable-after-set IPFS metadata URI per token. Admin may freeze.
contract GitPadMetadataRegistry {
    address public owner;
    address public writer;

    mapping(address => string) public uriOf;
    mapping(address => bool) public frozen;

    event Written(address indexed token, string uri);
    event Frozen(address indexed token);

    error NotOwner();
    error NotWriter();
    error FrozenToken(address token);
    error EmptyURI();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyWriter() {
        if (msg.sender != writer && msg.sender != owner) revert NotWriter();
        _;
    }

    constructor(address owner_) {
        owner = owner_;
        writer = owner_;
    }

    function setWriter(address next) external onlyOwner {
        writer = next;
    }

    function setURI(address token, string calldata uri) external onlyWriter {
        if (frozen[token]) revert FrozenToken(token);
        if (bytes(uri).length == 0) revert EmptyURI();
        uriOf[token] = uri;
        emit Written(token, uri);
    }

    function freeze(address token) external onlyOwner {
        frozen[token] = true;
        emit Frozen(token);
    }
}
