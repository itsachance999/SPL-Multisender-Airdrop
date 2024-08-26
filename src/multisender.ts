import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createTransferInstruction, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Load environment variables from .env file
dotenv.config();

const SPL_TOKEN_ADDRESS = process.env.SPL_TOKEN_ADDRESS || "";

// Load your wallet keypair
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('./src/wallet.json', 'utf-8')))
);

// Set up the connection
const connection = new Connection('https://api.devnet.solana.com');

// SPL Token address
const tokenAddress = new PublicKey(SPL_TOKEN_ADDRESS);

async function airdrop() {
  // Load recipients from CSV
  const recipients = fs
    .readFileSync('./src/recipients.csv', 'utf-8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [recipient, amount] = line.split(',');
      return { recipient: new PublicKey(recipient.trim()), amount: parseInt(amount.trim(), 10) };
    });

  // Create a new transaction
  const transaction = new Transaction();

  // Loop through each recipient and add the transfer instruction to the transaction
  for (const { recipient, amount } of recipients) {
    try {
      // Get or create associated token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        tokenAddress,
        recipient
      );

      // Add the transfer instruction to the transaction
      const transferInstruction = createTransferInstruction(
        wallet.publicKey,
        recipientTokenAccount.address,
        wallet.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      );

      transaction.add(transferInstruction);
    } catch (error) {
      console.error(`Failed to prepare transfer for ${recipient.toBase58()}: ${(error as Error).message}`);
    }
  }

  // Send and confirm the transaction
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log(`Transaction successful with signature: ${signature}`);
  } catch (error) {
    console.error(`Failed to send transaction: ${(error as Error).message}`);
  }
}

airdrop().catch(console.error);
