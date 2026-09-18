// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GitPadRepositoryRegistry
/// @notice Canonical map from a GitHub repository id to one Pons token.
contract GitPadRepositoryRegistry {
    struct Record {
        bytes32 repoId;
        string owner;
        string name;
        address token;
        address deployer;
        string metadataURI;
        uint64 registeredAt;
        uint64 githubId;
        bool exists;
    }

    address public owner;
    address public registrar;

    mapping(bytes32 => Record) public byRepo;
    mapping(address => bytes32) public repoOfToken;
    mapping(uint64 => bytes32) public repoIdByGithub;
    bytes32[] public repoIds;

    event Registered(bytes32 indexed repoId, address indexed token, address indexed deployer, string owner, string name);
    event MetadataUpdated(bytes32 indexed repoId, string metadataURI);
    event RegistrarSet(address indexed registrar);

    error NotOwner();
    error NotRegistrar();
    error RepoTaken(bytes32 repoId, address token);
    error TokenTaken(address token);
    error GithubIdTaken(uint64 githubId, address token);
    error EmptyRepo();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRegistrar() {
        if (msg.sender != registrar && msg.sender != owner) revert NotRegistrar();
        _;
    }

    constructor(address owner_) {
        owner = owner_;
        registrar = owner_;
    }

    function setRegistrar(address next) external onlyOwner {
        registrar = next;
        emit RegistrarSet(next);
    }

    function idOf(string calldata ownerName, string calldata repoName) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_lower(ownerName), "/", _lower(repoName)));
    }

    function register(
        string calldata ownerName,
        string calldata repoName,
        address token,
        address deployer,
        string calldata metadataURI,
        uint64 githubId
    ) external onlyRegistrar returns (bytes32 repoId) {
        if (bytes(ownerName).length == 0 || bytes(repoName).length == 0) revert EmptyRepo();
        repoId = idOf(ownerName, repoName);
        Record storage cur = byRepo[repoId];
        if (cur.exists && cur.token != token) revert RepoTaken(repoId, cur.token);
        bytes32 existing = repoOfToken[token];
        if (existing != bytes32(0) && existing != repoId) revert TokenTaken(token);
        if (githubId != 0) {
            bytes32 byGh = repoIdByGithub[githubId];
            if (byGh != bytes32(0) && byGh != repoId) revert GithubIdTaken(githubId, byRepo[byGh].token);
        }
        if (!cur.exists) {
            repoIds.push(repoId);
            cur.repoId = repoId;
            cur.owner = ownerName;
            cur.name = repoName;
            cur.token = token;
            cur.deployer = deployer;
            cur.registeredAt = uint64(block.timestamp);
            cur.exists = true;
            repoOfToken[token] = repoId;
        }
        if (githubId != 0) {
            cur.githubId = githubId;
            repoIdByGithub[githubId] = repoId;
        }
        cur.metadataURI = metadataURI;
        emit Registered(repoId, token, deployer, ownerName, repoName);
        emit MetadataUpdated(repoId, metadataURI);
    }

    function get(bytes32 repoId) external view returns (Record memory) {
        return byRepo[repoId];
    }

    function count() external view returns (uint256) {
        return repoIds.length;
    }

    function _lower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 65 && c <= 90) b[i] = bytes1(c + 32);
        }
        return string(b);
    }
}
