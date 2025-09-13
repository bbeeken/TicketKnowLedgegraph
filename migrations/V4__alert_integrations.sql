-- V4__alert_integrations.sql
USE [OpsGraph];
GO

-- Monitor Sources
IF OBJECT_ID('app.MonitorSources','U') IS NULL
CREATE TABLE app.MonitorSources (
    source_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(60) NOT NULL UNIQUE,
    api_base_url NVARCHAR(500) NULL,
    auth_type NVARCHAR(20) NOT NULL,  -- 'ApiKey', 'OAuth2', 'Basic'
    auth_config NVARCHAR(MAX) NULL,   -- JSON with auth details
    polling_interval_seconds INT NOT NULL DEFAULT 300,
    last_poll_at DATETIME2(3) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Insert known monitor sources
INSERT INTO app.MonitorSources (name, api_base_url, auth_type, auth_config, polling_interval_seconds)
VALUES 
('Insight360', 'https://insite360.gilbarco.com/api/v1', 'OAuth2', 
 '{"client_id": "CONFIG", "client_secret": "CONFIG", "token_url": "/oauth/token"}', 300),
('FranklinMonitors', 'https://api.franklinmonitors.com/api', 'ApiKey',
 '{"header_name": "X-API-Key", "key": "CONFIG"}', 300),
('TempStick', 'https://api.tempstick.com/v2', 'Basic',
 '{"username": "CONFIG", "password": "CONFIG"}', 60),
('TeamViewer', 'https://webapi.teamviewer.com/api/v1', 'OAuth2',
 '{"client_id": "CONFIG", "client_secret": "CONFIG", "token_url": "/oauth2/token"}', 300);
GO

-- Monitor Asset Mappings
IF OBJECT_ID('app.MonitorAssetMappings','U') IS NULL
CREATE TABLE app.MonitorAssetMappings (
    mapping_id INT IDENTITY(1,1) PRIMARY KEY,
    source_id INT NOT NULL,
    asset_id INT NOT NULL,
    external_id NVARCHAR(200) NOT NULL,      -- ID in the external system
    external_name NVARCHAR(200) NULL,        -- Name in the external system
    last_seen_online_at DATETIME2(3) NULL,
    metadata NVARCHAR(MAX) NULL,             -- JSON with additional metadata
    FOREIGN KEY (source_id) REFERENCES app.MonitorSources(source_id),
    FOREIGN KEY (asset_id) REFERENCES app.Assets(asset_id),
    CONSTRAINT UQ_MonitorMapping UNIQUE (source_id, external_id)
);
GO

-- Raw Alert Queue
IF OBJECT_ID('app.AlertQueue','U') IS NULL
CREATE TABLE app.AlertQueue (
    queue_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    source_id INT NOT NULL,
    external_id NVARCHAR(200) NOT NULL,      -- Alert ID from source
    external_asset_id NVARCHAR(200) NOT NULL, -- Device/Asset ID from source
    alert_type NVARCHAR(100) NOT NULL,
    severity NVARCHAR(20) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    raw_data NVARCHAR(MAX) NOT NULL,         -- Full JSON payload
    received_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    processed_at DATETIME2(3) NULL,
    processing_error NVARCHAR(MAX) NULL,
    FOREIGN KEY (source_id) REFERENCES app.MonitorSources(source_id)
);
GO

-- Alert Processing Rules
IF OBJECT_ID('app.AlertProcessingRules','U') IS NULL
CREATE TABLE app.AlertProcessingRules (
    rule_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    source_id INT NOT NULL,
    alert_type_pattern NVARCHAR(200) NULL,    -- NULL means all types
    condition_json NVARCHAR(MAX) NOT NULL,    -- JSON with matching conditions
    priority NVARCHAR(10) NOT NULL,           -- P1-P4
    severity NVARCHAR(20) NOT NULL,           -- Critical, High, Medium, Low
    category_id INT NULL,                     -- Optional category assignment
    auto_assign_team INT NULL,                -- Optional team assignment
    correlation_window_mins INT NULL,         -- Window for alert correlation
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (source_id) REFERENCES app.MonitorSources(source_id),
    FOREIGN KEY (category_id) REFERENCES app.Categories(category_id),
    FOREIGN KEY (auto_assign_team) REFERENCES app.Teams(team_id)
);
GO

-- Alert Correlation Patterns
IF OBJECT_ID('app.AlertCorrelationPatterns','U') IS NULL
CREATE TABLE app.AlertCorrelationPatterns (
    pattern_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NULL,
    root_alert_type NVARCHAR(100) NOT NULL,   -- Primary alert type
    related_alert_types NVARCHAR(MAX) NOT NULL, -- JSON array of related types
    correlation_window_mins INT NOT NULL,
    min_confidence_score INT NOT NULL,         -- 0-100
    is_active BIT NOT NULL DEFAULT 1
);
GO

-- Insert some correlation patterns
INSERT INTO app.AlertCorrelationPatterns (
    name, description, root_alert_type, 
    related_alert_types, correlation_window_mins, 
    min_confidence_score
) VALUES 
('Network Connectivity Chain', 
 'Correlate network connectivity issues across dependent devices',
 'NetworkDown',
 '["DeviceOffline", "ConnectionLost", "PingTimeout"]',
 30, 75),
('Temperature Impact Pattern',
 'Correlate temperature alerts with equipment performance',
 'HighTemperature',
 '["ThermalWarning", "PerformanceDegraded", "PowerIssue"]',
 60, 80),
('Power Distribution Impact',
 'Track power-related alerts across connected equipment',
 'PowerFailure',
 '["BatteryLow", "UPSOnBattery", "DevicePowerLost"]',
 45, 85);
GO

-- Alert Correlation Results
IF OBJECT_ID('app.AlertCorrelations','U') IS NULL
CREATE TABLE app.AlertCorrelations (
    correlation_id INT IDENTITY(1,1) PRIMARY KEY,
    pattern_id INT NOT NULL,
    root_alert_id CHAR(26) NOT NULL,
    correlated_alerts NVARCHAR(MAX) NOT NULL,  -- JSON array of alert IDs
    confidence_score INT NOT NULL,              -- 0-100
    correlation_data NVARCHAR(MAX) NULL,        -- Additional correlation details
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (pattern_id) REFERENCES app.AlertCorrelationPatterns(pattern_id),
    FOREIGN KEY (root_alert_id) REFERENCES app.Alerts(alert_id)
);
GO

-- Create stored procedure for alert processing
IF OBJECT_ID('app.usp_ProcessAlertQueue', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_ProcessAlertQueue;
GO

CREATE PROCEDURE app.usp_ProcessAlertQueue
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @BatchSize INT = 100;
    
    -- Process alerts in batches
    WHILE 1 = 1
    BEGIN
        BEGIN TRANSACTION;
        
        -- Get next batch of unprocessed alerts
        WITH NextBatch AS (
            SELECT TOP(@BatchSize)
                q.queue_id,
                q.source_id,
                q.external_id,
                q.external_asset_id,
                q.alert_type,
                q.severity,
                q.message,
                q.raw_data,
                m.asset_id,
                r.priority,
                r.category_id,
                r.auto_assign_team,
                r.correlation_window_mins
            FROM app.AlertQueue q
            JOIN app.MonitorAssetMappings m 
                ON q.source_id = m.source_id 
                AND q.external_asset_id = m.external_id
            LEFT JOIN app.AlertProcessingRules r
                ON q.source_id = r.source_id
                AND (r.alert_type_pattern IS NULL 
                     OR q.alert_type LIKE r.alert_type_pattern)
            WHERE q.processed_at IS NULL
            AND r.is_active = 1
            ORDER BY q.received_at
        )
        UPDATE app.AlertQueue
        SET processed_at = SYSUTCDATETIME()
        OUTPUT 
            inserted.queue_id,
            inserted.source_id,
            inserted.external_id,
            inserted.external_asset_id,
            inserted.alert_type,
            inserted.severity,
            inserted.message,
            inserted.raw_data,
            b.asset_id,
            b.priority,
            b.category_id,
            b.auto_assign_team,
            b.correlation_window_mins
        INTO @Alerts
        FROM NextBatch b
        WHERE app.AlertQueue.queue_id = b.queue_id;

        -- If no more alerts, break
        IF @@ROWCOUNT = 0 BREAK;

        -- Create alerts and correlations
        INSERT INTO app.Alerts (
            alert_id,
            event_id,
            alert_type,
            priority,
            raised_at
        )
        SELECT 
            CAST(NEWID() AS CHAR(26)),
            NULL, -- We'll update this after creating the event
            a.alert_type,
            COALESCE(a.priority, 'P3'),
            SYSUTCDATETIME()
        FROM @Alerts a;

        -- Create corresponding events
        INSERT INTO app.Events (
            event_id,
            site_id,
            asset_id,
            source,
            vendor_code,
            canonical_code,
            level,
            message,
            occurred_at
        )
        SELECT 
            CAST(NEWID() AS CHAR(26)),
            ast.site_id,
            a.asset_id,
            ms.name,
            a.external_id,
            a.alert_type,
            a.severity,
            a.message,
            SYSUTCDATETIME()
        FROM @Alerts a
        JOIN app.Assets ast ON a.asset_id = ast.asset_id
        JOIN app.MonitorSources ms ON a.source_id = ms.source_id;

        -- Link alerts to events
        UPDATE app.Alerts
        SET event_id = e.event_id
        FROM app.Alerts al
        JOIN app.Events e 
            ON al.alert_type = e.canonical_code
            AND e.occurred_at >= DATEADD(SECOND, -5, SYSUTCDATETIME());

        -- Perform alert correlation
        INSERT INTO app.AlertCorrelations (
            pattern_id,
            root_alert_id,
            correlated_alerts,
            confidence_score,
            correlation_data,
            created_at
        )
        SELECT 
            p.pattern_id,
            a.alert_id,
            (
                SELECT alert_id
                FROM app.Alerts a2
                WHERE a2.raised_at >= DATEADD(MINUTE, -p.correlation_window_mins, a.raised_at)
                AND a2.raised_at <= a.raised_at
                AND a2.alert_type IN (
                    SELECT value
                    FROM OPENJSON(p.related_alert_types)
                )
                FOR JSON PATH
            ),
            85, -- Default confidence score
            NULL,
            SYSUTCDATETIME()
        FROM @Alerts qa
        JOIN app.Alerts a ON a.alert_type = qa.alert_type
        JOIN app.AlertCorrelationPatterns p 
            ON p.root_alert_type = qa.alert_type
        WHERE p.is_active = 1;

        -- Auto-create tickets for correlated alerts
        INSERT INTO app.Tickets (
            site_id,
            asset_id,
            category_id,
            priority,
            severity,
            summary,
            status,
            created_at,
            updated_at
        )
        SELECT DISTINCT
            ast.site_id,
            qa.asset_id,
            qa.category_id,
            qa.priority,
            qa.severity,
            'Correlated Alert: ' + qa.alert_type + ' - ' + qa.message,
            'Open',
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        FROM @Alerts qa
        JOIN app.Assets ast ON qa.asset_id = ast.asset_id
        WHERE EXISTS (
            SELECT 1 
            FROM app.AlertCorrelations ac
            JOIN app.Alerts a ON ac.root_alert_id = a.alert_id
            WHERE a.alert_type = qa.alert_type
        );

        COMMIT TRANSACTION;
        
        -- Small delay between batches
        WAITFOR DELAY '00:00:01';
    END;
END;
GO

-- Add a view for alert correlation analysis
IF OBJECT_ID('app.vw_AlertCorrelationAnalysis', 'V') IS NOT NULL
    DROP VIEW app.vw_AlertCorrelationAnalysis;
GO

CREATE VIEW app.vw_AlertCorrelationAnalysis AS
SELECT 
    ac.pattern_id,
    acp.name as pattern_name,
    acp.root_alert_type,
    COUNT(*) as correlation_count,
    AVG(CAST(ac.confidence_score as FLOAT)) as avg_confidence_score,
    MIN(ac.created_at) as first_occurrence,
    MAX(ac.created_at) as last_occurrence,
    COUNT(DISTINCT a.asset_id) as affected_assets_count,
    (
        SELECT TOP 5 a2.asset_id, COUNT(*) as alert_count
        FROM app.Alerts a2
        WHERE a2.alert_type = acp.root_alert_type
        GROUP BY a2.asset_id
        ORDER BY COUNT(*) DESC
        FOR JSON PATH
    ) as top_affected_assets
FROM app.AlertCorrelations ac
JOIN app.AlertCorrelationPatterns acp ON ac.pattern_id = acp.pattern_id
JOIN app.Alerts a ON ac.root_alert_id = a.alert_id
GROUP BY ac.pattern_id, acp.name, acp.root_alert_type;
GO
