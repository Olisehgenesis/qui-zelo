const hre = require("hardhat");

async function main() {
  console.log("Deploying Quizelo contract...");

  const Quizelo = await hre.ethers.getContractFactory("Quizelo");
  const quizelo = await Quizelo.deploy();

  await quizelo.waitForDeployment();

  const address = await quizelo.getAddress();
  console.log("Quizelo deployed to:", address);
  console.log("Contract owner:", await quizelo.owner());
  
  // Verify deployment
  console.log("\nVerifying deployment...");
  console.log("QUIZ_FEE:", hre.ethers.formatEther(await quizelo.QUIZ_FEE()), "CELO");
  console.log("QUIZ_DURATION:", (await quizelo.QUIZ_DURATION()).toString(), "seconds");
  console.log("COOLDOWN_PERIOD:", (await quizelo.COOLDOWN_PERIOD()).toString(), "seconds");
  console.log("MAX_DAILY_QUIZZES:", (await quizelo.MAX_DAILY_QUIZZES()).toString());
  console.log("MIN_CONTRACT_BALANCE:", hre.ethers.formatEther(await quizelo.MIN_CONTRACT_BALANCE()), "CELO");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

