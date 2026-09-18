const { expect } = require('chai')
const { ethers } = require('hardhat')

async function expectRevert(promise, name) {
  try {
    await promise
  } catch (e) {
    const msg = `${e.shortMessage || ''} ${e.message || ''} ${e.data || ''}`.toLowerCase()
    const selector = ethers.id(`${name}()`).slice(2, 10).toLowerCase()
    if (msg.includes(name.toLowerCase()) || msg.includes(selector)) return
    throw e
  }
  throw new Error(`expected revert ${name}`)
}

describe('LAUNCHER contracts', () => {
  async function deployRh() {
    const [admin, alice, bob, stranger] = await ethers.getSigners()
    const Registry = await ethers.getContractFactory('LauncherRegistry')
    const registry = await Registry.deploy(admin.address)
    const MockPons = await ethers.getContractFactory('MockPons')
    const pons = await MockPons.deploy()
    const Bonding = await ethers.getContractFactory('ArcBondingPad')
    const bonding = await Bonding.deploy()
    const Factory = await ethers.getContractFactory('LauncherPadFactory')
    const factory = await Factory.connect(admin).deploy(
      admin.address,
      await registry.getAddress(),
      await pons.getAddress(),
      await bonding.getAddress(),
    )
    await registry.connect(admin).setFactory(await factory.getAddress())
    const Router = await ethers.getContractFactory('LauncherFeeRouter')
    const router = await Router.deploy(admin.address)
    return { admin, alice, bob, stranger, registry, pons, bonding, factory, router }
  }

  it('creates a pad', async () => {
    const { alice, factory, registry } = await deployRh()
    await factory.connect(alice).createPad('steelpad', 'Steel Pad', '', 4663, 100, 50, 0, 1)
    const hash = ethers.keccak256(ethers.toUtf8Bytes('steelpad'))
    const pad = await registry.pads(hash)
    expect(pad.exists).to.equal(true)
    expect(pad.owner).to.equal(alice.address)
    expect(pad.slug).to.equal('steelpad')
    expect(pad.name).to.equal('Steel Pad')
  })

  it('rejects slug collision', async () => {
    const { alice, bob, factory } = await deployRh()
    await factory.connect(alice).createPad('steelpad', 'Steel', '', 4663, 0, 0, 0, 1)
    await expectRevert(factory.connect(bob).createPad('steelpad', 'Other', '', 4663, 0, 0, 0, 1), 'SlugTaken')
  })

  it('rejects reserved slug', async () => {
    const { alice, factory } = await deployRh()
    await expectRevert(factory.connect(alice).createPad('www', 'Nope', '', 4663, 0, 0, 0, 1), 'BadSlug')
  })

  it('rejects fee above 1000 bps', async () => {
    const { alice, factory } = await deployRh()
    await expectRevert(factory.connect(alice).createPad('toofee', 'Too', '', 4663, 1001, 0, 0, 1), 'BadFee')
  })

  it('lets the pad owner link a Pons token', async () => {
    const { alice, bob, factory, registry, pons } = await deployRh()
    await factory.connect(alice).createPad('steelpad', 'Steel', '', 4663, 0, 0, 0, 1)
    const token = '0x0000000000000000000000000000000000001000'
    await pons.setLaunched(token, bob.address)
    await factory.connect(alice).linkToken('steelpad', token)
    expect(await registry.tokenCount(ethers.keccak256(ethers.toUtf8Bytes('steelpad')))).to.equal(1n)
  })

  it('blocks a stranger from linking', async () => {
    const { alice, bob, stranger, factory, pons } = await deployRh()
    await factory.connect(alice).createPad('steelpad', 'Steel', '', 4663, 0, 0, 0, 1)
    const token = '0x0000000000000000000000000000000000001001'
    await pons.setLaunched(token, bob.address)
    await expectRevert(factory.connect(stranger).linkToken('steelpad', token), 'NotAuthorized')
  })

  it('rejects an unknown Pons token', async () => {
    const { alice, factory } = await deployRh()
    await factory.connect(alice).createPad('steelpad', 'Steel', '', 4663, 0, 0, 0, 1)
    await expectRevert(
      factory.connect(alice).linkToken('steelpad', '0x000000000000000000000000000000000000dead'),
      'TokenUnknown',
    )
  })

  it('launches and buys on ArcBondingPad', async () => {
    const { alice, bob, bonding } = await deployRh()
    const tx = await bonding.connect(alice).launch('Arc Coin', 'ARCX', 1)
    const rec = await tx.wait()
    const ev = rec.logs.find((l) => l.fragment && l.fragment.name === 'TokenLaunched')
    const token = ev.args.token
    expect(await bonding.exists(token)).to.equal(true)
    await bonding.connect(bob).buy(token, 0, { value: ethers.parseEther('1') })
    expect((await bonding.balanceOf(token, bob.address)) > 0n).to.equal(true)
  })

  it('lets the router owner pull', async () => {
    const { admin, alice, router } = await deployRh()
    await admin.sendTransaction({ to: await router.getAddress(), value: ethers.parseEther('1') })
    const before = await ethers.provider.getBalance(alice.address)
    await router.connect(admin).pull(alice.address, ethers.parseEther('0.4'))
    expect(await ethers.provider.getBalance(alice.address)).to.equal(before + ethers.parseEther('0.4'))
  })

  it('only owner sets factory', async () => {
    const { alice, registry } = await deployRh()
    await expectRevert(registry.connect(alice).setFactory(alice.address), 'NotOwner')
  })

  it('rejects a bad curve id', async () => {
    const { alice, factory } = await deployRh()
    await expectRevert(factory.connect(alice).createPad('curved', 'Curve', '', 4663, 0, 0, 0, 3), 'BadCurve')
  })

  it('rejects uppercase slugs', async () => {
    const { alice, factory } = await deployRh()
    await expectRevert(factory.connect(alice).createPad('Steel', 'Steel', '', 4663, 0, 0, 0, 1), 'BadSlug')
  })

  it('blocks stranger router pull', async () => {
    const { alice, router } = await deployRh()
    await expectRevert(router.connect(alice).pull(alice.address, 1n), 'NotOwner')
  })

  it('blocks pull while paused', async () => {
    const { admin, alice, router } = await deployRh()
    await router.connect(admin).setPaused(true)
    await expectRevert(router.connect(admin).pull(alice.address, ethers.parseEther('1')), 'PausedRouter')
  })

  it('links an Arc token by creator when Pons is unset', async () => {
    const { admin, alice, bob, bonding } = await deployRh()
    const Registry = await ethers.getContractFactory('LauncherRegistry')
    const reg2 = await Registry.deploy(admin.address)
    const Factory = await ethers.getContractFactory('LauncherPadFactory')
    const fac2 = await Factory.connect(admin).deploy(
      admin.address,
      await reg2.getAddress(),
      ethers.ZeroAddress,
      await bonding.getAddress(),
    )
    await reg2.connect(admin).setFactory(await fac2.getAddress())
    await fac2.connect(alice).createPad('arcpad', 'Arc Pad', '', 5042002, 0, 0, 0, 1)
    const tx = await bonding.connect(bob).launch('Arc Coin', 'ARCX', 1)
    const rec = await tx.wait()
    const ev = rec.logs.find((l) => l.fragment && l.fragment.name === 'TokenLaunched')
    await fac2.connect(bob).linkToken('arcpad', ev.args.token)
    expect(await reg2.tokenCount(ethers.keccak256(ethers.toUtf8Bytes('arcpad')))).to.equal(1n)
  })

  it('sells on the Arc curve', async () => {
    const { alice, bob, bonding } = await deployRh()
    const tx = await bonding.connect(alice).launch('Arc Coin', 'ARCX', 1)
    const rec = await tx.wait()
    const token = rec.logs.find((l) => l.fragment && l.fragment.name === 'TokenLaunched').args.token
    await bonding.connect(bob).buy(token, 0, { value: ethers.parseEther('1') })
    const bal = await bonding.balanceOf(token, bob.address)
    const back = await bonding.connect(bob).sell.staticCall(token, bal / 2n, 0)
    expect(back > 0n).to.equal(true)
    await bonding.connect(bob).sell(token, bal / 2n, 0)
  })
})
