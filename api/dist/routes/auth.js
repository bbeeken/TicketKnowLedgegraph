"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const zod_1 = require("zod");
const argon_1 = require("../auth/argon");
const sql_1 = require("../sql");
async function registerAuthRoutes(fastify) {
    // POST /auth/register - admin only
    fastify.post('/auth/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const user = request.user;
        const roles = user?.roles || [];
        if (!roles.includes('app_admin'))
            return reply.code(403).send({ error: 'forbidden' });
        const bodySchema = zod_1.z.object({ name: zod_1.z.string().min(1), email: zod_1.z.string().email(), phone: zod_1.z.string().optional(), password: zod_1.z.string().min(8), roles: zod_1.z.array(zod_1.z.string()).optional() });
        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success)
            return reply.code(400).send({ error: 'invalid payload' });
        const { name, email, phone, password, roles: newRoles } = parsed.data;
        const pool = await (0, sql_1.getPool)();
        const hashed = await (0, argon_1.hashPassword)(password);
        const req = pool.request();
        try {
            const res = await req.input('name', name).input('email', email).input('phone', phone || null).input('password', hashed).query(`
        IF EXISTS (SELECT 1 FROM app.Users u WHERE u.email = @email)
        BEGIN
          UPDATE app.Users SET name = @name, phone = @phone, password = @password WHERE email = @email;
        END
        ELSE
        BEGIN
          INSERT INTO app.Users (name, email, phone, password, created_at) VALUES (@name, @email, @phone, @password, SYSUTCDATETIME());
        END
      `);
            const sel = await pool.request().input('email', email).query('SELECT user_id, name, email FROM app.Users WHERE email = @email');
            const u = sel.recordset[0];
            // roles: upsert into app.UserRoles
            if (newRoles && newRoles.length > 0) {
                for (const r of newRoles) {
                    await pool.request().input('userId', u.user_id).input('role', r).query(`IF NOT EXISTS (SELECT 1 FROM app.UserRoles ur WHERE ur.user_id=@userId AND ur.role=@role) INSERT INTO app.UserRoles (user_id, role) VALUES (@userId,@role);`);
                }
            }
            return reply.code(201).send({ user_id: u.user_id, name: u.name, email: u.email });
        }
        catch (err) {
            fastify.log.error({ err }, 'Failed to register user');
            return reply.code(500).send({ error: 'failed' });
        }
    });
    // POST /auth/login
    fastify.post('/auth/login', async (request, reply) => {
        const bodySchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string() });
        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success)
            return reply.code(400).send({ error: 'invalid payload' });
        const { email, password } = parsed.data;
        const pool = await (0, sql_1.getPool)();
        try {
            const res = await pool.request().input('email', email).query('SELECT u.user_id, u.name, u.email, u.password FROM app.Users u WHERE u.email = @email');
            const row = res.recordset[0];
            if (!row)
                return reply.code(401).send({ error: 'invalid credentials' });
            const ok = await (0, argon_1.verifyPassword)(row.password, password);
            if (!ok)
                return reply.code(401).send({ error: 'invalid credentials' });
            // fetch roles
            const rolesRes = await pool.request().input('userId', row.user_id).query('SELECT role FROM app.UserRoles WHERE user_id = @userId');
            const roles = rolesRes.recordset.map((r) => r.role);
            const accessToken = await reply.jwtSign({ sub: String(row.user_id), name: row.name, email: row.email, roles }, { expiresIn: '15m' });
            const refreshToken = await reply.jwtSign({ sub: String(row.user_id), type: 'refresh' }, { expiresIn: '7d' });
            return reply.send({ accessToken, refreshToken, user: { user_id: row.user_id, name: row.name, email: row.email, roles } });
        }
        catch (err) {
            fastify.log.error({ err }, 'login failed');
            return reply.code(500).send({ error: 'failed' });
        }
    });
    // POST /auth/refresh
    fastify.post('/auth/refresh', async (request, reply) => {
        const bodySchema = zod_1.z.object({ refreshToken: zod_1.z.string() });
        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success)
            return reply.code(400).send({ error: 'invalid payload' });
        const { refreshToken } = parsed.data;
        try {
            const decoded = await fastify.jwt.verify(refreshToken);
            if (decoded.type !== 'refresh')
                return reply.code(401).send({ error: 'invalid token' });
            const userId = decoded.sub;
            // Optionally verify user still exists
            const pool = await (0, sql_1.getPool)();
            const res = await pool.request().input('userId', userId).query('SELECT user_id, name, email FROM app.Users WHERE user_id = @userId');
            const row = res.recordset[0];
            if (!row)
                return reply.code(401).send({ error: 'invalid token' });
            const rolesRes = await pool.request().input('userId', userId).query('SELECT role FROM app.UserRoles WHERE user_id = @userId');
            const roles = rolesRes.recordset.map((r) => r.role);
            const accessToken = await reply.jwtSign({ sub: String(row.user_id), name: row.name, email: row.email, roles }, { expiresIn: '15m' });
            const newRefresh = await reply.jwtSign({ sub: String(row.user_id), type: 'refresh' }, { expiresIn: '7d' });
            return reply.send({ accessToken, refreshToken: newRefresh });
        }
        catch (err) {
            fastify.log.error({ err }, 'refresh failed');
            return reply.code(401).send({ error: 'invalid token' });
        }
    });
}
//# sourceMappingURL=auth.js.map