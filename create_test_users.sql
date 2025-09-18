-- Delete existing test users if they exist
DELETE FROM app.Users WHERE email IN ('admin@test.com', 'tech@test.com');

-- Create admin user
INSERT INTO app.Users (name, email, password, is_admin, is_active, created_at)
VALUES ('Admin User', 'admin@test.com', '$argon2id$v=19$m=65536,t=3,p=4$Pgx7YjC1Iyx1Mha97Fb3GA$t8n4LVHfV3L/5tMrPaIX38q8wuDTrAuTcO1oPihhwvg', 1, 1, SYSUTCDATETIME());

-- Create tech user
INSERT INTO app.Users (name, email, password, is_admin, is_active, created_at) 
VALUES ('Tech User', 'tech@test.com', '$argon2id$v=19$m=65536,t=3,p=4$xeAHvb8y/Jt0Ut22VlRapw$zwh9M1rhc0SjFRda1AUvsrIAxeZfHw+/ZtpwN0+UKCo', 0, 1, SYSUTCDATETIME());

-- Verify users were created
SELECT user_id, name, email, is_admin, is_active FROM app.Users WHERE email IN ('admin@test.com', 'tech@test.com');