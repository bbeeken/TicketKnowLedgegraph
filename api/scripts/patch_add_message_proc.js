const sql = require('mssql');

async function main() {
  const cfg = {
    server: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASS || 'S@fePassw0rd!KG2025',
    database: process.env.DB_NAME || 'OpsGraph',
    options: { encrypt: true, trustServerCertificate: true }
  };

  const ddl = `
CREATE OR ALTER PROCEDURE app.usp_AddTicketMessage
    @ticket_id INT,
    @author_id INT,
    @message_type NVARCHAR(20),
    @body NVARCHAR(MAX) = NULL,
    @body_html NVARCHAR(MAX) = NULL,
    @content_format NVARCHAR(16) = 'text',
    @visibility NVARCHAR(16) = 'public'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- Check existence against TicketMaster (not subject to RLS filters)
        IF NOT EXISTS (SELECT 1 FROM app.TicketMaster WHERE ticket_id=@ticket_id)
            RAISERROR('Invalid ticket_id', 16, 1);

        INSERT INTO app.TicketComments (
            ticket_id, author_id, body, visibility, message_type,
            content_format, body_html, body_text, created_at
        )
        VALUES (
            @ticket_id,
            @author_id,
            COALESCE(@body, @body_html),
            @visibility,
            @message_type,
            @content_format,
            @body_html,
            @body,
            SYSUTCDATETIME()
        );
        DECLARE @cid BIGINT = SCOPE_IDENTITY();

        DECLARE @meta NVARCHAR(MAX) = (SELECT @message_type AS [type] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
        INSERT INTO app.TicketHistory (ticket_id, change_type, new_value, changed_by, metadata)
        VALUES (@ticket_id, 'message', COALESCE(@body, @body_html), @author_id, @meta);
        DECLARE @payloadMsg NVARCHAR(MAX) = (SELECT @ticket_id AS ticket_id, @cid AS comment_id, @message_type AS [type] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
        INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload)
        VALUES ('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'ticket.message', @payloadMsg);
        SELECT @cid AS comment_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_AddTicketMessage', CONVERT(NVARCHAR(64), @ticket_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END`;

  const pool = await sql.connect(cfg);
  try {
    await pool.request().batch(ddl);
    console.log('usp_AddTicketMessage patched successfully');
  } finally {
    await pool.close();
  }
}

main().catch((e) => { console.error('Patch failed:', e.message || e); process.exit(1); });
