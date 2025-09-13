// Test authentication flow
const API_BASE_URL = 'http://localhost:3001';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');

  try {
    // Test 1: Login with test credentials
    console.log('1️⃣ Testing login...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/local/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('   User:', loginData.user.email);
    console.log('   Token received:', !!loginData.access_token);
    console.log('   Admin status:', loginData.user.profile.is_admin);

    const token = loginData.access_token;

    // Test 2: Validate token
    console.log('\n2️⃣ Testing token validation...');
    const validateResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!validateResponse.ok) {
      throw new Error(`Token validation failed: ${validateResponse.status}`);
    }

    const validateData = await validateResponse.json();
    console.log('✅ Token validation successful!');
    console.log('   User ID:', validateData.id);
    console.log('   Email:', validateData.email);
    console.log('   Role:', validateData.profile.role);

    // Test 3: Set session context (for RLS)
    console.log('\n3️⃣ Testing session context...');
    const contextResponse = await fetch(`${API_BASE_URL}/api/auth/session-context`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: loginData.user.id
      }),
    });

    if (!contextResponse.ok) {
      throw new Error(`Session context failed: ${contextResponse.status}`);
    }

    const contextData = await contextResponse.json();
    console.log('✅ Session context set successfully!');
    console.log('   Context:', contextData.context);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - Local login: ✅ Working');
    console.log('   - Token validation: ✅ Working');
    console.log('   - Session context: ✅ Working');
    console.log('   - RLS integration: ✅ Ready');

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

// Run the test
testAuthFlow();
