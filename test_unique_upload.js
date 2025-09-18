// Test uploading a file with unique content to verify uploads still work

// First login to get a fresh token

async function testUniqueUpload() {
    console.log('Logging in...');
    
    const loginResponse = await fetch('http://localhost:3001/api/auth/local/signin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
              email: 'admin@test.com',
            password: 'admin123'
        })
    });
    
    if (!loginResponse.ok) {
        console.error('❌ Login failed:', await loginResponse.text());
        return;
    }
    
    const loginData = await loginResponse.json();
    const token = `Bearer ${loginData.access_token}`;
    console.log('✅ Login successful');
    
    console.log('Testing unique file upload...');
    
    // Create unique content using timestamp
    const uniqueContent = `This is a unique test file created at ${Date.now()}\nIt should upload successfully.`;
    
    const formData = new FormData();
    formData.append('file', new Blob([uniqueContent], { type: 'text/plain' }), 'unique-test.txt');
    formData.append('kind', 'other');
    
    try {
        const response = await fetch('http://localhost:3001/api/tickets/72/attachments', {
            method: 'POST',
            headers: {
                'Authorization': token
            },
            body: formData
        });
        
        console.log('Status:', response.status);
        const result = await response.text();
        console.log('Response:', result);
        
        if (response.status === 201) {
            console.log('✅ Unique upload successful!');
        } else {
            console.log('❌ Upload failed');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testUniqueUpload();