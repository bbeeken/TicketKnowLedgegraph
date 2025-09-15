const axios = require('axios');

async function testApiResponse() {
  try {
    // Login as admin
    const login = await axios.post('http://localhost:3001/api/auth/local/signin', {
      email: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = login.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get tickets and check the structure
    const tickets = await axios.get('http://localhost:3001/api/tickets', { headers });
    console.log('Total tickets returned:', tickets.data.length);
    
    // Check the first few tickets for null created_by values
    for (let i = 0; i < Math.min(10, tickets.data.length); i++) {
      const ticket = tickets.data[i];
      console.log(`Ticket ${i}: ID=${ticket.ticket_id}, created_by=${ticket.created_by}, assignee=${ticket.assignee_user_id}, team=${ticket.team_id}`);
    }
    
    // Check specifically tickets at indices mentioned in error
    const problematicIndices = [4, 5, 6, 7];
    for (const index of problematicIndices) {
      if (index < tickets.data.length) {
        const ticket = tickets.data[index];
        console.log(`Index ${index}: created_by=${ticket.created_by} (type: ${typeof ticket.created_by})`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApiResponse();