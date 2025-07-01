# LocalVC Server Configuration Guide

## Overview

This guide explains how to configure and run the LocalVC server with proper network connectivity, SSL certificates, and debugging capabilities.

## Quick Start

### 1. Environment Setup

Create a `.env` file in the server directory:

```bash
# Basic Configuration
DEBUG=true
NODE_ENV=development

# Server Ports
PORT=3000
HTTPS_PORT=3443

# SSL Configuration (update paths to match your setup)
SSL_KEY_PATH=/path/to/your/ssl-key.pem
SSL_CERT_PATH=/path/to/your/ssl-cert.pem

# Frontend Path (relative to server root)
FRONTEND_PATH=../frontend/dist
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build and Start

```bash
npm run build
npm run start
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `false` | Enable verbose logging |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | HTTP port |
| `HTTPS_PORT` | `3443` | HTTPS port |
| `SSL_KEY_PATH` | Required | Path to SSL private key |
| `SSL_CERT_PATH` | Required | Path to SSL certificate |
| `FRONTEND_PATH` | `../frontend/dist` | Frontend build directory |

### SSL Configuration

The server requires SSL certificates for HTTPS. You have several options:

#### Option 1: Self-Signed Certificates (Development)

```bash
# Create certificates directory
mkdir -p ~/certs/localvc

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout ~/certs/localvc/key.pem -out ~/certs/localvc/cert.pem -days 365 -nodes

# Update .env file
SSL_KEY_PATH=~/certs/localvc/key.pem
SSL_CERT_PATH=~/certs/localvc/cert.pem
```

#### Option 2: mkcert (Recommended for Local Development)

```bash
# Install mkcert
brew install mkcert  # macOS
# or
apt install mkcert   # Ubuntu/Debian

# Setup local CA
mkcert -install

# Generate certificates for your local IP
mkcert localhost 192.168.1.100  # Replace with your actual IP

# Move certificates to appropriate location
mkdir -p ~/certs/localvc
mv localhost+1.pem ~/certs/localvc/cert.pem
mv localhost+1-key.pem ~/certs/localvc/key.pem
```

#### Option 3: Production Certificates

For production use, obtain certificates from a Certificate Authority like Let's Encrypt.

### Network Configuration

#### Finding Your Network IP

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use the built-in network debugging
node debug-network.js
```

#### Firewall Configuration

Ensure your firewall allows connections on the configured ports:

```bash
# macOS
sudo pfctl -f /etc/pf.conf

# Ubuntu/Debian
sudo ufw allow 3000
sudo ufw allow 3443

# Windows
netsh advfirewall firewall add rule name="LocalVC HTTP" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="LocalVC HTTPS" dir=in action=allow protocol=TCP localport=3443
```

## Debugging

### Enable Debug Mode

Set `DEBUG=true` in your `.env` file to enable verbose logging:

```bash
DEBUG=true
```

### Network Debugging Tool

Run the network debugging tool to test connectivity:

```bash
node debug-network.js
```

This tool will test:
- Network interface discovery
- DNS resolution
- HTTP/HTTPS connectivity
- Socket.IO connections
- Both localhost and network IP access

### Common Debug Scenarios

#### 1. Works on localhost but not on network

**Symptoms:**
- `https://localhost:3443` works
- `https://192.168.1.100:3443` fails

**Solutions:**
- Check firewall settings
- Ensure server is binding to `0.0.0.0` (default)
- Verify SSL certificate includes your IP address

#### 2. HTTP fails but HTTPS works

**Symptoms:**
- `https://localhost:3443` works
- `http://localhost:3000` fails

**Solutions:**
- This is normal behavior when SSL certificates are configured
- The server prioritizes HTTPS when certificates are available
- Use HTTPS URLs for all connections

#### 3. Works with internet but not on LAN-only

**Symptoms:**
- Works when devices have internet access
- Fails on LAN without internet

**Solutions:**
- Ensure using IP addresses instead of hostnames
- Disable certificate validation in development
- Use self-signed certificates properly configured

## Server Architecture

### File Structure

```
server/
├── src/
│   ├── index.ts          # Main server file
│   ├── socket/
│   │   ├── socket.ts     # Socket.IO handlers
│   │   ├── event.ts      # Event types
│   │   └── schemas.ts    # Validation schemas
│   └── services/         # Business logic
├── dist/                 # Compiled output
├── .env                  # Environment configuration
├── debug-network.js      # Network debugging tool
└── CONFIG.md            # This file
```

### Configuration Object

The server uses a centralized configuration object:

```typescript
interface ServerConfig {
  debug: boolean;
  ports: { http: number; https: number; };
  ssl: { keyPath: string; certPath: string; };
  paths: { frontend: string; };
  cache: { duration: number; };
  socketIo: {
    pingTimeout: number;
    pingInterval: number;
    transports: string[];
  };
}
```

## Troubleshooting

### Common Issues

#### "EADDRINUSE" Error

**Problem:** Port already in use

**Solution:**
```bash
# Find process using the port
lsof -i :3443

# Kill the process
kill -9 <PID>
```

#### "EACCES" Error

**Problem:** Permission denied

**Solution:**
```bash
# Use ports > 1024 or run with elevated privileges
sudo npm run start
```

#### SSL Certificate Errors

**Problem:** Certificate validation failures

**Solutions:**
- Ensure certificate paths are correct
- Verify certificate includes all required domains/IPs
- Check certificate is not expired
- For development, use self-signed certificates

#### Frontend Not Found

**Problem:** 404 errors for frontend assets

**Solution:**
- Verify `FRONTEND_PATH` points to correct directory
- Ensure frontend is built (`npm run build` in frontend directory)
- Check file permissions

### Performance Tuning

#### Cache Configuration

```bash
# Adjust cache duration (in milliseconds)
CACHE_DURATION=86400000  # 24 hours
```

#### Socket.IO Tuning

```bash
# Adjust ping settings for better reliability
SOCKET_IO_PING_TIMEOUT=60000
SOCKET_IO_PING_INTERVAL=25000
```

## Security Considerations

### Development vs Production

**Development:**
- Use self-signed certificates
- Enable debug logging
- Allow all CORS origins

**Production:**
- Use valid SSL certificates
- Disable debug logging
- Restrict CORS origins
- Enable rate limiting
- Use environment-specific configurations

### CORS Configuration

The server allows all origins by default. For production, restrict this:

```typescript
// In production, replace "*" with specific origins
cors: {
  origin: ["https://yourdomain.com", "https://www.yourdomain.com"],
  methods: ["GET", "POST"]
}
```

## Support

If you encounter issues:

1. Run `node debug-network.js` to diagnose connectivity
2. Check server logs with `DEBUG=true`
3. Verify SSL certificate configuration
4. Test with both localhost and network IP addresses
5. Check firewall and network settings

## Example Configurations

### Development (.env.development)

```bash
DEBUG=true
NODE_ENV=development
PORT=3000
HTTPS_PORT=3443
SSL_KEY_PATH=~/certs/localvc/key.pem
SSL_CERT_PATH=~/certs/localvc/cert.pem
FRONTEND_PATH=../frontend/dist
```

### Production (.env.production)

```bash
DEBUG=false
NODE_ENV=production
PORT=80
HTTPS_PORT=443
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_CERT_PATH=/etc/ssl/certs/server.crt
FRONTEND_PATH=./frontend/dist
```
