const hre = require("hardhat");

async function main() {
  const DigitalIdentity = await hre.ethers.getContractFactory("DigitalIdentity");
  const contract = await DigitalIdentity.deploy();

  await contract.waitForDeployment();   //  correct for ethers v6

  const address = await contract.getAddress();  //  ethers v6 way

  console.log("Contract deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
