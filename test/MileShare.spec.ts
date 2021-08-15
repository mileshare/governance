import chai, { expect } from 'chai'
import { BigNumber, Contract, constants, utils } from 'ethers'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { governanceFixture } from './fixtures'
import { expandTo18Decimals, mineBlock } from './utils'

import MileShare from '../build/MileShare.json'

chai.use(solidity)

const DOMAIN_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('EIP712Domain(string name,uint256 chainId,address verifyingContract)')
)

const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

describe('MileShare', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999,
    },
  })
  const [wallet, other0, other1] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let mile: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(governanceFixture)
    mile = fixture.mile
  })

  it('permit', async () => {
    const domainSeparator = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'uint256', 'address'],
        [DOMAIN_TYPEHASH, utils.keccak256(utils.toUtf8Bytes('MileShare')), 1, mile.address]
      )
    )

    const owner = wallet.address
    const spender = other0.address
    const value = 123
    const nonce = await mile.nonces(wallet.address)
    const deadline = constants.MaxUint256
    const digest = utils.keccak256(
      utils.solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          domainSeparator,
          utils.keccak256(
            utils.defaultAbiCoder.encode(
              ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
              [PERMIT_TYPEHASH, owner, spender, value, nonce, deadline]
            )
          ),
        ]
      )
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await mile.permit(owner, spender, value, deadline, v, utils.hexlify(r), utils.hexlify(s))
    expect(await mile.allowance(owner, spender)).to.eq(value)
    expect(await mile.nonces(owner)).to.eq(1)

    await mile.connect(other0).transferFrom(owner, spender, value)
  })

  it('nested delegation', async () => {
    await mile.transfer(other0.address, expandTo18Decimals(1))
    await mile.transfer(other1.address, expandTo18Decimals(2))

    let currectVotes0 = await mile.getCurrentVotes(other0.address)
    let currectVotes1 = await mile.getCurrentVotes(other1.address)
    expect(currectVotes0).to.be.eq(0)
    expect(currectVotes1).to.be.eq(0)

    await mile.connect(other0).delegate(other1.address)
    currectVotes1 = await mile.getCurrentVotes(other1.address)
    expect(currectVotes1).to.be.eq(expandTo18Decimals(1))

    await mile.connect(other1).delegate(other1.address)
    currectVotes1 = await mile.getCurrentVotes(other1.address)
    expect(currectVotes1).to.be.eq(expandTo18Decimals(1).add(expandTo18Decimals(2)))

    await mile.connect(other1).delegate(wallet.address)
    currectVotes1 = await mile.getCurrentVotes(other1.address)
    expect(currectVotes1).to.be.eq(expandTo18Decimals(1))
  })

  it('mints', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    const mile = await deployContract(wallet, MileShare, [wallet.address, wallet.address, now + 60 * 60])
    const supply = await mile.totalSupply()

    await expect(mile.mint(wallet.address, 1)).to.be.revertedWith('MILE::mint: minting not allowed yet')

    let timestamp = await mile.mintingAllowedAfter()
    await mineBlock(provider, timestamp.toString())

    await expect(mile.connect(other1).mint(other1.address, 1)).to.be.revertedWith('MILE::mint: only the minter can mint')
    await expect(mile.mint('0x0000000000000000000000000000000000000000', 1)).to.be.revertedWith('MILE::mint: cannot transfer to the zero address')

    // can mint up to 2%
    const mintCap = BigNumber.from(await mile.mintCap())
    const amount = supply.mul(mintCap).div(100)
    await mile.mint(wallet.address, amount)
    expect(await mile.balanceOf(wallet.address)).to.be.eq(supply.add(amount))

    timestamp = await mile.mintingAllowedAfter()
    await mineBlock(provider, timestamp.toString())
    // cannot mint 2.01%
    await expect(mile.mint(wallet.address, supply.mul(mintCap.add(1)))).to.be.revertedWith('MILE::mint: exceeded mint cap')
  })


  it('burn', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    const mint = await deployContract(wallet, MileShare, [wallet.address, wallet.address, now + 60 * 60])
    const supply = await mint.totalSupply()

    let balanceBefore = await mint.balanceOf(wallet.address)
    await mint.connect(wallet).burn(0)
    expect(await mint.balanceOf(wallet.address)).to.be.eq(balanceBefore)
    expect(await mint.totalSupply()).to.be.eq(supply)

    await mint.connect(wallet).burn(1)
    expect(await mint.balanceOf(wallet.address)).to.be.eq(balanceBefore.sub(1))
    expect(await mint.totalSupply()).to.be.eq(supply.sub(1))

    await expect(mint.connect(wallet).burn(supply + 2)).to.be.revertedWith('MILE::_burn: amount exceeds totalSupply')

    await mint.connect(wallet).transfer(other0.address, 100)
    balanceBefore = await mint.balanceOf(wallet.address)
    await expect(mint.connect(wallet).burn(balanceBefore.add(1))).to.be.revertedWith(
      'MILE::_burn: amount underflow'
    )
  })

  it('burnFrom', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    const mint = await deployContract(wallet, MileShare, [wallet.address, wallet.address, now + 60 * 60])
    const supply = await mint.totalSupply()

    let balanceBefore = await mint.balanceOf(wallet.address)
    await mint.connect(other0).burnFrom(wallet.address, 0)
    expect(await mint.balanceOf(wallet.address)).to.be.eq(balanceBefore)
    expect(await mint.totalSupply()).to.be.eq(supply)

    await mint.connect(wallet).approve(other0.address, 100)
    await mint.connect(other0).burnFrom(wallet.address, 1)
    expect(await mint.balanceOf(wallet.address)).to.be.eq(balanceBefore.sub(1))
    expect(await mint.totalSupply()).to.be.eq(supply.sub(1))

    balanceBefore = await mint.balanceOf(wallet.address)
    await mint.connect(wallet).approve(other0.address, 100)
    await expect(mint.connect(other0).burnFrom(wallet.address, 101)).to.be.revertedWith(
      'MILE::burnFrom: amount underflow'
    )

    balanceBefore = await mint.balanceOf(wallet.address)
    await mint.connect(wallet).approve(other0.address, balanceBefore.add(1))
    await expect(mint.connect(other0).burnFrom(wallet.address, balanceBefore.add(1))).to.be.revertedWith(
      'MILE::_burn: amount exceeds totalSupply'
    )

    await mint.connect(wallet).transfer(other0.address, 100)
    balanceBefore = await mint.balanceOf(wallet.address)
    await mint.connect(wallet).approve(other0.address, balanceBefore.add(1))
    await expect(mint.connect(other0).burnFrom(wallet.address, balanceBefore.add(1))).to.be.revertedWith(
      'MILE::_burn: amount underflow'
    )

    await expect(mint.connect(wallet).burnFrom('0x0000000000000000000000000000000000000000', 0)).to.be.revertedWith(
      'MILE::_burn: burn from the zero address'
    )
  })
})
