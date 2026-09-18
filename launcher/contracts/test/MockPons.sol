// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPonsV2Factory} from "../interfaces/IPonsV2Factory.sol";

contract MockPons {
    mapping(address => IPonsV2Factory.LaunchedToken) public rows;

    function setLaunched(address token, address deployer) external {
        IPonsV2Factory.LaunchedToken memory row;
        row.token = token;
        row.curve = address(this);
        row.deployer = deployer;
        row.exists = true;
        rows[token] = row;
    }

    function getLaunchedToken(address token) external view returns (IPonsV2Factory.LaunchedToken memory) {
        return rows[token];
    }

    function transferCreatorFeeRecipient(address, address) external {}
}
