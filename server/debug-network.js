#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { io: ioClient } = require('socket.io-client');
const os = require('os');
const dns = require('dns');

// Configuration
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;
const TIMEOUT = 5000;

console.log('🔍 Network Debugging Tool for LocalVC Server\n');

// Get all network interfaces
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const result = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        result.push({
          name,
          address: config.address,
          isPrivate: config.address.startsWith('192.') ||
                    config.address.startsWith('172.') ||
                    config.address.startsWith('10.')
        });
      }
    }
  }

  return result;
}

// Test HTTP connection
function testHTTP(host, port) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: '/',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      resolve({
        success: true,
        status: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Connection timeout',
        code: 'TIMEOUT'
      });
    });

    req.end();
  });
}

// Test HTTPS connection
function testHTTPS(host, port) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: '/',
      method: 'GET',
      timeout: TIMEOUT,
      rejectUnauthorized: false // Ignore self-signed cert errors
    };

    const req = https.request(options, (res) => {
      resolve({
        success: true,
        status: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Connection timeout',
        code: 'TIMEOUT'
      });
    });

    req.end();
  });
}

// Test Socket.IO connection
function testSocketIO(url) {
  return new Promise((resolve) => {
    const socket = ioClient(url, {
      timeout: TIMEOUT,
      transports: ['websocket', 'polling'],
      rejectUnauthorized: false
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      resolve({
        success: false,
        error: 'Connection timeout',
        code: 'TIMEOUT'
      });
    }, TIMEOUT);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve({
        success: true,
        transport: socket.io.engine.transport.name
      });
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      resolve({
        success: false,
        error: error.message,
        code: error.code || 'CONNECT_ERROR'
      });
    });
  });
}

// Test DNS resolution
function testDNS(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address, family) => {
      if (err) {
        resolve({
          success: false,
          error: err.message,
          code: err.code
        });
      } else {
        resolve({
          success: true,
          address,
          family
        });
      }
    });
  });
}

// Format test result
function formatResult(result) {
  if (result.success) {
    return `✅ SUCCESS${result.status ? ` (${result.status})` : ''}${result.transport ? ` [${result.transport}]` : ''}`;
  } else {
    return `❌ FAILED: ${result.error} ${result.code ? `(${result.code})` : ''}`;
  }
}

// Main debugging function
async function runDebug() {
  console.log('📡 Network Interfaces:');
  const interfaces = getNetworkInterfaces();

  if (interfaces.length === 0) {
    console.log('❌ No external network interfaces found!');
    return;
  }

  interfaces.forEach(iface => {
    console.log(`   ${iface.name}: ${iface.address} ${iface.isPrivate ? '(Private)' : '(Public)'}`);
  });

  console.log('\n🌐 Testing DNS Resolution:');
  const dnsTests = ['localhost', 'google.com'];
  for (const hostname of dnsTests) {
    const result = await testDNS(hostname);
    console.log(`   ${hostname}: ${formatResult(result)}`);
  }

  console.log('\n🔗 Testing HTTP Connections:');

  // Test localhost
  console.log('\n   Localhost Tests:');
  let httpResult = await testHTTP('localhost', HTTP_PORT);
  console.log(`     HTTP  (localhost:${HTTP_PORT}): ${formatResult(httpResult)}`);

  let httpsResult = await testHTTPS('localhost', HTTPS_PORT);
  console.log(`     HTTPS (localhost:${HTTPS_PORT}): ${formatResult(httpsResult)}`);

  // Test each network interface
  for (const iface of interfaces) {
    console.log(`\n   ${iface.name} (${iface.address}) Tests:`);

    httpResult = await testHTTP(iface.address, HTTP_PORT);
    console.log(`     HTTP  (${iface.address}:${HTTP_PORT}): ${formatResult(httpResult)}`);

    httpsResult = await testHTTPS(iface.address, HTTPS_PORT);
    console.log(`     HTTPS (${iface.address}:${HTTPS_PORT}): ${formatResult(httpsResult)}`);
  }

  console.log('\n🔌 Testing Socket.IO Connections:');

  // Test localhost Socket.IO
  console.log('\n   Localhost Socket.IO Tests:');
  let socketResult = await testSocketIO(`http://localhost:${HTTP_PORT}`);
  console.log(`     HTTP  (localhost:${HTTP_PORT}): ${formatResult(socketResult)}`);

  socketResult = await testSocketIO(`https://localhost:${HTTPS_PORT}`);
  console.log(`     HTTPS (localhost:${HTTPS_PORT}): ${formatResult(socketResult)}`);

  // Test each network interface Socket.IO
  for (const iface of interfaces) {
    console.log(`\n   ${iface.name} (${iface.address}) Socket.IO Tests:`);

    socketResult = await testSocketIO(`http://${iface.address}:${HTTP_PORT}`);
    console.log(`     HTTP  (${iface.address}:${HTTP_PORT}): ${formatResult(socketResult)}`);

    socketResult = await testSocketIO(`https://${iface.address}:${HTTPS_PORT}`);
    console.log(`     HTTPS (${iface.address}:${HTTPS_PORT}): ${formatResult(socketResult)}`);
  }

  console.log('\n📊 Summary:');
  console.log('   - If localhost works but network IPs don\'t: Check firewall settings');
  console.log('   - If HTTP works but HTTPS doesn\'t: Check SSL certificate configuration');
  console.log('   - If basic HTTP works but Socket.IO doesn\'t: Check Socket.IO transport settings');
  console.log('   - If DNS resolution fails: Check internet connectivity and DNS settings');
  console.log('   - If only localhost works: Server might not be binding to 0.0.0.0');

  console.log('\n💡 Next Steps:');
  console.log('   1. Run this test from the same device as the server');
  console.log('   2. Run this test from a different device on the same LAN');
  console.log('   3. Compare results to identify where the connection fails');
  console.log('   4. Check server logs for corresponding connection attempts');
}

// Run the debug tool
console.log('Starting network diagnostics...\n');
runDebug().catch(error => {
  console.error('❌ Debug tool failed:', error);
  process.exit(1);
});
