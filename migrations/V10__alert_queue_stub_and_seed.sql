-- V10__alert_queue_stub_and_seed.sql
-- Adds a lightweight stub for app.usp_ProcessAlertQueue (if missing) and seeds legacy MonitorSources rows
-- Safe/idempotent: only creates when absent and only inserts missing source_type values

USE [OpsGraph];
GO

IF OBJECT_ID('app.usp_ProcessAlertQueue','P') IS NULL
    EXEC('CREATE PROCEDURE app.usp_ProcessAlertQueue AS BEGIN SET NOCOUNT ON; /* stub: no-op */ END');
GO

-- Seed legacy style sources (source_type/config_json) if using minimal schema
IF COL_LENGTH('app.MonitorSources','source_type') IS NOT NULL AND COL_LENGTH('app.MonitorSources','name') IS NULL
BEGIN
    ;WITH Needed AS (
        SELECT v.source_type, v.config_json
        FROM (VALUES
            ('Insight360', '{"api_base_url":"https://insite360.gilbarco.com/api/v1","auth_type":"OAuth2"}'),
            ('FranklinMonitors', '{"api_base_url":"https://api.franklinmonitors.com/api","auth_type":"ApiKey"}'),
            ('TempStick', '{"api_base_url":"https://api.tempstick.com/v2","auth_type":"Basic"}'),
            ('TeamViewer', '{"api_base_url":"https://webapi.teamviewer.com/api/v1","auth_type":"OAuth2"}')
        ) v(source_type, config_json)
        WHERE NOT EXISTS (SELECT 1 FROM app.MonitorSources ms WHERE ms.source_type = v.source_type)
    )
    INSERT INTO app.MonitorSources (source_type, config_json)
    SELECT source_type, config_json FROM Needed;
END;
GO