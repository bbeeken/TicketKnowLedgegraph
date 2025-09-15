-- Test the stored procedure directly
EXEC sys.sp_set_session_context 'user_id', '8';

DECLARE @payload NVARCHAR(MAX) = '{"ticket_id": 52, "summary": "Test Update", "status": "Open", "severity": 2, "site_id": 1006}';

EXEC app.usp_CreateOrUpdateTicket_v2 @payload;