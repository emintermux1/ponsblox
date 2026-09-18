// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GitPadFeeRouter} from "../GitPadFeeRouter.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockAdapter {
    mapping(address => address) public deployers;

    function setDeployer(address token, address deployer) external {
        deployers[token] = deployer;
    }

    function deployerOf(address token) external view returns (address) {
        address d = deployers[token];
        require(d != address(0), "unknown");
        return d;
    }
}

contract GitPadFeeRouterTest is Test {
    GitPadFeeRouter internal router;
    MockERC20 internal asset;
    MockAdapter internal adapter;
    address internal token = address(0x1111);
    address internal deployer = address(0xA11CE);
    address internal stranger = address(0xBEEF);
    address internal holders = address(0xB0B);
    address internal treasury = address(0xDA0);
    address internal creator = address(0xC0);
    address internal gitpad = address(0x61);

    function setUp() public {
        adapter = new MockAdapter();
        adapter.setDeployer(token, deployer);
        router = new GitPadFeeRouter(address(this), address(adapter));
        asset = new MockERC20();
    }

    function _full() internal view returns (GitPadFeeRouter.Recipient[] memory recips) {
        recips = new GitPadFeeRouter.Recipient[](4);
        recips[0] = GitPadFeeRouter.Recipient(holders, 6000, keccak256("HOLDERS"));
        recips[1] = GitPadFeeRouter.Recipient(treasury, 2500, keccak256("TREASURY"));
        recips[2] = GitPadFeeRouter.Recipient(creator, 1000, keccak256("CREATOR"));
        recips[3] = GitPadFeeRouter.Recipient(gitpad, 500, keccak256("GITPAD"));
    }

    function test_setRoute_requires10000() public {
        GitPadFeeRouter.Recipient[] memory recips = new GitPadFeeRouter.Recipient[](1);
        recips[0] = GitPadFeeRouter.Recipient(creator, 9999, keccak256("CREATOR"));
        vm.expectRevert(GitPadFeeRouter.BadSplit.selector);
        router.setRoute(token, recips);
    }

    function test_setRoute_rejectsZero() public {
        GitPadFeeRouter.Recipient[] memory recips = new GitPadFeeRouter.Recipient[](1);
        recips[0] = GitPadFeeRouter.Recipient(address(0), 10000, keccak256("CREATOR"));
        vm.expectRevert(GitPadFeeRouter.BadSplit.selector);
        router.setRoute(token, recips);
    }

    function test_setRoute_rejectsDuplicate() public {
        GitPadFeeRouter.Recipient[] memory recips = new GitPadFeeRouter.Recipient[](2);
        recips[0] = GitPadFeeRouter.Recipient(creator, 5000, keccak256("CREATOR"));
        recips[1] = GitPadFeeRouter.Recipient(creator, 5000, keccak256("TREASURY"));
        vm.expectRevert(GitPadFeeRouter.BadSplit.selector);
        router.setRoute(token, recips);
    }

    function test_setRoute_rejectsStranger() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(GitPadFeeRouter.NotAuthorized.selector, token));
        router.setRoute(token, _full());
    }

    function test_sweep_splitsExactAndLeavesNoDust() public {
        router.setRoute(token, _full());
        asset.mint(address(router), 10_000);
        router.sweep(token, address(asset));
        assertEq(asset.balanceOf(holders), 6000);
        assertEq(asset.balanceOf(treasury), 2500);
        assertEq(asset.balanceOf(creator), 1000);
        assertEq(asset.balanceOf(gitpad), 500);
        assertEq(asset.balanceOf(address(router)), 0);
        assertEq(router.distributed(token), 10_000);
    }

    function test_noArbitraryWithdraw() public {
        asset.mint(address(router), 100);
        vm.expectRevert(GitPadFeeRouter.BadSplit.selector);
        router.sweep(token, address(asset));
        assertEq(asset.balanceOf(address(this)), 0);
    }
}
