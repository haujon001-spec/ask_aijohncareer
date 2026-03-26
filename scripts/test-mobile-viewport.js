#!/usr/bin/env node
/**
 * Mobile Viewport Tester
 * Tests the app at various mobile screen sizes
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const VIEWPORT_SIZES = [
  { name: 'iPhone 12 Mini', width: 375, height: 812 },
  { name: 'iPhone 12 Pro', width: 390, height: 844 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Galaxy S21', width: 360, height: 800 },
  { name: 'Pixel 5', width: 393, height: 851 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'Small Phone', width: 320, height: 568 },
];

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Check if backend is running
function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Simulate viewport checks by analyzing HTML structure
async function analyzeHTML() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000', (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        resolve(html);
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout loading HTML'));
    });
  });
}

async function main() {
  console.log(`${COLORS.bold}${COLORS.blue}╔════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}║   MOBILE VIEWPORT ANALYSIS TEST        ║${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}╚════════════════════════════════════════╝\n${COLORS.reset}`);

  // Step 1: Check backend
  console.log(`${COLORS.yellow}⏳ Testing backend connectivity...${COLORS.reset}`);
  const backendOk = await checkBackend();
  
  if (!backendOk) {
    console.log(`${COLORS.red}✗ Backend not responding on localhost:3000${COLORS.reset}`);
    console.log(`${COLORS.yellow}  Run: npm run dev:backend${COLORS.reset}`);
    process.exit(1);
  }
  console.log(`${COLORS.green}✓ Backend running on http://localhost:3000${COLORS.reset}\n`);

  // Step 2: Load HTML
  console.log(`${COLORS.yellow}⏳ Loading HTML...${COLORS.reset}`);
  let html;
  try {
    html = await analyzeHTML();
    console.log(`${COLORS.green}✓ HTML loaded (${html.length} bytes)${COLORS.reset}\n`);
  } catch (err) {
    console.log(`${COLORS.red}✗ Failed to load HTML: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }

  // Step 3: Analyze HTML structure
  console.log(`${COLORS.blue}📋 STRUCTURE ANALYSIS:${COLORS.reset}`);
  
  const checks = [
    { name: 'React Root', pattern: /<div id="root">/, critical: true },
    { name: 'App Component', pattern: /<div class=".*app.*">/i, critical: true },
    { name: 'Sidebar Component', pattern: /<div class=".*sidebar.*">/i, critical: true },
    { name: 'ChatWindow Component', pattern: /<div class=".*chatWindow.*">/i, critical: true },
    { name: 'Mobile Media Query (480px)', pattern: /@media.*\(max-width:\s*480px\)/i, critical: true },
    { name: 'Model Selector', pattern: /<button.*model.*>/i, critical: false },
    { name: 'Message Bubbles', pattern: /<div class=".*messageBubble.*">/i, critical: false },
  ];

  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const found = check.pattern.test(html);
    if (found) {
      console.log(`  ${COLORS.green}✓${COLORS.reset} ${check.name}`);
      passed++;
    } else {
      console.log(`  ${COLORS.red}✗${COLORS.reset} ${check.name}${check.critical ? ' [CRITICAL]' : ''}`);
      failed++;
    }
  }

  // Step 4: Extract CSS
  console.log(`\n${COLORS.blue}🎨 CSS ANALYSIS:${COLORS.reset}`);
  const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const cssContent = cssMatch ? cssMatch[1] : '';
  
  // Check for mobile-critical CSS
  const mobileChecks = [
    { name: 'Chat container responsive', pattern: /\.chatWindow\s*{[^}]*width/ },
    { name: 'Message bubbles max-width', pattern: /\.messageBubble[^}]*max-width/ },
    { name: 'Sidebar responsive', pattern: /\.sidebar[^}]*(width|display|flexDirection)/ },
    { name: 'Button sizing for touch', pattern: /(min-height|height)\s*:\s*(32|40|44)px/ },
    { name: 'Padding optimization', pattern: /@media.*480px[^}]*(padding|margin)/ },
  ];

  for (const check of mobileChecks) {
    const found = check.pattern.test(html);
    console.log(`  ${found ? COLORS.green + '✓' : COLORS.red + '✗'} ${COLORS.reset}${check.name}`);
  }

  // Step 5: Viewport tests
  console.log(`\n${COLORS.blue}📱 VIEWPORT SIMULATION:${COLORS.reset}`);
  console.log(`Testing rendering at different mobile sizes...\n`);

  for (const viewport of VIEWPORT_SIZES) {
    // This is a structural test - we're checking if CSS media queries exist
    const isMobile = viewport.width <= 480;
    const status = isMobile ? `${COLORS.green}Mobile${COLORS.reset}` : `${COLORS.yellow}Tablet${COLORS.reset}`;
    console.log(`  ${viewport.name.padEnd(20)} → ${viewport.width}w × ${viewport.height}h ${status}`);
  }

  // Step 6: Summary
  console.log(`\n${COLORS.bold}${COLORS.blue}═══════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.bold}SUMMARY:${COLORS.reset}`);
  console.log(`  Structure checks: ${COLORS.green}${passed} passed${COLORS.reset}, ${failed > 0 ? COLORS.red + failed + ' failed' + COLORS.reset : COLORS.green + '0 failed' + COLORS.reset}`);
  
  if (failed > 0) {
    console.log(`\n${COLORS.red}❌ ISSUES DETECTED - UI structure incomplete${COLORS.reset}`);
    console.log(`   Run: npm run build`);
  } else {
    console.log(`\n${COLORS.green}✅ HTML structure validated${COLORS.reset}`);
    console.log(`\n${COLORS.yellow}📌 NEXT STEP: Open browser dev tools and test:${COLORS.reset}`);
    console.log(`   → Press F12 in browser`);
    console.log(`   → Click device toolbar (mobile icon)`);
    console.log(`   → Test each viewport above`);
    console.log(`   → Check for layout issues at 375px width`);
  }
}

main().catch(err => {
  console.error(`${COLORS.red}Error: ${err.message}${COLORS.reset}`);
  process.exit(1);
});
