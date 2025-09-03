// Test to verify the simplified schema can be applied
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for schema changes

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchemaApplication() {
  console.log('🔍 Testing schema application...\n');

  try {
    // Read the simplified schema file
    const schemaPath = path.join(__dirname, 'scripts', '007_create_team_schema_simple.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('1️⃣ Applying simplified schema...');
    
    // Split the SQL into individual statements and execute them
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.log(`   ⚠️ Statement ${i + 1} had an issue: ${error.message}`);
          }
        } catch (err) {
          console.log(`   ⚠️ Statement ${i + 1} failed: ${err.message}`);
        }
      }
    }

    console.log('   ✅ Schema application completed\n');

    // Test 2: Verify tables exist
    console.log('2️⃣ Verifying tables exist...');
    
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
    console.log('1. If tables exist, test the API endpoints');
    console.log('2. Run: node test-team-api.js');
    console.log('3. Check if API returns proper responses');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSchemaApplication();
