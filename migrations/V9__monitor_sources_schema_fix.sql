-- CLEAN REWRITE (previous draft had syntax issues)
-- This script is intentionally minimal and idempotent.

USE [OpsGraph];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name='app')
    EXEC('CREATE SCHEMA app');
GO

IF OBJECT_ID('app.MonitorSources','U') IS NULL
BEGIN
    CREATE TABLE app.MonitorSources (
        source_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(60) NOT NULL UNIQUE,
        api_base_url NVARCHAR(500) NULL,
        auth_type NVARCHAR(20) NOT NULL,
        auth_config NVARCHAR(MAX) NULL,
        polling_interval_seconds INT NOT NULL DEFAULT 300,
        last_poll_at DATETIME2(3) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

-- Health/metrics columns (added only if missing)
IF OBJECT_ID('app.MonitorSources','U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='last_error_at')
        ALTER TABLE app.MonitorSources ADD last_error_at DATETIME2(3) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='error_count')
        ALTER TABLE app.MonitorSources ADD error_count INT NOT NULL DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='health_status')
        ALTER TABLE app.MonitorSources ADD health_status NVARCHAR(20) NOT NULL DEFAULT 'Healthy' CONSTRAINT CK_MonitorSources_HealthStatus CHECK (health_status IN ('Healthy','Degraded','Failed'));
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='retry_backoff_mins')
        ALTER TABLE app.MonitorSources ADD retry_backoff_mins INT NOT NULL DEFAULT 5;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='last_successful_poll_at')
        ALTER TABLE app.MonitorSources ADD last_successful_poll_at DATETIME2(3) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='avg_response_time_ms')
        ALTER TABLE app.MonitorSources ADD avg_response_time_ms INT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('app.MonitorSources') AND name='max_requests_per_minute')
        ALTER TABLE app.MonitorSources ADD max_requests_per_minute INT NOT NULL DEFAULT 60;
END;
GO

IF NOT EXISTS (SELECT 1 FROM app.MonitorSources)
BEGIN
    INSERT INTO app.MonitorSources (name, api_base_url, auth_type, auth_config, polling_interval_seconds)
    VALUES
    ('Insight360', 'https://insite360.gilbarco.com/api/v1', 'OAuth2', '{"client_id":"CONFIG","client_secret":"CONFIG","token_url":"/oauth/token"}', 300),
    ('FranklinMonitors', 'https://api.franklinmonitors.com/api', 'ApiKey', '{"header_name":"X-API-Key","key":"CONFIG"}', 300),
    ('TempStick', 'https://api.tempstick.com/v2', 'Basic', '{"username":"CONFIG","password":"CONFIG"}', 60),
    ('TeamViewer', 'https://webapi.teamviewer.com/api/v1', 'OAuth2', '{"client_id":"CONFIG","client_secret":"CONFIG","token_url":"/oauth2/token"}', 300);
END;
GO

IF OBJECT_ID('app.MonitorAssetMappings','U') IS NULL
BEGIN
    CREATE TABLE app.MonitorAssetMappings (
        mapping_id INT IDENTITY(1,1) PRIMARY KEY,
        source_id INT NOT NULL,
        asset_id INT NULL,
        external_id NVARCHAR(200) NOT NULL,
        external_name NVARCHAR(200) NULL,
        last_seen_online_at DATETIME2(3) NULL,
        metadata NVARCHAR(MAX) NULL
    );
END;
GO
