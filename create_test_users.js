const { hashPassword } = require('./api/src/auth/argon.js');

async function createTestUser() {
  try {
    const hash = await hashPassword('admin123');
    console.log('Password hash:', hash);
    
    const sql = `INSERT INTO app.Users (name, email, password, is_admin, is_active, created_at) 
VALUES ('Admin User', 'admin@test.com', '${hash}', 1, 1, SYSUTCDATETIME());`;
    
    console.log('\nSQL to create user:');
    console.log(sql);
    
    // Also generate for a technician
    const techHash = await hashPassword('tech123');
    const techSql = `INSERT INTO app.Users (name, email, password, is_admin, is_active, created_at) 
VALUES ('Tech User', 'tech@test.com', '${techHash}', 0, 1, SYSUTCDATETIME());`;
    
    console.log('\nSQL to create technician:');
    console.log(techSql);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUser();
