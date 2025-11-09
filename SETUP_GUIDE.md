# 🚀 Test SDK Setup Guide

This guide will walk you through setting up and running the Nonefinity SDK test project.

## 📦 What's Included

This is a **complete standalone Node.js/TypeScript project** for testing the Nonefinity SDK:

```
test_sdk/
├── src/
│   ├── nonefinity-sdk.ts      # The SDK (copied from main project)
│   ├── basic-test.ts           # Test: Basic functionality
│   ├── streaming-test.ts       # Test: Streaming & multi-turn
│   └── session-test.ts         # Test: Session management
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript config
├── .env.example                # Example credentials
├── .gitignore                  # Git ignore rules
└── README.md                   # Documentation
```

## ⚡ Quick Setup (3 Steps)

### Step 1: Install Dependencies

```bash
cd test_sdk
npm install
```

This will install:
- `typescript` - For compiling TypeScript
- `tsx` - For running TypeScript directly (dev mode)
- `@types/node` - Node.js type definitions
- `dotenv` - For loading .env variables

### Step 2: Configure Credentials

```bash
# Copy example file
cp .env.example .env

# Edit .env and add your credentials
# Get these from the Nonefinity dashboard:
#   - CHAT_CONFIG_ID from /dashboard/chats
#   - API_KEY from /dashboard/api-keys
```

Your `.env` should look like:
```env
CHAT_CONFIG_ID=cm123abc456def
API_KEY=sk-abc123def456ghi789
API_URL=http://localhost:8000
```

### Step 3: Run Tests

```bash
# Quick test (no build required)
npm run dev

# Or run all tests
npm run dev:streaming
npm run dev:session
```

## 🧪 Available Tests

### 1. Basic Test
**What it tests:** SDK initialization, session creation, simple chat

```bash
npm run dev
```

**What you'll see:**
```
🧪 NONEFINITY SDK - BASIC TEST
============================================================
1️⃣  Initializing SDK...
✅ SDK initialized
2️⃣  Creating session...
✅ Session created: session-2025-11-07-abc123
3️⃣  Sending message: 'Hello!'
📡 Streaming response:
------------------------------------------------------------
🚀 Stream started
Hello! How can I help you today?
✅ Stream complete
```

### 2. Streaming Test
**What it tests:** Multi-turn conversations, session persistence

```bash
npm run dev:streaming
```

**What you'll see:**
```
💬 MULTI-TURN CONVERSATION
============================================================
👤 You: What is TypeScript?
🤖 Assistant: [streaming response...]

👤 You: Can you give me a simple code example?
🤖 Assistant: [streaming response...]

👤 You: What are the benefits compared to JavaScript?
🤖 Assistant: [streaming response...]
```

### 3. Session Management Test
**What it tests:** Session naming, lifecycle, resumption

```bash
npm run dev:session
```

**What you'll see:**
```
📋 Test 1: Auto Session Naming
✅ Auto session created: session-2025-11-07-abc123

📋 Test 2: Custom Session Naming
✅ Custom session created: user-123-custom-1699308000000

📋 Test 3: Session Persistence
✅ Session persisted correctly!

📋 Test 4: Session Lifecycle
✅ Session lifecycle works correctly!

📋 Test 5: Resume Specific Session
✅ Session resumed successfully!
```

## 🎯 Getting Your Credentials

### Chat Config ID

1. Open your Nonefinity app
2. Go to `/dashboard/chats`
3. Click on a chat configuration (or create one)
4. Copy the ID (usually starts with `cm`)

### API Key

1. Open your Nonefinity app
2. Go to `/dashboard/api-keys`
3. Click "Create API Key"
4. **Important:** Copy the key immediately (shown only once!)
5. The key should start with something like `sk-`

## 🔧 Development vs Production

### Development Mode (Recommended for testing)
```bash
npm run dev              # Runs with tsx, no build needed
npm run dev:streaming    # Fast, immediate execution
npm run dev:session      # Great for development
```

### Production Mode
```bash
npm run build            # Compiles TypeScript to JavaScript
npm test                 # Runs compiled tests
npm run test:streaming
npm run test:session
npm run test:all         # Runs all tests
```

## 🐛 Common Issues & Solutions

### Issue: "Missing configuration!"

**Cause:** `.env` file not created or credentials not set

**Solution:**
```bash
cp .env.example .env
# Then edit .env with your actual credentials
```

### Issue: "Failed to create session: 401"

**Cause:** Invalid or expired API key

**Solution:**
- Generate a new API key from `/dashboard/api-keys`
- Update your `.env` file with the new key

### Issue: "Connection refused" or "ECONNREFUSED"

**Cause:** API server not running or wrong URL

**Solution:**
- Make sure your Nonefinity API server is running
- Check `API_URL` in `.env` is correct (default: `http://localhost:8000`)

### Issue: TypeScript errors about "Cannot find name 'fetch'"

**Cause:** Using Node.js version < 18

**Solution:**
- Upgrade to Node.js 18 or higher (fetch is built-in)
- Or install `node-fetch`: `npm install node-fetch`

### Issue: "Cannot find module 'dotenv'"

**Cause:** Dependencies not installed

**Solution:**
```bash
npm install
```

## 📚 Understanding the Code

### Basic SDK Usage

```typescript
import { NonefinityClient } from './nonefinity-sdk.js';

// 1. Initialize
const client = new NonefinityClient({
  chatConfigId: 'your-config-id',
  apiKey: 'your-api-key',
  session: 'auto',  // or custom function
});

// 2. Chat with streaming
await client.chat('Hello!', (event) => {
  // Handle streaming events
  if (event.event === 'message' && event.data.content) {
    process.stdout.write(event.data.content);
  }
  if (event.event === 'message' && event.data.done) {
    console.log('\nDone!');
  }
});
```

### Session Modes

**Auto mode (generates names automatically):**
```typescript
session: 'auto'
// Creates: session-2025-11-07-abc123
```

**Custom function:**
```typescript
session: () => `user-${userId}-${Date.now()}`
// Creates: user-123-custom-1699308000000
```

## 🎓 Next Steps

1. **Run the tests** to verify everything works
2. **Modify test files** to experiment with different scenarios
3. **Check the SDK code** in `src/nonefinity-sdk.ts` to understand implementation
4. **Read the README** for detailed API reference
5. **Try the interactive test page** in the main app at `/sdk-test`

## 📖 Additional Resources

- **Main SDK Documentation:** `../Nonefinity_FE/src/sdk/README.md`
- **Code Examples:** `../Nonefinity_FE/src/sdk/examples.ts`
- **Interactive UI:** Navigate to `/sdk-test` in the main Nonefinity app
- **API Endpoints:** `../Nonefinity_FE/src/consts/endpoint.ts`

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file exists and has valid values
- [ ] API server is running and accessible
- [ ] Chat config ID exists in your dashboard
- [ ] API key is valid and has proper permissions

## 💡 Tips

- **Use dev mode** during development (faster, no build step)
- **Check console output** for detailed error messages
- **Enable verbose logging** by adding `console.log` to SDK
- **Try basic test first** before complex scenarios
- **Verify credentials** in the dashboard if tests fail

## 🎉 Success Criteria

You've successfully set up the SDK test project if you can:

✅ Run `npm run dev` without errors
✅ See streaming responses in the console
✅ Get different session IDs with each test run
✅ Complete multi-turn conversations

---

**Need help?** Check the detailed README.md or review the test code for examples.
