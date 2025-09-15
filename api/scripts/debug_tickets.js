const axios = require('axios');

async function debugTickets() {
  try {
    // Login as admin
    const login = await axios.post('http://localhost:3001/api/auth/local/signin', {
      email: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = login.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Check user context
    const validate = await axios.get('http://localhost:3001/api/auth/validate', { headers });
    console.log('User context:', validate.data);
    
    // Check tickets
    const tickets = await axios.get('http://localhost:3001/api/tickets', { headers });
    console.log('Tickets returned:', tickets.data.length);
    
    // Create ticket and immediately check count
    console.log('\nCreating ticket...');
    const newTicket = await axios.post('http://localhost:3001/api/tickets', {
      summary: 'Debug test ticket',
      description: 'Testing visibility',
      status: 'Open',
      severity: 2,
      site_id: 1006
    }, { headers });
    console.log('Created ticket ID:', newTicket.data.ticket_id);
    
    // Check tickets again immediately
    const ticketsAfter = await axios.get('http://localhost:3001/api/tickets', { headers });
    console.log('Tickets after creation:', ticketsAfter.data.length);
    
    if (ticketsAfter.data.length > 0) {
      console.log('First ticket:', ticketsAfter.data[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugTickets();