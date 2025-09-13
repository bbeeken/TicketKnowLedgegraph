// Generate password hashes for seed users
const { hashPassword } = require('./api/src/auth/argon');

async function generateHashes() {
  try {
    const adminHash = await hashPassword('admin123');
    const techHash = await hashPassword('tech123');
    
    console.log('Admin password hash:', adminHash);
    console.log('Tech password hash:', techHash);
    
    // Generate SQL script
    const sql = `-- Seed test users for authentication testing
USE [OpsGraph];
GO

-- Create a test admin user
DECLARE @adminEmail NVARCHAR(255) = 'admin@opsgraph.local';
DECLARE @adminPassword NVARCHAR(255) = '${adminHash}';
DECLARE @adminUserId INT;

-- Insert admin user if not exists
IF NOT EXISTS (SELECT 1 FROM app.Users WHERE email = @adminEmail)
BEGIN
    INSERT INTO app.Users (name, email, password, phone, is_admin, is_active, created_at)
    VALUES ('Administrator', @adminEmail, @adminPassword, NULL, 1, 1, SYSUTCDATETIME());
    
    SET @adminUserId = SCOPE_IDENTITY();
    
    -- Add admin role
    INSERT INTO app.UserRoles (user_id, role) VALUES (@adminUserId, 'admin');
    
    -- Give admin access to all sites
    INSERT INTO app.UserSiteAccess (user_id, site_id)
    SELECT @adminUserId, site_id FROM app.Sites;
    
    PRINT 'Created admin user: admin@opsgraph.local / admin123';
END
ELSE
BEGIN
    PRINT 'Admin user already exists';
END

-- Create a test technician user
DECLARE @techEmail NVARCHAR(255) = 'tech@opsgraph.local';
DECLARE @techPassword NVARCHAR(255) = '${techHash}';
DECLARE @techUserId INT;

IF NOT EXISTS (SELECT 1 FROM app.Users WHERE email = @techEmail)
BEGIN
    INSERT INTO app.Users (name, email, password, phone, is_admin, is_active, created_at)
    VALUES ('Test Technician', @techEmail, @techPassword, '555-0123', 0, 1, SYSUTCDATETIME());
    
    SET @techUserId = SCOPE_IDENTITY();
    
    -- Add technician role
    INSERT INTO app.UserRoles (user_id, role) VALUES (@techUserId, 'technician');
    
    -- Give tech access to first site only
    INSERT INTO app.UserSiteAccess (user_id, site_id)
    SELECT TOP 1 @techUserId, site_id FROM app.Sites ORDER BY site_id;
    
    PRINT 'Created technician user: tech@opsgraph.local / tech123';
END
ELSE
BEGIN
    PRINT 'Technician user already exists';
END

-- Show created users
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.is_admin,
    u.is_active,
    STRING_AGG(ur.role, ', ') as roles,
    COUNT(usa.site_id) as site_count
FROM app.Users u
LEFT JOIN app.UserRoles ur ON u.user_id = ur.user_id
LEFT JOIN app.UserSiteAccess usa ON u.user_id = usa.user_id
WHERE u.email IN ('admin@opsgraph.local', 'tech@opsgraph.local')
GROUP BY u.user_id, u.name, u.email, u.is_admin, u.is_active
ORDER BY u.user_id;

PRINT 'Seed users created successfully!';
PRINT 'You can now log in with:';
PRINT '  admin@opsgraph.local / admin123 (Admin)';
PRINT '  tech@opsgraph.local / tech123 (Technician)';`;

    require('fs').writeFileSync('./seed_test_users.sql', sql);
    console.log('\\nSQL script written to seed_test_users.sql');
  } catch (error) {
    console.error('Error generating hashes:', error);
  }
}

generateHashes();
