const hre = require("hardhat");

async function main() {
  const MileShare = await hre.ethers.getContractFactory("MileShare");
  const mileShare = await MileShare.deploy(
    process.env.GOVERNANCE_ACCOUNT,
    process.env.GOVERNANCE_MINTER,
    process.env.GOVERMANCE_FIRST_MINT_TIMESTAMP
  );

  await mileShare.deployed();

  console.log("MileShare deployed to:", mileShare.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
