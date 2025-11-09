/**
 * Basic SDK Test
 * Tests basic initialization and chat functionality
 */

import { config } from "dotenv";
import { NonefinitySimpleClient, type StreamEvent } from "@nonefinity/ai-sdk/simple";

// Load environment variables
config();

const CHAT_CONFIG_ID = process.env.CHAT_CONFIG_ID || "";
const API_KEY = process.env.API_KEY || "";
const API_URL = process.env.API_URL || "http://localhost:8000";

async function main() {
  console.log("=" .repeat(60));
  console.log("🧪 NONEFINITY SDK - BASIC TEST");
  console.log("=" .repeat(60));

  // Validate environment variables
  if (!CHAT_CONFIG_ID || !API_KEY) {
    console.error("\n❌ Error: Missing configuration!");
    console.error("Please set CHAT_CONFIG_ID and API_KEY in .env file");
    console.error("Copy .env.example to .env and fill in your credentials");
    process.exit(1);
  }

  console.log("\n📋 Configuration:");
  console.log(`   Chat Config ID: ${CHAT_CONFIG_ID}`);
  console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`   API URL: ${API_URL}`);

  try {
    // Initialize SDK
    console.log("\n1️⃣  Initializing SDK...");
    const client = new NonefinitySimpleClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
      session: "auto",
    });
    console.log("✅ SDK initialized");

    // Create session
    console.log("\n2️⃣  Creating session...");
    const sessionId = await client.createSession();
    console.log(`✅ Session created: ${sessionId}`);

    // Send a simple message
    console.log("\n3️⃣  Sending message: 'Hello!'");
    console.log("📡 Streaming response:");
    console.log("-" .repeat(60));

    await client.chat("Hello!", (event: StreamEvent) => {
      if (event.event === "start") {
        console.log("🚀 Stream started");
      } else if (event.event === "message" && event.data.content) {
        process.stdout.write(event.data.content);
      } else if (event.event === "message" && event.data.done) {
        console.log("\n✅ Stream complete");
      } else if (event.event === "error") {
        console.error(`\n❌ Error: ${event.data.message}`);
      } else {
        console.log("Unhandled event:", event);
      }
    });

    console.log("-" .repeat(60));
    console.log(`\n📝 Session ID: ${client.getSessionId()}`);
    console.log("\n✅ Basic test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
