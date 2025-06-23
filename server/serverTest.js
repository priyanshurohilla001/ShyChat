const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:8000";

console.log(`
--- Bug Demonstration Script ---
This script demonstrates the "one-shot" matchmaking bug.

Scenario:
1. User B (a bad match for A) and User C (a good match for A) will join the pool.
2. User A will then start searching.

Expected Result (with OLD code):
- User A has a 50% chance of picking User B first.
- If it picks User B, the match fails, and User A gets stuck searching forever.
- You will see "Waiting for a 'match_found' event..." and then nothing else.

Expected Result (with NEW, FIXED code):
- User A will always find and match with User C, even if it checks User B first.
- The test will successfully complete every time.
---
`);

/**
 * Creates a Socket.IO client for testing.
 * @param {string} name - The name of the client for logging.
 * @param {object} identity - The user's identity.
 * @param {object} preferences - The user's matchmaking preferences.
 */
function createClient(name, identity, preferences) {
  console.log(`[${name}] Initializing...`);
  const socket = io(SERVER_URL, { transports: ["websocket"] });

  socket.on("connect", () => {
    console.log(`[${name}] ✅ Connected with ID: ${socket.id}`);
    socket.emit("join", { identity, preferences }, (joinResponse) => {
      if (!joinResponse.success) {
        console.error(`[${name}] ❌ 'join' failed:`, joinResponse.error);
        return socket.disconnect();
      }
      console.log(`[${name}] ✅ 'join' successful.`);
      console.log(`[${name}] 🚀 Emitting 'start' to search.`);
      socket.emit("start", (startResponse) => {
        if (!startResponse.success) {
          console.error(`[${name}] ❌ 'start' failed:`, startResponse.error);
          return socket.disconnect();
        }
        if (startResponse.data?.matchId) {
          console.log(
            `[${name}] 🎉 MATCHED immediately via 'start' callback with ${startResponse.data.matchId}`,
          );
        } else {
          console.log(
            `[${name}] ✅ 'start' successful. Waiting for a 'match_found' event...`,
          );
        }
      });
    });
  });

  socket.on("match_found", ({ peerId }) => {
    console.log(
      `[${name}] 🎉🎉🎉 MATCH FOUND via event! Peer: ${peerId}. My ID: ${socket.id}`,
    );
    socket.disconnect();
  });

  socket.on("connect_error", (err) =>
    console.error(`[${name}] ❌ Connection Error: ${err.message}`),
  );
  socket.on("disconnect", (reason) =>
    console.log(`[${name}] Disconnected. Reason: ${reason}.`),
  );
}

// --- Define three clients for the test scenario ---

// The user who will be searching for a match.
const userA_identity = { gender: "male", year: 1 };
const userA_prefs = { gender: "female", years: [2] }; // Specifically wants a 2nd year female

// A "bad" match. User A is compatible with them, but they are NOT compatible with User A.
const userB_identity = { gender: "female", year: 2 };
const userB_prefs = { gender: "female", years: "any" }; // Prefers females, so won't match with User A

// A "good" match. Both users are mutually compatible.
const userC_identity = { gender: "female", year: 2 };
const userC_prefs = { gender: "male", years: "any" }; // Prefers males, a perfect match for User A

// --- Run the test ---

// 1. The "bad" match joins the pool first.
console.log("Step 1: The 'bad' match (User B) will join the pool.");
createClient("User B (Bad Match)", userB_identity, userB_prefs);

// 2. The "good" match joins the pool.
setTimeout(() => {
  console.log("\nStep 2: The 'good' match (User C) will join the pool.");
  createClient("User C (Good Match)", userC_identity, userC_prefs);
}, 500);

// 3. User A starts searching after the pool is populated.
setTimeout(() => {
  console.log(
    "\nStep 3: User A starts searching. Let's see who gets picked...",
  );
  createClient("User A (The Searcher)", userA_identity, userA_prefs);
}, 1000);
