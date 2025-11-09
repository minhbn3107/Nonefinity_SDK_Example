# Nonefinity SDK Test Project

A comprehensive test project for the Nonefinity AI SDK featuring both Node.js CLI tests and a React web interface. This project demonstrates how to use the SDK in a real Node.js/TypeScript environment.

## 📋 Prerequisites

- **Node.js 18+** (for native fetch support)
- **Bun** (recommended for faster CLI execution) or npm
- A Nonefinity account with:
  - A Chat Configuration ID
  - An API Key
- Nonefinity API server running (default: `http://localhost:8000`)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd test_sdk
npm install
```

> **Note**: We use npm for installing dependencies, but Bun for running CLI tests (faster execution).

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
CHAT_CONFIG_ID=your-chat-config-id-here
API_KEY=your-api-key-here
API_URL=http://localhost:8000
```

### 3. Run Tests

#### Node.js CLI Tests (using Bun for faster execution):

```bash
# Run basic test (recommended)
bun run cli

# Or use npm (slower)
npm run dev

# Run streaming test
bun run dev:streaming

# Run session management test
bun run dev:session
```

#### React Web Interface:

```bash
# Start React development server
npm run react:dev
```

This opens a beautiful web interface at `http://localhost:3002` (or 3001 if available) where you can:
- Configure SDK settings interactively
- Test real-time chat with streaming responses
- Manage sessions (create, clear, copy IDs)
- View live event logs
- Save configuration to browser storage

#### Production Mode (compiled):

```bash
# Build TypeScript to JavaScript
npm run build

# Run tests
npm test                  # Basic test
npm run test:streaming    # Streaming test
npm run test:session      # Session management test
npm run test:all          # All tests
```

## 📝 Test Descriptions

### 1. Basic Test (`basic-test.ts`)

Tests fundamental SDK functionality:
- ✅ SDK initialization
- ✅ Session creation
- ✅ Simple chat message
- ✅ SSE streaming events

**Run:**
```bash
npm run dev
```

**Expected Output:**
```
🧪 NONEFINITY SDK - BASIC TEST
============================================================
📋 Configuration:
   Chat Config ID: xxx
   API Key: sk-xxx...
   API URL: http://localhost:8000

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
------------------------------------------------------------
```

### 2. Streaming Test (`streaming-test.ts`)

Tests multi-turn conversations with streaming:
- ✅ Multiple messages in sequence
- ✅ Session persistence across messages
- ✅ Real-time streaming output

**Run:**
```bash
npm run dev:streaming
```

**Expected Output:**
```
🧪 NONEFINITY SDK - STREAMING TEST
============================================================
💬 MULTI-TURN CONVERSATION
============================================================
👤 You: What is TypeScript?
🤖 Assistant: TypeScript is a strongly typed programming language...

👤 You: Can you give me a simple code example?
🤖 Assistant: Here's a simple example: ...

👤 You: What are the benefits compared to JavaScript?
🤖 Assistant: TypeScript offers several benefits...
```

### 3. Session Management Test (`session-test.ts`)

Tests all session-related features:
- ✅ Auto session naming
- ✅ Custom session naming
- ✅ Session persistence
- ✅ Session lifecycle (create, clear, recreate)
- ✅ Resume specific session

**Run:**
```bash
npm run dev:session
```

**Expected Output:**
```
🧪 NONEFINITY SDK - SESSION MANAGEMENT TEST
============================================================
📋 Test 1: Auto Session Naming
------------------------------------------------------------
✅ Auto session created: session-2025-11-07-abc123

📋 Test 2: Custom Session Naming
------------------------------------------------------------
✅ Custom session created: user-123-custom-1699308000000

📋 Test 3: Session Persistence
------------------------------------------------------------
✅ Session persisted correctly!

📋 Test 4: Session Lifecycle
------------------------------------------------------------
✅ Session lifecycle works correctly!

📋 Test 5: Resume Specific Session
------------------------------------------------------------
✅ Session resumed successfully!
```

## 📂 Project Structure

```
test_sdk/
├── src/
│   ├── nonefinity-sdk.ts      # SDK implementation
│   ├── basic-test.ts           # Basic functionality test
│   ├── streaming-test.ts       # Streaming and multi-turn test
│   └── session-test.ts         # Session management test
├── dist/                       # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
├── .env.example
├── .env                        # Your credentials (create this)
└── README.md
```

## 🔧 SDK Usage

### Basic Example

```typescript
import { NonefinityClient } from './nonefinity-sdk.js';

// Initialize
const client = new NonefinityClient({
  chatConfigId: 'your-chat-config-id',
  apiKey: 'your-api-key',
  apiUrl: 'http://localhost:8000',
  session: 'auto',  // or custom function
});

// Chat with streaming
await client.chat('Hello!', (event) => {
  if (event.event === 'message' && event.data.content) {
    console.log(event.data.content);
  }
  if (event.event === 'message' && event.data.done) {
    console.log('Complete!');
  }
});
```

### Session Modes

#### Auto Mode (Default)
```typescript
const client = new NonefinityClient({
  chatConfigId: 'xxx',
  apiKey: 'xxx',
  session: 'auto',  // Generates: session-2025-11-07-abc123
});
```

#### Custom Function
```typescript
const client = new NonefinityClient({
  chatConfigId: 'xxx',
  apiKey: 'xxx',
  session: () => `user-${userId}-${Date.now()}`,
});
```

### Event Types

The SDK emits the following events during streaming:

- **`start`** - Stream has started
- **`message`** with `data.content` - Text chunks
- **`message`** with `data.done` - Stream complete
- **`error`** with `data.message` - Error occurred

## 🐛 Troubleshooting

### Issue: Missing credentials error

**Solution:** Make sure you've created `.env` file from `.env.example` and filled in your credentials.

### Issue: Connection refused

**Solution:** Ensure your Nonefinity API server is running on the configured URL.

### Issue: fetch is not defined (Node < 18)

**Solution:** Upgrade to Node.js 18+ or install `node-fetch`:
```bash
npm install node-fetch
```

### Issue: TypeScript errors about @types/node

**Solution:** Install missing types:
```bash
npm install --save-dev @types/node
```

## 📚 API Reference

### Constructor

```typescript
new NonefinityClient(config: NonefinityConfig)
```

### Methods

- **`createSession(): Promise<string>`** - Create a new session
- **`chat(question: string, onEvent: callback): Promise<{ sessionId: string }>`** - Send message with streaming
- **`chatComplete(question: string): Promise<ChatResponse>`** - Send message and wait for full response
- **`getSessionId(): string | null`** - Get current session ID
- **`setSessionId(id: string): void`** - Set specific session ID
- **`clearSession(): void`** - Clear current session

## 📖 Learn More

- **Main SDK Documentation**: `../Nonefinity_FE/src/sdk/README.md`
- **SDK Examples**: `../Nonefinity_FE/src/sdk/examples.ts`
- **Interactive Test Page**: Navigate to `/sdk-test` in the main app

## 🎯 Getting Credentials

1. **Chat Config ID**:
   - Go to `/dashboard/chats` in your Nonefinity app
   - Create or select a chat configuration
   - Copy the config ID

2. **API Key**:
   - Go to `/dashboard/api-keys` in your Nonefinity app
   - Click "Create API Key"
   - Copy and save the key immediately (shown only once!)

## ✅ Test Checklist

Before running tests, ensure:

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with valid credentials
- [ ] Nonefinity API server is running
- [ ] Chat config ID exists and is valid
- [ ] API key has proper permissions

## 🔄 Common Workflows

### Test After SDK Changes

```bash
# 1. Update SDK file if needed
cp ../Nonefinity_FE/src/sdk/nonefinity-sdk.ts src/

# 2. Run tests
npm run dev
npm run dev:streaming
npm run dev:session
```

### Debug API Issues

```bash
# Enable verbose logging by adding console.logs to SDK
# Then run with:
npm run dev 2>&1 | tee debug.log
```

### Build for Production

```bash
npm run build
# Compiled files will be in dist/
```

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your `.env` configuration
3. Ensure API server is accessible
4. Check API key permissions
5. Review test output for specific failures

## 📄 License

MIT
