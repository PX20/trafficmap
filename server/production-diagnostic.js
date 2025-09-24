#!/usr/bin/env node

/**
 * Production Deployment Diagnostic Tool
 * Run this to identify potential production deployment issues
 */

console.log('🔍 QLD Safety Monitor - Production Deployment Diagnostic\n');

// Check Node.js version
console.log(`📦 Node.js Version: ${process.version}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Critical Environment Variables Check
console.log('🔑 Environment Variables Check:');
const requiredVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'SESSION_SECRET': process.env.SESSION_SECRET,
  'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
  'PORT': process.env.PORT
};

const optionalVars = {
  'VAPID_PRIVATE_KEY': process.env.VAPID_PRIVATE_KEY,
  'VAPID_PUBLIC_KEY': process.env.VAPID_PUBLIC_KEY
};

let hasErrors = false;

Object.entries(requiredVars).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✅ ${key}: configured`);
  } else {
    console.log(`  ❌ ${key}: MISSING (REQUIRED)`);
    hasErrors = true;
  }
});

Object.entries(optionalVars).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✅ ${key}: configured`);
  } else {
    console.log(`  ⚠️  ${key}: missing (optional)`);
  }
});

// Database Connection Test
console.log('\n🗄️  Database Connection Test:');
if (process.env.DATABASE_URL) {
  try {
    // Basic URL parsing test
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log(`  ✅ Database URL format: valid`);
    console.log(`  📍 Host: ${dbUrl.hostname}`);
    console.log(`  🔌 Port: ${dbUrl.port || '5432'}`);
    console.log(`  🏷️  Database: ${dbUrl.pathname.slice(1)}`);
  } catch (error) {
    console.log(`  ❌ Database URL format: invalid - ${error.message}`);
    hasErrors = true;
  }
} else {
  console.log('  ❌ DATABASE_URL not set');
  hasErrors = true;
}

// HTTPS Requirements Check
console.log('\n🔒 HTTPS Requirements:');
if (process.env.NODE_ENV === 'production') {
  console.log('  ⚡ Production mode detected');
  console.log('  🔐 Secure cookies: ENABLED (requires HTTPS)');
  console.log('  🌐 Trust proxy: ENABLED (for reverse proxy)');
  console.log('  📝 Session store: PostgreSQL (persistent)');
} else {
  console.log('  🔧 Development mode detected');
  console.log('  🔓 Secure cookies: DISABLED (HTTP allowed)');
  console.log('  💾 Session store: Memory (temporary)');
}

// Port Configuration
console.log('\n🚀 Server Configuration:');
const port = process.env.PORT || 5000;
console.log(`  📡 Port: ${port}`);
console.log(`  🌐 Bind: 0.0.0.0:${port} (frontend must bind to this port)`);

// File System Check
console.log('\n📁 File System Check:');
const fs = require('fs');
const path = require('path');

const criticalPaths = [
  'dist/public/index.html',
  'server/index.ts',
  'package.json'
];

criticalPaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${filePath}: exists`);
  } else {
    console.log(`  ❌ ${filePath}: missing`);
    if (filePath.includes('dist/public')) {
      console.log(`     💡 Run 'npm run build' to generate production assets`);
    }
  }
});

// Summary
console.log('\n📋 Summary:');
if (hasErrors) {
  console.log('❌ DEPLOYMENT ISSUES DETECTED');
  console.log('\n🔧 Required Actions:');
  console.log('1. Set missing environment variables in your deployment platform');
  console.log('2. Ensure HTTPS is properly configured for production');
  console.log('3. Verify database connectivity from production environment');
  console.log('4. Run "npm run build" to generate production assets');
} else {
  console.log('✅ Configuration looks good for production deployment');
}

console.log('\n📚 Need help? Check deployment documentation for your platform:');
console.log('- Railway: https://docs.railway.app');
console.log('- Vercel: https://vercel.com/docs');
console.log('- Render: https://render.com/docs');
console.log('- Heroku: https://devcenter.heroku.com');