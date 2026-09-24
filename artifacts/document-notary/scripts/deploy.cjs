const hre = require("hardhat");

async function main() {
  const Notary = await hre.ethers.getContractFactory("Notary");
  const notary = await Notary.deploy();
  await notary.waitForDeployment();

  console.log(`Notary deployed to ${await notary.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});