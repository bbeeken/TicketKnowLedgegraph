const fs = require('fs');

async function testDuplicateError() {
  const API_BASE = 'http://localhost:3001/api';
  
  console.log('Testing duplicate file error handling...');
  
  // Step 1: Login to get token
  const loginResponse = await fetch(`${API_BASE}/auth/local/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'admin123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status);
    return;
  }
  
  const { access_token } = await loginResponse.json();
  console.log('✅ Login successful');
  
  // Step 2: Try to upload the same file twice
  const ticketId = 79;
  const sameContent = 'This is identical content for testing duplicate detection';
  
  console.log(`\nTesting duplicate upload to ticket ${ticketId}...`);
  
  for (let i = 1; i <= 2; i++) {
    console.log(`\nAttempt ${i}:`);
    
    const formData = new FormData();
    const file = new File([sameContent], `duplicate-test-${i}.txt`, { type: 'text/plain' });
    formData.append('file', file);
    formData.append('kind', 'test_document');
    
    const uploadResponse = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      body: formData
    });
    
    const result = await uploadResponse.text();
    
    if (uploadResponse.ok) {
      console.log(`✅ Upload ${i} successful:`, result);
    } else {
      console.log(`Status: ${uploadResponse.status}`);
      console.log(`Response:`, result);
      
      if (uploadResponse.status === 409) {
        console.log('✅ Correctly detected duplicate content with 409 status');
      } else {
        console.log('❌ Unexpected error status');
      }
    }
  }
  
  console.log('\nTest completed!');
}

testDuplicateError().catch(console.error);