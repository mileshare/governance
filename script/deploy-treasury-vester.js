const hre = require('hardhat')

async function main() {
  const TreasuryVester = await hre.ethers.getContractFactory('TreasuryVester')
  const treasuryVester = await TreasuryVester.deploy(
    process.env.TREASURY_VERSTER_TOKEN_ADDRESS,
    process.env.TREASURY_VERSTER_RECIPIENT,
    process.env.TREASURY_VERSTER_AMOUNT,
    process.env.TREASURY_VERSTER_BEGIN,
    process.env.TREASURY_VERSTER_CLIFF,
    process.env.TREASURY_VERSTER_END
  )

  await treasuryVester.deployed()

  console.log('TreasuryVester deployed to:', treasuryVester.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
