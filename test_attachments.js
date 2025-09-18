const fs = require('fs');
const path = require('path');

async function testAttachments() {
  const API_BASE = 'http://localhost:3001/api';
  
  console.log('Testing attachment endpoints...');
  
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
  
  const headers = {
    'Authorization': `Bearer ${access_token}`
  };
  
  // Step 2: Test GET /tickets/:id/attachments for an existing ticket
  const ticketId = 72; // Use the ticket you mentioned earlier
  
  console.log(`\nTesting GET /tickets/${ticketId}/attachments...`);
  const getResponse = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, { headers });
  
  if (getResponse.ok) {
    const attachments = await getResponse.json();
    console.log('✅ GET attachments successful');
    console.log(`Found ${attachments.length} attachments:`, attachments);
  } else {
    console.error('❌ GET attachments failed:', getResponse.status, await getResponse.text());
  }
  
  // Step 3: Test file upload using Web API FormData
  console.log(`\nTesting POST /tickets/${ticketId}/attachments...`);
  
  const fileContent = fs.readFileSync('test-attachment.txt');
  const formData = new FormData();
  const file = new File([fileContent], 'test-attachment.txt', { type: 'text/plain' });
  formData.append('file', file);
  formData.append('kind', 'test_document');
  
  const uploadResponse = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`
    },
    body: formData
  });
  
  if (uploadResponse.ok) {
    const result = await uploadResponse.json();
    console.log('✅ Upload successful:', result);
    
    // Step 4: Test GET again to see the new attachment
    console.log(`\nTesting GET /tickets/${ticketId}/attachments after upload...`);
    const getResponse2 = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, { headers });
    
    if (getResponse2.ok) {
      const attachments = await getResponse2.json();
      console.log('✅ GET attachments after upload successful');
      console.log(`Found ${attachments.length} attachments:`, attachments);
      
      if (attachments.length > 0) {
        const firstAttachment = attachments[0];
        
        // Step 5: Test download
        console.log(`\nTesting GET /tickets/${ticketId}/attachments/${firstAttachment.attachment_id}/download...`);
        const downloadResponse = await fetch(`${API_BASE}/tickets/${ticketId}/attachments/${firstAttachment.attachment_id}/download`, { headers });
        
        if (downloadResponse.ok) {
          console.log('✅ Download successful');
          console.log('Content-Type:', downloadResponse.headers.get('content-type'));
          console.log('Content-Length:', downloadResponse.headers.get('content-length'));
          console.log('Content-Disposition:', downloadResponse.headers.get('content-disposition'));
        } else {
          console.error('❌ Download failed:', downloadResponse.status, await downloadResponse.text());
        }
      }
    } else {
      console.error('❌ GET attachments after upload failed:', getResponse2.status);
    }
  } else {
    console.error('❌ Upload failed:', uploadResponse.status, await uploadResponse.text());
  }
  
  console.log('\nTest completed!');
}

testAttachments().catch(console.error);