// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LauncherRegistry} from "../LauncherRegistry.sol";
import {LauncherPadFactory} from "../LauncherPadFactory.sol";
import {LauncherFeeRouter} from "../LauncherFeeRouter.sol";
import {ArcBondingPad} from "../ArcBondingPad.sol";
import {MockPons} from "./MockPons.sol";

contract LauncherPadFactoryTest is Test {
    LauncherRegistry registry;
    LauncherPadFactory factory;
    LauncherFeeRouter router;
    ArcBondingPad bonding;
    MockPons pons;
    address admin = address(0xA11CE);
    address alice = address(0xA11);
    address bob = address(0xB0B);

    function setUp() public {
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        registry = new LauncherRegistry(admin);
        pons = new MockPons();
        bonding = new ArcBondingPad();
        vm.prank(admin);
        factory = new LauncherPadFactory(admin, address(registry), address(pons), address(bonding));
        vm.prank(admin);
        registry.setFactory(address(factory));
        router = new LauncherFeeRouter(admin);
    }

    function testCreatePad() public {
        vm.prank(alice);
        bytes32 h = factory.createPad("steelpad", "Steel Pad", "", 4663, 100, 50, 0, 1);
        (address owner,,,, , , string memory slug, string memory name,, bool exists) = registry.pads(h);
        assertTrue(exists);
        assertEq(owner, alice);
        assertEq(slug, "steelpad");
        assertEq(name, "Steel Pad");
    }

    function testSlugCollision() public {
        vm.prank(alice);
        factory.createPad("steelpad", "Steel", "", 4663, 0, 0, 0, 1);
        vm.prank(bob);
        vm.expectRevert(LauncherPadFactory.SlugTaken.selector);
        factory.createPad("steelpad", "Other", "", 4663, 0, 0, 0, 1);
    }

    function testReservedSlug() public {
        vm.prank(alice);
        vm.expectRevert(LauncherPadFactory.BadSlug.selector);
        factory.createPad("www", "Nope", "", 4663, 0, 0, 0, 1);
    }

    function testFeeBounds() public {
        vm.prank(alice);
        vm.expectRevert(LauncherPadFactory.BadFee.selector);
        factory.createPad("toofee", "Too", "", 4663, 1001, 0, 0, 1);
    }

    function testOnlyOwnerOrDeployerLinks() public {
        vm.prank(alice);
        factory.createPad("steelpad", "Steel", "", 4663, 0, 0, 0, 1);
        address token = address(0x1000);
        pons.setLaunched(token, bob);
        vm.prank(alice);
        factory.linkToken("steelpad", token);
        assertEq(registry.tokenCount(keccak256("steelpad")), 1);
    }

    function testStrangerCannotLink() public {
        vm.prank(alice);
        factory.createPad("steelpad", "Steel", "", 4663, 0, 0, 0, 1);
        address token = address(0x1001);
        pons.setLaunched(token, bob);
        vm.prank(address(0xBAD));
        vm.expectRevert(LauncherPadFactory.NotAuthorized.selector);
        factory.linkToken("steelpad", token);
    }

    function testUnknownPonsToken() public {
        vm.prank(alice);
        factory.createPad("steelpad", "Steel", "", 4663, 0, 0, 0, 1);
        vm.prank(alice);
        vm.expectRevert(LauncherPadFactory.TokenUnknown.selector);
        factory.linkToken("steelpad", address(0xDEAD));
    }

    function testArcLaunchAndBuy() public {
        vm.prank(alice);
        address token = bonding.launch("Arc Coin", "ARCX", 1);
        assertTrue(bonding.exists(token));
        vm.prank(bob);
        uint256 out = bonding.buy{value: 1 ether}(token, 0);
        assertGt(out, 0);
        assertEq(bonding.balanceOf(token, bob), out);
    }

    function testRouterPull() public {
        vm.deal(address(router), 1 ether);
        vm.prank(admin);
        router.pull(alice, 0.4 ether);
        assertEq(alice.balance, 100.4 ether);
    }

    function testOnlyOwnerSetsFactory() public {
        vm.prank(alice);
        vm.expectRevert(LauncherRegistry.NotOwner.selector);
        registry.setFactory(alice);
    }

    function testBadCurve() public {
        vm.prank(alice);
        vm.expectRevert(LauncherPadFactory.BadCurve.selector);
        factory.createPad("curved", "Curve", "", 4663, 0, 0, 0, 3);
    }

    function testUppercaseSlug() public {
        vm.prank(alice);
        vm.expectRevert(LauncherPadFactory.BadSlug.selector);
        factory.createPad("Steel", "Steel", "", 4663, 0, 0, 0, 1);
    }

    function testRouterOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(LauncherFeeRouter.NotOwner.selector);
        router.pull(alice, 1);
    }

    function testRouterPaused() public {
        vm.prank(admin);
        router.setPaused(true);
        vm.prank(admin);
        vm.expectRevert(LauncherFeeRouter.PausedRouter.selector);
        router.pull(alice, 1 ether);
    }

    function testArcLinkByCreator() public {
        LauncherRegistry reg2 = new LauncherRegistry(admin);
        vm.prank(admin);
        LauncherPadFactory fac2 = new LauncherPadFactory(admin, address(reg2), address(0), address(bonding));
        vm.prank(admin);
        reg2.setFactory(address(fac2));
        vm.prank(alice);
        fac2.createPad("arcpad", "Arc Pad", "", 5042002, 0, 0, 0, 1);
        vm.prank(bob);
        address token = bonding.launch("Arc Coin", "ARCX", 1);
        vm.prank(bob);
        fac2.linkToken("arcpad", token);
        assertEq(reg2.tokenCount(keccak256("arcpad")), 1);
    }

    function testArcSell() public {
        vm.prank(alice);
        address token = bonding.launch("Arc Coin", "ARCX", 1);
        vm.prank(bob);
        uint256 out = bonding.buy{value: 1 ether}(token, 0);
        vm.prank(bob);
        uint256 back = bonding.sell(token, out / 2, 0);
        assertGt(back, 0);
    }
}
