import { ethers } from "ethers";
import { env } from "../../config/env.js";

const ABI = [
  "function anchorEvent(string did, bytes32 eventHash, string eventType) external",
  "function isAnchored(bytes32 eventHash) external view returns (bool)"
];

function getContract() {
  if (!env.hardhatRpcUrl || !env.ethPrivateKey || !env.anchorContractAddress) {
    throw new Error("Blockchain env vars missing (HARDHAT_RPC_URL / ETH_PRIVATE_KEY / ANCHOR_CONTRACT_ADDRESS)");
  }

  const provider = new ethers.JsonRpcProvider(env.hardhatRpcUrl);
  const wallet = new ethers.Wallet(env.ethPrivateKey, provider);
  return new ethers.Contract(env.anchorContractAddress, ABI, wallet);
}

// eventHashHex must be bytes32 hex string (0x + 64 hex chars)
export async function anchorOnChain({ did, eventHashHex, eventType }) {
  const contract = getContract();

  const tx = await contract.anchorEvent(did, eventHashHex, eventType);
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
}
