// Simple HTTP test: login then post a ticket message
// Usage (optional): set env API_BASE, TEST_EMAIL, TEST_PASSWORD, TICKET_ID

(async () => {
  const base = process.env.API_BASE || 'http://localhost:3001/api';
  const email = process.env.TEST_EMAIL || 'admin@test.com';
  const password = process.env.TEST_PASSWORD || 'admin123';
  let ticketId = Number(process.env.TICKET_ID || '0');

  try {
    // Login
    const loginRes = await fetch(`${base}/auth/local/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginText = await loginRes.text();
    let loginJson;
    try { loginJson = JSON.parse(loginText); } catch {
      throw new Error(`Login response not JSON. Status=${loginRes.status} Body=${loginText.slice(0,200)}`);
    }
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText} -> ${loginText}`);
    }
    const token = loginJson.access_token || loginJson.token;
    if (!token) throw new Error('No access token in login response');

    // Try fetching metadata (sanity check for dropdown data)
    const metaRes = await fetch(`${base}/tickets/metadata`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET /tickets/metadata ->', metaRes.status, metaRes.statusText);

    // Find a valid ticket id if not provided
    if (!ticketId) {
      const listRes = await fetch(`${base}/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listText = await listRes.text();
      if (!listRes.ok) throw new Error(`List tickets failed: ${listRes.status} ${listRes.statusText} -> ${listText.slice(0,200)}`);
      let listJson = [];
      try { listJson = JSON.parse(listText); } catch {}
      ticketId = listJson?.[0]?.ticket_id;
      if (!ticketId) throw new Error('No tickets found to post a message to');
      console.log('Using ticket_id', ticketId);
    }

    // Post message
    const payload = {
      message_type: 'comment',
      content_format: 'text',
      body: `HTTP test message at ${new Date().toISOString()}`
    };
    const postRes = await fetch(`${base}/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const postText = await postRes.text();
    console.log('POST /tickets/%d/messages -> %d %s', ticketId, postRes.status, postRes.statusText);
    console.log(postText);
    process.exit(postRes.ok ? 0 : 1);
  } catch (err) {
    console.error('HTTP post message test failed:', err.message || err);
    process.exit(1);
  }
})();
