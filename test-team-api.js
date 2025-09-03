// Test script for Team Collaboration API endpoints
// Run this after starting the development server

const BASE_URL = 'http://localhost:3001/api';

async function testTeamAPI() {
  console.log('🧪 Testing Team Collaboration API...\n');

  try {
    // Test 1: Get teams (should return 401 if not authenticated)
    console.log('1️⃣ Testing GET /api/teams (unauthenticated)...');
    const teamsResponse = await fetch(`${BASE_URL}/teams`);
    console.log(`   Status: ${teamsResponse.status}`);
    console.log(`   Expected: 401 (Unauthorized)`);
    console.log(`   Actual: ${teamsResponse.status === 401 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 2: Create team (should return 401 if not authenticated)
    console.log('2️⃣ Testing POST /api/teams (unauthenticated)...');
    const createTeamResponse = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Team',
        description: 'A test team for API testing'
      })
    });
    console.log(`   Status: ${createTeamResponse.status}`);
    console.log(`   Expected: 401 (Unauthorized)`);
    console.log(`   Actual: ${createTeamResponse.status === 401 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 3: Get specific team (should return 401 if not authenticated)
    console.log('3️⃣ Testing GET /api/teams/test-id (unauthenticated)...');
    const teamResponse = await fetch(`${BASE_URL}/teams/test-id`);
    console.log(`   Status: ${teamResponse.status}`);
    console.log(`   Expected: 401 (Unauthorized)`);
    console.log(`   Actual: ${teamResponse.status === 401 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 4: Update team (should return 401 if not authenticated)
    console.log('4️⃣ Testing PUT /api/teams/test-id (unauthenticated)...');
    const updateTeamResponse = await fetch(`${BASE_URL}/teams/test-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Updated Test Team'
      })
    });
    console.log(`   Status: ${updateTeamResponse.status}`);
    console.log(`   Expected: 401 (Unauthorized)`);
    console.log(`   Actual: ${updateTeamResponse.status === 401 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 5: Delete team (should return 401 if not authenticated)
    console.log('5️⃣ Testing DELETE /api/teams/test-id (unauthenticated)...');
    const deleteTeamResponse = await fetch(`${BASE_URL}/teams/test-id`, {
      method: 'DELETE'
    });
    console.log(`   Status: ${deleteTeamResponse.status}`);
    console.log(`   Expected: 401 (Unauthorized)`);
    console.log(`   Actual: ${deleteTeamResponse.status === 401 ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('✅ All unauthenticated tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Log in to the application at http://localhost:3001');
    console.log('2. Open browser dev tools and go to Network tab');
    console.log('3. Try creating a team through the UI');
    console.log('4. Check the API calls in the Network tab');
    console.log('5. Verify the responses match expected behavior');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testTeamAPI();
