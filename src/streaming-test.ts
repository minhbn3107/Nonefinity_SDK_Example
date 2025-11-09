/**
 * Streaming Test
 * Tests SSE streaming with multiple messages
 */

import { NonefinityClient } from "./nonefinity-sdk.js";
import type { StreamEvent } from "./nonefinity-sdk.js";
import * as dotenv from "dotenv";

dotenv.config();

const CHAT_CONFIG_ID = process.env.CHAT_CONFIG_ID || "";
const API_KEY = process.env.API_KEY || "";
const API_URL = process.env.API_URL || "http://localhost:8000";

async function sendAndPrintMessage(
  client: NonefinityClient,
  question: string
): Promise<void> {
  console.log(`\n👤 You: ${question}`);
  console.log("🤖 Assistant: ", { newline: false } as any);

  let responseStarted = false;

  await client.chat(question, (event: StreamEvent) => {
    if (event.event === "start") {
      responseStarted = true;
    } else if (event.event === "message" && event.data.content) {
      process.stdout.write(event.data.content);
    } else if (event.event === "message" && event.data.done) {
      console.log(); // New line after response
    } else if (event.event === "error") {
      console.error(`\n❌ Error: ${event.data.message}`);
    }
  });
}

async function main() {
  console.log("=" .repeat(60));
  console.log("🧪 NONEFINITY SDK - STREAMING TEST");
  console.log("=" .repeat(60));

  if (!CHAT_CONFIG_ID || !API_KEY) {
    console.error("\n❌ Missing configuration! Check your .env file");
    process.exit(1);
  }

  try {
    console.log("\n🔧 Initializing SDK...");
    const client = new NonefinityClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
      session: "auto",
    });

    console.log("✅ Creating session...");
    const sessionId = await client.createSession();
    console.log(`📝 Session: ${sessionId}`);

    console.log("\n" + "=" .repeat(60));
    console.log("💬 MULTI-TURN CONVERSATION");
    console.log("=" .repeat(60));

    // Message 1
    await sendAndPrintMessage(client, "What is TypeScript?");

    // Message 2
    await sendAndPrintMessage(
      client,
      "Can you give me a simple code example?"
    );

    // Message 3
    await sendAndPrintMessage(
      client,
      "What are the benefits compared to JavaScript?"
    );

    console.log("\n" + "=" .repeat(60));
    console.log("✅ Streaming test completed!");
    console.log(`📝 Final Session ID: ${client.getSessionId()}`);

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
