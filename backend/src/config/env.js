import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

  // blockchain local hardhat
  hardhatRpcUrl: process.env.HARDHAT_RPC_URL || "",
  ethPrivateKey: process.env.ETH_PRIVATE_KEY || "",
  anchorContractAddress: process.env.ANCHOR_CONTRACT_ADDRESS || ""
};
