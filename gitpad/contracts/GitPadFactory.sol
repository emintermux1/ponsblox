// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PonsV2Adapter} from "./PonsV2Adapter.sol";
import {GitPadRepositoryRegistry} from "./GitPadRepositoryRegistry.sol";
import {GitPadMetadataRegistry} from "./GitPadMetadataRegistry.sol";
import {IPonsV2Factory} from "./interfaces/IPonsV2Factory.sol";

/// @title GitPadFactory
/// @notice Application factory. Users still call Pons V2 `launchToken`
/// themselves (`canLaunch` is per-wallet). After the Pons receipt, they
/// register the GitHub pairing here.
contract GitPadFactory {
    PonsV2Adapter public immutable adapter;
    GitPadRepositoryRegistry public immutable registry;
    GitPadMetadataRegistry public immutable metadata;
    address public owner;

    event Linked(
        address indexed token,
        address indexed deployer,
        string ownerName,
        string repoName,
        string metadataURI
    );

    error NotOwner();
    error NotDeployer(address token, address caller);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, address adapter_, address registry_, address metadata_) {
        owner = owner_;
        adapter = PonsV2Adapter(adapter_);
        registry = GitPadRepositoryRegistry(registry_);
        metadata = GitPadMetadataRegistry(metadata_);
    }

    function linkRepository(
        address token,
        string calldata ownerName,
        string calldata repoName,
        string calldata metadataURI,
        uint64 githubId
    ) external {
        IPonsV2Factory.LaunchedToken memory row = adapter.requireLaunched(token);
        if (msg.sender != row.deployer && msg.sender != owner) {
            revert NotDeployer(token, msg.sender);
        }
        registry.register(ownerName, repoName, token, row.deployer, metadataURI, githubId);
        if (bytes(metadataURI).length > 0) {
            metadata.setURI(token, metadataURI);
        }
        emit Linked(token, row.deployer, ownerName, repoName, metadataURI);
    }
}
