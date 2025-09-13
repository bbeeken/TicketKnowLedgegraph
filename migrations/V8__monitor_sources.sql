-- V8__monitor_sources.sql
-- Idempotent creation of MonitorSources table used by alert-poller
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'app') BEGIN EXEC('CREATE SCHEMA app'); END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MonitorSources' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.MonitorSources (
        source_id INT IDENTITY(1,1) PRIMARY KEY,
        source_type NVARCHAR(50) NOT NULL,
        config_json NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name='last_polled_at' AND object_id = OBJECT_ID('app.MonitorSources'))
BEGIN
    ALTER TABLE app.MonitorSources ADD last_polled_at DATETIME2(3) NULL;
END;
GO
IF NOT EXISTS (SELECT 1 FROM app.MonitorSources)
BEGIN
    INSERT INTO app.MonitorSources (source_type, config_json)
    VALUES ('demo_metric', N'{"endpoint":"https://example.com/status"}');
END;
GO
