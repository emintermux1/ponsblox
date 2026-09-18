// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcBondingPad
/// @notice Minimal bonding-curve token factory for Arc (no Pons).
/// Quote is the chain native asset (USDC on Arc per docs.arc.io).
contract ArcBondingPad {
    uint256 public constant PHANTOM = 10 ether;
    uint256 public constant SUPPLY = 1_000_000_000 ether;

    struct Curve {
        address creator;
        uint256 reserveQuote;
        uint256 reserveToken;
        uint8 curveId;
        bool exists;
    }

    string public constant namePrefix = "";
    mapping(address => Curve) public curves;
    mapping(address => mapping(address => uint256)) public balanceOf;
    mapping(address => uint256) public totalSupply;
    mapping(address => string) public tokenName;
    mapping(address => string) public tokenSymbol;
    address[] public launched;

    event TokenLaunched(address indexed token, address indexed creator, uint8 curveId);
    event Trade(address indexed token, address indexed trader, bool buy, uint256 quote, uint256 tokens);

    error BadName();
    error UnknownToken();
    error ZeroIn();
    error Slippage();

    function launch(string calldata name_, string calldata symbol_, uint8 curveId)
        external
        returns (address token)
    {
        if (bytes(name_).length == 0 || bytes(symbol_).length == 0) revert BadName();
        token = address(uint160(uint256(keccak256(abi.encodePacked(name_, symbol_, msg.sender, launched.length)))));
        require(!curves[token].exists, "taken");
        uint256 phantom = PHANTOM;
        if (curveId == 0) phantom = (PHANTOM * 12) / 10;
        if (curveId == 2) phantom = (PHANTOM * 8) / 10;
        curves[token] = Curve({
            creator: msg.sender,
            reserveQuote: phantom,
            reserveToken: SUPPLY,
            curveId: curveId,
            exists: true
        });
        tokenName[token] = name_;
        tokenSymbol[token] = symbol_;
        totalSupply[token] = SUPPLY;
        balanceOf[token][address(this)] = SUPPLY;
        launched.push(token);
        emit TokenLaunched(token, msg.sender, curveId);
    }

    function buy(address token, uint256 minTokens) external payable returns (uint256 tokensOut) {
        Curve storage c = curves[token];
        if (!c.exists) revert UnknownToken();
        if (msg.value == 0) revert ZeroIn();
        tokensOut = (msg.value * c.reserveToken) / (c.reserveQuote + msg.value);
        if (tokensOut < minTokens) revert Slippage();
        c.reserveQuote += msg.value;
        c.reserveToken -= tokensOut;
        balanceOf[token][address(this)] -= tokensOut;
        balanceOf[token][msg.sender] += tokensOut;
        emit Trade(token, msg.sender, true, msg.value, tokensOut);
    }

    function sell(address token, uint256 tokensIn, uint256 minQuote) external returns (uint256 quoteOut) {
        Curve storage c = curves[token];
        if (!c.exists) revert UnknownToken();
        if (tokensIn == 0) revert ZeroIn();
        quoteOut = (tokensIn * c.reserveQuote) / (c.reserveToken + tokensIn);
        if (quoteOut < minQuote) revert Slippage();
        uint256 bal = balanceOf[token][msg.sender];
        require(bal >= tokensIn, "bal");
        balanceOf[token][msg.sender] = bal - tokensIn;
        balanceOf[token][address(this)] += tokensIn;
        c.reserveToken += tokensIn;
        c.reserveQuote -= quoteOut;
        (bool ok,) = msg.sender.call{value: quoteOut}("");
        require(ok, "pay");
        emit Trade(token, msg.sender, false, quoteOut, tokensIn);
    }

    function launchedCount() external view returns (uint256) {
        return launched.length;
    }

    function creatorOf(address token) external view returns (address) {
        return curves[token].creator;
    }

    function exists(address token) external view returns (bool) {
        return curves[token].exists;
    }
}
