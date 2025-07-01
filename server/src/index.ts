import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import { setupSocket } from "./socket/socket";
import dotenv from "dotenv";
import os from "os";

// Load environment configuration
dotenv.config();

// ========================================
// CONFIGURATION
// ========================================

interface ServerConfig {
  debug: boolean;
  ports: {
    http: number;
    https: number;
  };
  ssl: {
    keyPath: string;
    certPath: string;
  };
  paths: {
    frontend: string;
  };
  cache: {
    duration: number;
  };
  socketIo: {
    pingTimeout: number;
    pingInterval: number;
    transports: string[];
  };
}

const config: ServerConfig = {
  debug: process.env.DEBUG === "true" || process.env.NODE_ENV === "development",
  ports: {
    http: Number(process.env.PORT) || 3000,
    https: Number(process.env.HTTPS_PORT) || 3443,
  },
  ssl: {
    keyPath:
      process.env.SSL_KEY_PATH ||
      "/Users/priyanshurohilla/certs/localvc/192.168.2.101-key.pem",
    certPath:
      process.env.SSL_CERT_PATH ||
      "/Users/priyanshurohilla/certs/localvc/192.168.2.101.pem",
  },
  paths: {
    frontend: path.join(__dirname, "..", "..", "frontend", "dist"),
  },
  cache: {
    duration: 24 * 60 * 60 * 1000, // 24 hours
  },
  socketIo: {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  },
};

// ========================================
// TYPES & INTERFACES
// ========================================

interface SSLOptions {
  key: Buffer;
  cert: Buffer;
}

interface CacheEntry {
  data: Buffer;
  etag: string;
  timestamp: number;
}

interface NetworkInterface {
  name: string;
  address: string;
  family: string;
  internal: boolean;
}

// ========================================
// GLOBAL STATE
// ========================================

const fileCache = new Map<string, CacheEntry>();
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

// ========================================
// UTILITY FUNCTIONS
// ========================================

function log(category: string, message: string, ...args: any[]): void {
  if (config.debug) {
    console.log(`[${category}] ${message}`, ...args);
  }
}

function logError(category: string, message: string, error?: any): void {
  console.error(`[${category}] ❌ ${message}`, error || "");
}

function logSuccess(category: string, message: string): void {
  console.log(`[${category}] ✅ ${message}`);
}

function logInfo(category: string, message: string): void {
  console.log(`[${category}] ℹ️  ${message}`);
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

function getNetworkInterfaces(): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const result: NetworkInterface[] = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const config of iface) {
      if (config.family === "IPv4") {
        result.push({
          name,
          address: config.address,
          family: config.family,
          internal: config.internal,
        });
      }
    }
  }

  return result;
}

function getExternalIP(): string {
  const interfaces = getNetworkInterfaces();

  for (const iface of interfaces) {
    if (
      !iface.internal &&
      (iface.address.startsWith("192.") ||
        iface.address.startsWith("172.") ||
        iface.address.startsWith("10."))
    ) {
      return iface.address;
    }
  }

  return "localhost";
}

function displayNetworkInfo(): void {
  const interfaces = getNetworkInterfaces();

  logInfo("NETWORK", "Available network interfaces:");

  interfaces.forEach((iface) => {
    const type = iface.internal ? "internal" : "external";
    log("NETWORK", `  ${iface.name}: ${iface.address} (${type})`);
  });
}

// ========================================
// SSL CONFIGURATION
// ========================================

function loadSSLCertificates(): SSLOptions | null {
  try {
    log("SSL", `Loading certificates from:`);
    log("SSL", `  Key:  ${config.ssl.keyPath}`);
    log("SSL", `  Cert: ${config.ssl.certPath}`);

    if (!fs.existsSync(config.ssl.keyPath)) {
      throw new Error(`SSL key file not found: ${config.ssl.keyPath}`);
    }

    if (!fs.existsSync(config.ssl.certPath)) {
      throw new Error(`SSL cert file not found: ${config.ssl.certPath}`);
    }

    const sslOptions: SSLOptions = {
      key: fs.readFileSync(config.ssl.keyPath),
      cert: fs.readFileSync(config.ssl.certPath),
    };

    logSuccess("SSL", "Certificates loaded successfully");
    return sslOptions;
  } catch (error) {
    logError("SSL", "Failed to load certificates", (error as Error).message);
    logInfo("SSL", "Falling back to HTTP server");
    return null;
  }
}

// ========================================
// FILE SERVING
// ========================================

function serveFile(req: http.IncomingMessage, res: http.ServerResponse): void {
  let requestPath = req.url === "/" ? "/index.html" : req.url || "/index.html";
  requestPath = requestPath.split("?")[0]; // Remove query parameters

  const filePath = path.join(config.paths.frontend, requestPath);
  const contentType = getMimeType(requestPath);

  // Log request details
  log("REQUEST", `${req.method} ${req.url} -> ${requestPath}`);
  log("REQUEST", `Client: ${req.socket.remoteAddress}`);
  log("REQUEST", `User-Agent: ${req.headers["user-agent"] || "unknown"}`);

  // Check cache first
  const cached = fileCache.get(filePath);
  if (cached && Date.now() - cached.timestamp < config.cache.duration) {
    log("CACHE", `Serving cached file: ${requestPath}`);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      ETag: cached.etag,
    });
    res.end(cached.data);
    return;
  }

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found, try serving index.html for SPA routing
      log("FILE", `File not found: ${filePath}, serving index.html`);
      serveIndexForSPA(res);
      return;
    }

    // Cache the file
    const etag = `"${data.length}-${Date.now()}"`;
    fileCache.set(filePath, {
      data,
      etag,
      timestamp: Date.now(),
    });

    log("FILE", `Serving file: ${requestPath} (${data.length} bytes)`);

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

function serveIndexForSPA(res: http.ServerResponse): void {
  const indexPath = path.join(config.paths.frontend, "index.html");

  fs.readFile(indexPath, (err, data) => {
    if (err) {
      logError("FILE", `Index file not found: ${indexPath}`);
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    } else {
      log("FILE", "Serving index.html for SPA routing");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    }
  });
}

// ========================================
// REQUEST HANDLING
// ========================================

function requestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    log("CORS", "Handling OPTIONS preflight request");
    res.writeHead(200);
    res.end();
    return;
  }

  serveFile(req, res);
}

// ========================================
// SOCKET.IO SETUP
// ========================================

function setupSocketIO(server: http.Server | https.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: config.socketIo.transports as any,
    allowEIO3: true,
    pingTimeout: config.socketIo.pingTimeout,
    pingInterval: config.socketIo.pingInterval,
  });

  // Connection error handling
  io.engine.on("connection_error", (err) => {
    logError("SOCKET.IO", "Connection error:");
    logError("SOCKET.IO", `  Request: ${err.req?.url}`);
    logError("SOCKET.IO", `  Code: ${err.code}`);
    logError("SOCKET.IO", `  Message: ${err.message}`);
    if (err.context) {
      logError("SOCKET.IO", `  Context: ${JSON.stringify(err.context)}`);
    }
  });

  // Connection handling
  io.on("connection", (socket) => {
    logSuccess("SOCKET.IO", `Client connected: ${socket.id}`);
    log("SOCKET.IO", `Transport: ${socket.conn.transport.name}`);
    log("SOCKET.IO", `Remote address: ${socket.conn.remoteAddress}`);
    log("SOCKET.IO", `Headers: ${JSON.stringify(socket.handshake.headers)}`);

    socket.on("disconnect", (reason) => {
      logInfo("SOCKET.IO", `Client disconnected: ${socket.id}`);
      log("SOCKET.IO", `Disconnect reason: ${reason}`);
    });

    socket.conn.on("upgrade", () => {
      logInfo(
        "SOCKET.IO",
        `Transport upgraded to: ${socket.conn.transport.name}`,
      );
    });

    socket.on("error", (error) => {
      logError("SOCKET.IO", `Socket error for ${socket.id}:`, error);
    });
  });

  setupSocket(io);
  return io;
}

// ========================================
// SERVER SETUP
// ========================================

function createServer(
  sslOptions: SSLOptions | null,
): http.Server | https.Server {
  const server = sslOptions
    ? https.createServer(sslOptions, requestHandler)
    : http.createServer(requestHandler);

  // Server error handling
  server.on("error", (error: any) => {
    logError("SERVER", "Server error:", error);

    if (error.code === "EADDRINUSE") {
      logError("SERVER", `Port ${error.port} is already in use`);
    } else if (error.code === "EACCES") {
      logError("SERVER", `Permission denied to bind to port ${error.port}`);
    }
  });

  server.on("clientError", (err, socket) => {
    logError("CLIENT", `Client error: ${err.message}`);
    if (socket.writable) {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    }
  });

  return server;
}

// ========================================
// CACHE MANAGEMENT
// ========================================

function startCacheCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of fileCache.entries()) {
      if (now - value.timestamp > config.cache.duration) {
        fileCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log("CACHE", `Cleaned ${cleaned} expired cache entries`);
    }
  }, config.cache.duration);
}

// ========================================
// STARTUP VALIDATION
// ========================================

function validateEnvironment(): boolean {
  const indexPath = path.join(config.paths.frontend, "index.html");

  if (fs.existsSync(indexPath)) {
    logSuccess("ENV", "Frontend index.html found");
    return true;
  } else {
    logError("ENV", `Frontend index.html NOT FOUND at: ${indexPath}`);
    return false;
  }
}

function displayStartupInfo(
  server: http.Server | https.Server,
  sslOptions: SSLOptions | null,
): void {
  const serverPort = sslOptions ? config.ports.https : config.ports.http;
  const protocol = sslOptions ? "https" : "http";
  const externalIP = getExternalIP();

  console.log(
    `\n🚀 ${sslOptions ? "HTTPS" : "HTTP"} server started successfully!`,
  );
  console.log(`📁 Serving frontend from: ${config.paths.frontend}`);
  console.log(`🔌 Socket.IO ready`);
  console.log(`\n📍 Server accessible at:`);
  console.log(`   Local:   ${protocol}://localhost:${serverPort}`);
  console.log(`   Network: ${protocol}://${externalIP}:${serverPort}`);
  console.log(`\n🔍 Debug mode: ${config.debug ? "ON" : "OFF"}`);
  console.log(`⚡ Transport modes: ${config.socketIo.transports.join(", ")}`);
  console.log(`🌐 CORS: enabled for all origins`);
  console.log(`⏱️  Ping timeout: ${config.socketIo.pingTimeout}ms`);
  console.log(
    `📊 Cache duration: ${config.cache.duration / 1000 / 60} minutes`,
  );
}

// ========================================
// ERROR HANDLING
// ========================================

function setupGlobalErrorHandlers(): void {
  process.on("uncaughtException", (error) => {
    logError("PROCESS", "Uncaught exception:", error);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logError("PROCESS", "Unhandled rejection:", reason);
  });
}

function setupGracefulShutdown(server: http.Server | https.Server): void {
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down gracefully...");
    server.close(() => {
      logSuccess("SERVER", "Server closed");
      process.exit(0);
    });
  });
}

// ========================================
// MAIN APPLICATION
// ========================================

function startServer(): { server: http.Server | https.Server; io: Server } {
  logInfo("STARTUP", "Starting LocalVC server...");

  // Display system information
  if (config.debug) {
    displayNetworkInfo();
  }

  // Validate environment
  if (!validateEnvironment()) {
    logError("STARTUP", "Environment validation failed");
    process.exit(1);
  }

  // Load SSL certificates
  const sslOptions = loadSSLCertificates();

  // Create server
  const server = createServer(sslOptions);

  // Setup Socket.IO
  const io = setupSocketIO(server);

  // Setup cache cleanup
  startCacheCleanup();

  // Setup error handlers
  setupGlobalErrorHandlers();
  setupGracefulShutdown(server);

  // Start listening
  const serverPort = sslOptions ? config.ports.https : config.ports.http;

  server.listen(serverPort, "0.0.0.0", () => {
    displayStartupInfo(server, sslOptions);
  });

  // Return for external use
  return { server, io };
}

// ========================================
// ENTRY POINT
// ========================================

const { server, io } = startServer();

export { io, server };
