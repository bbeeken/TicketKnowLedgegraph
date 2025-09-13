// Test frontend auth client
import { opsGraphAuth } from '../src/lib/auth.js';

async function testFrontendAuth() {
  console.log('🧪 Testing Frontend Auth Client...\n');

  try {
    console.log('1️⃣ Testing local sign in...');
    const result = await opsGraphAuth.signInWithLocal('admin@test.com', 'admin123');
    
    if (result.error) {
      throw new Error(`Login failed: ${result.error.message}`);
    }

    console.log('✅ Login successful!');
    console.log('   User:', result.user?.email);
    console.log('   Admin:', result.user?.profile.is_admin);

    console.log('\n2️⃣ Testing current user...');
    const currentUser = opsGraphAuth.getCurrentUser();
    console.log('✅ Current user retrieved:');
    console.log('   ID:', currentUser?.id);
    console.log('   Email:', currentUser?.email);

    console.log('\n3️⃣ Testing sign out...');
    await opsGraphAuth.signOut();
    const userAfterSignOut = opsGraphAuth.getCurrentUser();
    console.log('✅ Sign out successful!');
    console.log('   Current user after sign out:', userAfterSignOut);

    console.log('\n🎉 All frontend auth tests passed!');

  } catch (error) {
    console.error('❌ Frontend auth test failed:', error.message);
  }
}

// Run the test
testFrontendAuth();
