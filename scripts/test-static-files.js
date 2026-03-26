#!/usr/bin/env node
/**
 * Check what server responds with for each asset
 */
import http from 'http';

const tests = [
  { name: 'HTML', url: 'http://localhost:3000/' },
  { name: 'CSS', url: 'http://localhost:3000/assets/index-fptXrPTz.css' },
  { name: 'JS', url: 'http://localhost:3000/assets/index-Yr7gdOJ7.js' },
  { name: 'Health', url: 'http://localhost:3000/api/health' },
];

async function test(url, name) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode;
        const size = data.length;
        const headers = JSON.stringify(res.headers);
        console.log(`\n[${name}]`);
        console.log(`  Status: ${status}`);
        console.log(`  Size: ${size} bytes`);
        console.log(`  Content-Type: ${res.headers['content-type']}`);
        console.log(`  Preview: ${data.substring(0, 100).replace(/\n/g, '')}`);
        resolve();
      });
    }).on('error', err => {
      console.log(`\n[${name}] ERROR: ${err.message}`);
      resolve();
    });
  });
}

async function main() {
  console.log('Testing Backend Static File Serving\n');
  for (const t of tests) {
    await test(t.url, t.name);
  }
}

main();
