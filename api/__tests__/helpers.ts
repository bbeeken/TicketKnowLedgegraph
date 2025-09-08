import axios from 'axios';

const API = process.env.API_BASE_URL || 'http://localhost:3000/api';

export async function registerAndLogin(adminCreds?: { email: string; password: string }) {
  const email = adminCreds?.email || 'admin@example.com';
  const password = adminCreds?.password || 'Admin123!';

  // Try login first
  try {
    const login = await axios.post(`${API}/auth/login`, { email, password });
    return login.data;
  } catch (e) {
    // try register (no auth middleware if seeded)
    try {
      await axios.post(`${API}/auth/register`, { name: 'Admin', email, password, roles: ['app_admin'] });
    } catch (err) {
      // ignore
    }
    const login = await axios.post(`${API}/auth/login`, { email, password });
    return login.data;
  }
}

export default API;
