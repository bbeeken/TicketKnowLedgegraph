-- V11__monitor_source_auth_config.sql
-- Populate/standardize config_json for legacy minimal MonitorSources schema (source_type, config_json)
-- Adds required fields used by alert_poller get_auth_headers(): header_name/key for ApiKey, token_url/client_id/client_secret for OAuth2, username/password for Basic.

USE [OpsGraph];
GO

-- Only run if legacy schema (no 'name' column) is present
IF COL_LENGTH('app.MonitorSources','name') IS NULL AND COL_LENGTH('app.MonitorSources','source_type') IS NOT NULL
BEGIN
    -- Insight360 (OAuth2)
    UPDATE app.MonitorSources
      SET config_json = '{"api_base_url":"https://insite360.gilbarco.com/api/v1","auth_type":"OAuth2","token_url":"/oauth/token","client_id":"CHANGE_ME","client_secret":"CHANGE_ME"}'
    WHERE source_type = 'Insight360'
      AND (config_json IS NULL OR ISJSON(config_json)=1 AND JSON_VALUE(config_json,'$.auth_type') IS NULL);

    -- FranklinMonitors (ApiKey)
    UPDATE app.MonitorSources
      SET config_json = '{"api_base_url":"https://api.franklinmonitors.com/api","auth_type":"ApiKey","header_name":"X-API-Key","key":"CHANGE_ME"}'
    WHERE source_type = 'FranklinMonitors'
      AND (config_json IS NULL OR ISJSON(config_json)=1 AND JSON_VALUE(config_json,'$.auth_type') IS NULL);

    -- TempStick (Basic)
    UPDATE app.MonitorSources
      SET config_json = '{"api_base_url":"https://api.tempstick.com/v2","auth_type":"Basic","username":"CHANGE_ME","password":"CHANGE_ME"}'
    WHERE source_type = 'TempStick'
      AND (config_json IS NULL OR ISJSON(config_json)=1 AND JSON_VALUE(config_json,'$.auth_type') IS NULL);

    -- TeamViewer (OAuth2)
    UPDATE app.MonitorSources
      SET config_json = '{"api_base_url":"https://webapi.teamviewer.com/api/v1","auth_type":"OAuth2","token_url":"/oauth2/token","client_id":"CHANGE_ME","client_secret":"CHANGE_ME"}'
    WHERE source_type = 'TeamViewer'
      AND (config_json IS NULL OR ISJSON(config_json)=1 AND JSON_VALUE(config_json,'$.auth_type') IS NULL);
END;
GO
