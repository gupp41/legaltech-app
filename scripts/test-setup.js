#!/usr/bin/env node

// Simple test script to verify environment configuration
console.log('🔍 Checking LegalTech App Configuration...\n');

// Check for required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'BLOB_READ_WRITE_TOKEN',
  'GROK_API_KEY'
];

console.log('📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n📁 Database Schema Files:');
const fs = require('fs');
const path = require('path');

const schemaFiles = [
  'scripts/001_create_database_schema.sql',
  'scripts/002_add_sharing_table.sql'
];

schemaFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log('\n🚀 Next Steps:');
console.log('1. Create .env.local file with your credentials');
console.log('2. Run database schema scripts in Supabase');
console.log('3. Start the development server: pnpm dev');
console.log('4. Visit http://localhost:3000 to test the app');

console.log('\n📚 For detailed setup instructions, see SETUP.md');
