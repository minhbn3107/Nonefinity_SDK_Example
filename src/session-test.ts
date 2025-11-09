/**
 * Session Management Test
 * Tests session creation, resumption, and custom naming
 */

import { NonefinityClient } from "./nonefinity-sdk.js";
import * as dotenv from "dotenv";

dotenv.config();

const CHAT_CONFIG_ID = process.env.CHAT_CONFIG_ID || "";
const API_KEY = process.env.API_KEY || "";
const API_URL = process.env.API_URL || "http://localhost:8000";

async function main() {
  console.log("=" .repeat(60));
  console.log("🧪 NONEFINITY SDK - SESSION MANAGEMENT TEST");
  console.log("=" .repeat(60));

  if (!CHAT_CONFIG_ID || !API_KEY) {
    console.error("\n❌ Missing configuration! Check your .env file");
    process.exit(1);
  }

  try {
    // Test 1: Auto session naming
    console.log("\n📋 Test 1: Auto Session Naming");
    console.log("-" .repeat(60));
    
    const client1 = new NonefinityClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
      session: "auto",
    });

    const session1 = await client1.createSession();
    console.log(`✅ Auto session created: ${session1}`);

    // Test 2: Custom session naming
    console.log("\n📋 Test 2: Custom Session Naming");
    console.log("-" .repeat(60));

    const userId = "user-123";
    const client2 = new NonefinityClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
      session: () => `${userId}-custom-${Date.now()}`,
    });

    const session2 = await client2.createSession();
    console.log(`✅ Custom session created: ${session2}`);

    // Test 3: Session persistence
    console.log("\n📋 Test 3: Session Persistence");
    console.log("-" .repeat(60));

    const client3 = new NonefinityClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
    });

    // Send first message
    console.log("Sending first message...");
    await client3.chat("Hello!", (event) => {
      if (event.event === "message" && event.data.content) {
        process.stdout.write(event.data.content);
      }
      if (event.event === "message" && event.data.done) {
        console.log(); // New line
      }
    });

    const sessionBeforeContinue = client3.getSessionId();
    console.log(`Session ID after first message: ${sessionBeforeContinue}`);

    // Send follow-up message (should use same session)
    console.log("\nSending follow-up message...");
    await client3.chat("Can you tell me more?", (event) => {
      if (event.event === "message" && event.data.content) {
        process.stdout.write(event.data.content);
      }
      if (event.event === "message" && event.data.done) {
        console.log(); // New line
      }
    });

    const sessionAfterContinue = client3.getSessionId();
    console.log(`Session ID after follow-up: ${sessionAfterContinue}`);

    if (sessionBeforeContinue === sessionAfterContinue) {
      console.log("✅ Session persisted correctly!");
    } else {
      console.log("❌ Session changed unexpectedly!");
    }

    // Test 4: Session lifecycle
    console.log("\n📋 Test 4: Session Lifecycle");
    console.log("-" .repeat(60));

    const client4 = new NonefinityClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
    });

    const session4a = await client4.createSession();
    console.log(`Created session: ${session4a}`);

    // Clear session
    client4.clearSession();
    console.log("Cleared session");
    console.log(`Session after clear: ${client4.getSessionId()}`);

    // Create new session
    const session4b = await client4.createSession();
    console.log(`New session created: ${session4b}`);

    if (session4a !== session4b) {
      console.log("✅ Session lifecycle works correctly!");
    } else {
      console.log("❌ Sessions are the same!");
    }

    // Test 5: Resume specific session
    console.log("\n📋 Test 5: Resume Specific Session");
    console.log("-" .repeat(60));

    const client5 = new NonefinityClient({
      chatConfigId: CHAT_CONFIG_ID,
      apiKey: API_KEY,
      apiUrl: API_URL,
    });

    // Set a specific session ID
    client5.setSessionId(session1);
    console.log(`Set session ID to: ${session1}`);
    console.log(`Current session: ${client5.getSessionId()}`);

    if (client5.getSessionId() === session1) {
      console.log("✅ Session resumed successfully!");
    }

    console.log("\n" + "=" .repeat(60));
    console.log("✅ All session tests completed!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
