// Test database connection and table existence
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1️⃣ Testing Supabase connection...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
      return;
    }
    
    console.log('   ✅ Supabase connection successful\n');

    // Test 2: Check if team tables exist
    console.log('2️⃣ Checking if team tables exist...');
    
    const tables = ['teams', 'team_members', 'team_invitations', 'team_document_shares', 'team_usage_tracking'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error) {
          console.log(`   ❌ Table '${table}' does not exist: ${error.message}`);
        } else {
          console.log(`   ✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`   ❌ Error checking table '${table}': ${err.message}`);
      }
    }

    console.log('\n📝 Next Steps:');
    console.log('1. If all tables exist, test the API endpoints');
    console.log('2. Run: node test-team-api.js');
    console.log('3. Check if API returns proper responses');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseConnection();
