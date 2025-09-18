/**
 * INTEGRATION TESTS: User Attribution in Community Reports
 * 
 * Tests verify that user attribution survives background data refreshes
 * and that the ReporterAttribution component correctly displays user details.
 * 
 * Test Environment: Real endpoints and data during active ingestion cycles
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5000',
  testTimeout: 30000,
  refreshWaitTime: 70000, // Wait for at least one refresh cycle (1-2 minutes)
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

function warning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details) {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    success(`TEST PASSED: ${name}`);
  } else {
    testResults.failed++;
    error(`TEST FAILED: ${name} - ${details}`);
  }
}

// Helper function to make HTTP requests
async function makeRequest(path, options = {}) {
  const url = `${TEST_CONFIG.baseUrl}${path}`;
  const response = await fetch(url, {
    credentials: 'include',
    ...options
  });
  return response;
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TEST 1: Batch Users API Endpoint Functionality
 */
async function testBatchUsersEndpoint() {
  info('Testing /api/batch-users endpoint...');
  
  try {
    // Test with no parameters
    const noParamsResponse = await makeRequest('/api/batch-users');
    recordTest(
      'Batch Users - No Parameters', 
      !noParamsResponse.ok && noParamsResponse.status === 400,
      noParamsResponse.ok ? 'Expected 400 error for missing parameters' : 'Correctly returned 400'
    );

    // Test with invalid parameters
    const invalidResponse = await makeRequest('/api/batch-users?ids=');
    recordTest(
      'Batch Users - Empty IDs', 
      !invalidResponse.ok && invalidResponse.status === 400,
      invalidResponse.ok ? 'Expected 400 error for empty IDs' : 'Correctly returned 400'
    );

    // Test with too many IDs (over limit)
    const tooManyIds = Array.from({length: 101}, (_, i) => `user-${i}`).join(',');
    const tooManyResponse = await makeRequest(`/api/batch-users?ids=${tooManyIds}`);
    recordTest(
      'Batch Users - Too Many IDs', 
      !tooManyResponse.ok && tooManyResponse.status === 400,
      tooManyResponse.ok ? 'Expected 400 error for too many IDs' : 'Correctly returned 400'
    );

    // Test with valid but non-existent user ID
    const nonExistentResponse = await makeRequest('/api/batch-users?ids=non-existent-user-123');
    const nonExistentData = await nonExistentResponse.json();
    recordTest(
      'Batch Users - Non-existent User', 
      nonExistentResponse.ok && Array.isArray(nonExistentData) && nonExistentData.length === 0,
      nonExistentResponse.ok ? 'Correctly returned empty array' : 'Expected 200 with empty array'
    );

    success('Batch Users API endpoint validation tests completed');
  } catch (err) {
    error(`Batch Users API test failed: ${err.message}`);
    recordTest('Batch Users - API Tests', false, err.message);
  }
}

/**
 * TEST 2: Get Current User Reports with User Attribution
 */
async function getCurrentUserReports() {
  info('Fetching current user reports to analyze attribution...');
  
  try {
    // Fetch unified incidents (this is what the frontend uses)
    const incidentsResponse = await makeRequest('/api/incidents');
    if (!incidentsResponse.ok) {
      throw new Error(`Failed to fetch incidents: ${incidentsResponse.status}`);
    }
    
    const incidents = await incidentsResponse.json();
    const userReports = incidents.filter(incident => 
      incident.source === 'user' && incident.userId
    );
    
    info(`Found ${userReports.length} user reports with userIds out of ${incidents.length} total incidents`);
    
    if (userReports.length === 0) {
      warning('No user reports with userIds found - cannot test user attribution');
      return [];
    }
    
    // Get unique user IDs for batch testing
    const userIds = [...new Set(userReports.map(report => report.userId))];
    info(`Found ${userIds.length} unique users in current reports`);
    
    return { userReports, userIds };
  } catch (err) {
    error(`Failed to get current user reports: ${err.message}`);
    recordTest('Get User Reports', false, err.message);
    return { userReports: [], userIds: [] };
  }
}

/**
 * TEST 3: Verify Batch User Data Fetching
 */
async function testBatchUserDataFetching(userIds) {
  if (userIds.length === 0) {
    warning('No user IDs to test batch fetching');
    return {};
  }
  
  info(`Testing batch user data fetching for ${userIds.length} users...`);
  
  try {
    const batchResponse = await makeRequest(`/api/batch-users?ids=${userIds.join(',')}`);
    if (!batchResponse.ok) {
      throw new Error(`Batch users request failed: ${batchResponse.status}`);
    }
    
    const users = await batchResponse.json();
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });
    
    info(`Successfully fetched data for ${users.length} out of ${userIds.length} requested users`);
    
    // Verify user data structure
    let validUsers = 0;
    let invalidUsers = 0;
    
    users.forEach(user => {
      if (user.id && typeof user.displayName === 'string' && 
          (user.avatarUrl === null || typeof user.avatarUrl === 'string')) {
        validUsers++;
      } else {
        invalidUsers++;
        warning(`Invalid user structure: ${JSON.stringify(user)}`);
      }
    });
    
    recordTest(
      'Batch User Data Structure',
      invalidUsers === 0,
      invalidUsers > 0 ? `${invalidUsers} users have invalid structure` : 'All users have valid structure'
    );
    
    recordTest(
      'Batch User Data Fetching',
      users.length > 0,
      `Successfully fetched ${users.length} user profiles`
    );
    
    return userMap;
  } catch (err) {
    error(`Batch user data fetching failed: ${err.message}`);
    recordTest('Batch User Data Fetching', false, err.message);
    return {};
  }
}

/**
 * TEST 4: Monitor User Attribution During Background Refresh
 */
async function testUserAttributionDuringRefresh(userReports, userMap) {
  if (userReports.length === 0) {
    warning('No user reports to monitor during refresh');
    return;
  }
  
  info('Testing user attribution persistence during background data refresh...');
  info(`Monitoring ${userReports.length} user reports for attribution changes`);
  
  // Take initial snapshot
  const initialSnapshot = {};
  for (const report of userReports.slice(0, 10)) { // Test first 10 to keep it manageable
    if (report.userId && userMap[report.userId]) {
      initialSnapshot[report.id] = {
        userId: report.userId,
        userName: userMap[report.userId].displayName,
        userAvatar: userMap[report.userId].avatarUrl,
        reportTitle: report.title,
        lastUpdated: report.lastUpdated
      };
    }
  }
  
  const monitoredCount = Object.keys(initialSnapshot).length;
  info(`Taking initial snapshot of ${monitoredCount} reports with valid user attribution`);
  
  if (monitoredCount === 0) {
    warning('No reports with valid user attribution found to monitor');
    return;
  }
  
  // Wait for refresh cycle (system refreshes every 1-2 minutes)
  info(`Waiting ${TEST_CONFIG.refreshWaitTime / 1000} seconds for background refresh cycle...`);
  await sleep(TEST_CONFIG.refreshWaitTime);
  
  // Take post-refresh snapshot
  info('Taking post-refresh snapshot...');
  const postRefreshSnapshot = {};
  
  try {
    // Re-fetch incidents after refresh
    const postRefreshResponse = await makeRequest('/api/incidents');
    if (!postRefreshResponse.ok) {
      throw new Error(`Failed to fetch post-refresh incidents: ${postRefreshResponse.status}`);
    }
    
    const postRefreshIncidents = await postRefreshResponse.json();
    
    // Re-fetch user data to ensure it's still accessible
    const userIds = Object.values(initialSnapshot).map(snapshot => snapshot.userId);
    const uniqueUserIds = [...new Set(userIds)];
    const postRefreshUserResponse = await makeRequest(`/api/batch-users?ids=${uniqueUserIds.join(',')}`);
    
    if (!postRefreshUserResponse.ok) {
      throw new Error(`Failed to fetch post-refresh user data: ${postRefreshUserResponse.status}`);
    }
    
    const postRefreshUsers = await postRefreshUserResponse.json();
    const postRefreshUserMap = {};
    postRefreshUsers.forEach(user => {
      postRefreshUserMap[user.id] = user;
    });
    
    // Build post-refresh snapshot
    for (const [reportId, initialData] of Object.entries(initialSnapshot)) {
      const postRefreshReport = postRefreshIncidents.find(incident => incident.id === reportId);
      if (postRefreshReport && postRefreshReport.userId && postRefreshUserMap[postRefreshReport.userId]) {
        postRefreshSnapshot[reportId] = {
          userId: postRefreshReport.userId,
          userName: postRefreshUserMap[postRefreshReport.userId].displayName,
          userAvatar: postRefreshUserMap[postRefreshReport.userId].avatarUrl,
          reportTitle: postRefreshReport.title,
          lastUpdated: postRefreshReport.lastUpdated
        };
      }
    }
    
    // Compare snapshots
    let attributionPersisted = 0;
    let attributionLost = 0;
    let attributionChanged = 0;
    
    for (const [reportId, initialData] of Object.entries(initialSnapshot)) {
      const postRefreshData = postRefreshSnapshot[reportId];
      
      if (!postRefreshData) {
        attributionLost++;
        warning(`Lost user attribution for report ${reportId}: "${initialData.reportTitle}"`);
      } else if (postRefreshData.userId !== initialData.userId || 
                 postRefreshData.userName !== initialData.userName) {
        attributionChanged++;
        warning(`User attribution changed for report ${reportId}: ${initialData.userName} → ${postRefreshData.userName}`);
      } else {
        attributionPersisted++;
      }
    }
    
    info(`Attribution Results: ${attributionPersisted} persisted, ${attributionChanged} changed, ${attributionLost} lost`);
    
    recordTest(
      'User Attribution - Persistence During Refresh',
      attributionLost === 0 && attributionChanged === 0,
      `${attributionPersisted}/${monitoredCount} attributions persisted correctly`
    );
    
    recordTest(
      'User Data - Accessibility After Refresh',
      postRefreshUsers.length === uniqueUserIds.length,
      `${postRefreshUsers.length}/${uniqueUserIds.length} users still accessible`
    );
    
  } catch (err) {
    error(`User attribution monitoring failed: ${err.message}`);
    recordTest('User Attribution - Persistence During Refresh', false, err.message);
  }
}

/**
 * TEST 5: Test ReporterAttribution Component Data Flow
 */
async function testReporterAttributionDataFlow(userIds) {
  if (userIds.length === 0) {
    warning('No user IDs to test ReporterAttribution data flow');
    return;
  }
  
  info('Testing ReporterAttribution component data flow...');
  
  try {
    // Test the exact same endpoint the useReporter hook uses
    const testUserId = userIds[0];
    const reporterResponse = await makeRequest(`/api/batch-users?ids=${encodeURIComponent(testUserId)}`);
    
    if (!reporterResponse.ok) {
      throw new Error(`ReporterAttribution data flow failed: ${reporterResponse.status}`);
    }
    
    const reporterUsers = await reporterResponse.json();
    const foundUser = reporterUsers.find(user => user.id === testUserId);
    
    recordTest(
      'ReporterAttribution - Data Flow',
      foundUser !== undefined,
      foundUser ? `Successfully fetched user: ${foundUser.displayName}` : 'User not found in response'
    );
    
    // Test multiple concurrent requests (simulating multiple ReporterAttribution components)
    const concurrentRequests = userIds.slice(0, 5).map(userId => 
      makeRequest(`/api/batch-users?ids=${encodeURIComponent(userId)}`)
    );
    
    const concurrentResponses = await Promise.all(concurrentRequests);
    const successfulResponses = concurrentResponses.filter(response => response.ok).length;
    
    recordTest(
      'ReporterAttribution - Concurrent Requests',
      successfulResponses === concurrentRequests.length,
      `${successfulResponses}/${concurrentRequests.length} concurrent requests successful`
    );
    
  } catch (err) {
    error(`ReporterAttribution data flow test failed: ${err.message}`);
    recordTest('ReporterAttribution - Data Flow', false, err.message);
  }
}

/**
 * MAIN TEST EXECUTION
 */
async function runIntegrationTests() {
  log(colors.bright + colors.cyan, '🧪 STARTING USER ATTRIBUTION INTEGRATION TESTS');
  log(colors.bright, '═'.repeat(80));
  
  info('These tests verify that user attribution in community reports survives background data refreshes');
  info(`Test environment: ${TEST_CONFIG.baseUrl}`);
  info(`Refresh cycle wait time: ${TEST_CONFIG.refreshWaitTime / 1000} seconds`);
  
  console.log('');
  
  try {
    // Test 1: Batch Users API Endpoint
    await testBatchUsersEndpoint();
    console.log('');
    
    // Test 2: Get Current User Reports
    const { userReports, userIds } = await getCurrentUserReports();
    console.log('');
    
    // Test 3: Verify Batch User Data Fetching
    const userMap = await testBatchUserDataFetching(userIds);
    console.log('');
    
    // Test 4: Monitor During Background Refresh
    await testUserAttributionDuringRefresh(userReports, userMap);
    console.log('');
    
    // Test 5: Test ReporterAttribution Component Data Flow
    await testReporterAttributionDataFlow(userIds);
    console.log('');
    
  } catch (err) {
    error(`Critical test failure: ${err.message}`);
    recordTest('Critical Test Execution', false, err.message);
  }
  
  // Print final results
  log(colors.bright + colors.cyan, '📊 TEST RESULTS SUMMARY');
  log(colors.bright, '═'.repeat(80));
  
  log(colors.green, `✅ Passed: ${testResults.passed}`);
  log(colors.red, `❌ Failed: ${testResults.failed}`);
  log(colors.bright, `📈 Total: ${testResults.tests.length}`);
  
  console.log('');
  log(colors.bright, 'DETAILED RESULTS:');
  testResults.tests.forEach(test => {
    const symbol = test.passed ? '✅' : '❌';
    const color = test.passed ? colors.green : colors.red;
    log(color, `${symbol} ${test.name}: ${test.details}`);
  });
  
  console.log('');
  const overallSuccess = testResults.failed === 0;
  if (overallSuccess) {
    log(colors.bright + colors.green, '🎉 ALL TESTS PASSED - User attribution is working correctly!');
    log(colors.green, '✅ User attribution survives background data refreshes');
    log(colors.green, '✅ ReporterAttribution component fetches user data correctly');
    log(colors.green, '✅ Batch users endpoint is functioning properly');
  } else {
    log(colors.bright + colors.red, '⚠️  SOME TESTS FAILED - User attribution may have issues');
    log(colors.yellow, 'Review the detailed results above to identify problems');
  }
  
  return overallSuccess;
}

// Export for use as a module or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runIntegrationTests };
} else {
  // Run tests if executed directly
  runIntegrationTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}