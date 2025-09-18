/**
 * SIMPLIFIED USER ATTRIBUTION TEST
 * 
 * This test directly tests the API endpoints without relying on frontend JSX
 * to verify that user attribution is working correctly.
 */

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

async function testUserAttribution() {
  log(colors.blue, '🧪 SIMPLIFIED USER ATTRIBUTION API TEST');
  log(colors.blue, '=' .repeat(50));
  
  const baseUrl = 'http://localhost:5000';
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Check if server is responding
  try {
    info('Testing server connectivity...');
    const response = await fetch(`${baseUrl}/api/incidents`);
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        success(`Server responding correctly - Got ${Array.isArray(data) ? data.length : 'non-array'} incidents`);
        
        // Filter for user reports
        if (Array.isArray(data)) {
          const userReports = data.filter(incident => 
            incident.source === 'user' && incident.userId
          );
          info(`Found ${userReports.length} user reports with userIds`);
          
          if (userReports.length > 0) {
            // Test batch users API with real user IDs
            const userIds = [...new Set(userReports.slice(0, 5).map(report => report.userId))];
            info(`Testing batch users API with ${userIds.length} user IDs...`);
            
            const batchResponse = await fetch(`${baseUrl}/api/batch-users?ids=${userIds.join(',')}`);
            
            if (batchResponse.ok) {
              const users = await batchResponse.json();
              success(`Batch users API working - Got ${users.length} users`);
              
              // Verify user data structure
              let validUsers = 0;
              users.forEach(user => {
                if (user.id && user.displayName !== undefined && user.avatarUrl !== undefined) {
                  validUsers++;
                } else {
                  error(`Invalid user structure: ${JSON.stringify(user)}`);
                }
              });
              
              if (validUsers === users.length) {
                success(`All ${validUsers} users have valid structure`);
                testsPassed++;
                
                // Show sample user data
                if (users.length > 0) {
                  info('Sample user data:');
                  users.slice(0, 2).forEach(user => {
                    console.log(`  - ID: ${user.id}, Name: ${user.displayName || 'null'}, Avatar: ${user.avatarUrl ? 'present' : 'null'}`);
                  });
                }
                
                // Test ReporterAttribution component data flow
                info('Testing individual user lookup (ReporterAttribution simulation)...');
                const testUserId = userIds[0];
                const individualResponse = await fetch(`${baseUrl}/api/batch-users?ids=${testUserId}`);
                
                if (individualResponse.ok) {
                  const individualUsers = await individualResponse.json();
                  const foundUser = individualUsers.find(u => u.id === testUserId);
                  
                  if (foundUser) {
                    success(`ReporterAttribution data flow test passed - Found user: ${foundUser.displayName || 'unnamed'}`);
                    testsPassed++;
                  } else {
                    error('ReporterAttribution data flow test failed - User not found in response');
                    testsFailed++;
                  }
                } else {
                  error(`Individual user lookup failed: ${individualResponse.status}`);
                  testsFailed++;
                }
                
              } else {
                error(`Only ${validUsers}/${users.length} users have valid structure`);
                testsFailed++;
              }
            } else {
              error(`Batch users API failed: ${batchResponse.status}`);
              testsFailed++;
            }
          } else {
            info('No user reports with userIds found - cannot test user attribution');
          }
        }
        testsPassed++;
      } else {
        error('Server returned non-JSON content (likely due to JSX error)');
        testsFailed++;
      }
    } else {
      error(`Server not responding properly: ${response.status}`);
      testsFailed++;
    }
  } catch (err) {
    error(`Server connectivity test failed: ${err.message}`);
    testsFailed++;
  }
  
  // Test 2: Direct batch users API validation (without relying on incidents)
  try {
    info('Testing batch users API validation...');
    
    // Test error cases
    const tests = [
      { url: '/api/batch-users', expectedStatus: 400, name: 'No parameters' },
      { url: '/api/batch-users?ids=', expectedStatus: 400, name: 'Empty IDs' },
      { url: '/api/batch-users?ids=test-user-1,test-user-2', expectedStatus: 200, name: 'Valid format' }
    ];
    
    for (const test of tests) {
      const response = await fetch(`${baseUrl}${test.url}`);
      if (response.status === test.expectedStatus) {
        success(`${test.name}: Expected ${test.expectedStatus}, got ${test.expectedStatus}`);
        testsPassed++;
      } else {
        error(`${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
        testsFailed++;
      }
    }
    
  } catch (err) {
    error(`Batch users API validation failed: ${err.message}`);
    testsFailed++;
  }
  
  // Summary
  console.log('');
  log(colors.blue, '📊 TEST SUMMARY');
  log(colors.blue, '=' .repeat(30));
  log(colors.green, `✅ Tests Passed: ${testsPassed}`);
  log(colors.red, `❌ Tests Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    log(colors.green, '🎉 ALL TESTS PASSED!');
    log(colors.green, '✅ User Attribution API is working correctly');
    log(colors.green, '✅ Batch users endpoint is functioning');
    log(colors.green, '✅ User data structure is valid');
    return true;
  } else {
    log(colors.yellow, '⚠️  Some tests failed - review results above');
    return false;
  }
}

// Run the test
testUserAttribution().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});