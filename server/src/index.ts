import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import { setupSocket } from "./socket/socket";
import dotenv from "dotenv";
import os from "os";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;

// SSL Configuration
const SSL_KEY_PATH =
  "/Users/priyanshurohilla/certs/localvc/192.168.2.101-key.pem";
const SSL_CERT_PATH = "/Users/priyanshurohilla/certs/localvc/192.168.2.101.pem";

// Frontend path: ../frontend/dist
const FRONTEND_PATH = path.join(__dirname, "..", "..", "frontend", "dist");

interface SSLOptions {
  key: Buffer;
  cert: Buffer;
}

interface CacheEntry {
  data: Buffer;
  etag: string;
  timestamp: number;
}

// MIME types mapping
const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Load SSL certificates
let sslOptions: SSLOptions | null = null;
try {
  sslOptions = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH),
  };
  console.log("SSL certificates loaded successfully");
} catch (error) {
  console.error("Failed to load SSL certificates:", (error as Error).message);
  console.log("Falling back to HTTP server");
}

// Simple in-memory cache
const fileCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

function serveFile(req: http.IncomingMessage, res: http.ServerResponse): void {
  let requestPath = req.url === "/" ? "/index.html" : req.url || "/index.html";

  // Remove query parameters
  requestPath = requestPath.split("?")[0];

  const filePath = path.join(FRONTEND_PATH, requestPath);
  const contentType = getMimeType(requestPath);

  // Check cache first
  const cached = fileCache.get(filePath);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      ETag: cached.etag,
    });
    res.end(cached.data);
    return;
  }

  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const indexPath = path.join(FRONTEND_PATH, "index.html");
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(indexData);
        }
      });
      return;
    }

    // Cache the file
    const etag = `"${data.length}-${Date.now()}"`;
    fileCache.set(filePath, {
      data,
      etag,
      timestamp: Date.now(),
    });

    // Send response
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control":
        contentType === "text/html" ? "no-cache" : "public, max-age=86400",
      ETag: etag,
    });
    res.end(data);
  });
}

function requestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  serveFile(req, res);
}

// Create server
const server = sslOptions
  ? https.createServer(sslOptions, requestHandler)
  : http.createServer(requestHandler);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

setupSocket(io);

// Start server
const serverPort = sslOptions ? HTTPS_PORT : PORT;
function getLocalExternalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        (iface.address.startsWith("192.") || iface.address.startsWith("172."))
      ) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

server.listen(serverPort, "0.0.0.0", () => {
  const localIP = getLocalExternalIP();
  console.log(`${sslOptions ? "HTTPS" : "HTTP"} server listening on:`);
  console.log(`  Local:   https://localhost:${serverPort}`);
  console.log(`  Network: https://${localIP}:${serverPort}`);
  console.log(`Serving frontend from: ${FRONTEND_PATH}`);
  console.log(`Socket.IO ready`);
});

// Clean cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of fileCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      fileCache.delete(key);
    }
  }
}, CACHE_DURATION);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export { io };
