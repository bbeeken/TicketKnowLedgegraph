"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueOutboxEvent = enqueueOutboxEvent;
// This is a small helper for tests to simulate enqueuing outbox events
const sql_1 = require("../sql");
async function enqueueOutboxEvent(eventType, payload) {
    const pool = await (0, sql_1.getPool)();
    const req = pool.request();
    req.input('event_type', eventType);
    req.input('payload', JSON.stringify(payload));
    await req.query(`INSERT INTO app.Outbox (event_type, payload, created_at) VALUES (@event_type, @payload, SYSUTCDATETIME())`);
}
//# sourceMappingURL=outboxSimulator.js.map