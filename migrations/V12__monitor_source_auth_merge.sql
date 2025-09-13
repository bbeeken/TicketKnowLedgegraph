-- V12__monitor_source_auth_merge.sql
-- Strategy B: Patch ONLY missing required fields inside existing JSON config_json for legacy schema (source_type, config_json)
-- Does not overwrite user-provided values; merges minimal keys needed by alert_poller.

USE [OpsGraph];
GO

IF COL_LENGTH('app.MonitorSources','name') IS NULL AND COL_LENGTH('app.MonitorSources','source_type') IS NOT NULL
BEGIN
    -- FranklinMonitors (ApiKey): ensure header_name & key
    UPDATE app.MonitorSources
      SET config_json = JSON_MODIFY(JSON_MODIFY(config_json,'$.header_name','X-API-Key'),'$.key',COALESCE(JSON_VALUE(config_json,'$.key'),'CHANGE_ME'))
    WHERE source_type = 'FranklinMonitors'
      AND (
            JSON_VALUE(config_json,'$.auth_type') = 'ApiKey'
            AND (JSON_VALUE(config_json,'$.header_name') IS NULL OR JSON_VALUE(config_json,'$.key') IS NULL)
          );

    -- Insight360 (OAuth2): ensure token_url, client_id, client_secret
    UPDATE app.MonitorSources
      SET config_json = JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(config_json,'$.token_url','/oauth/token'),'$.client_id',COALESCE(JSON_VALUE(config_json,'$.client_id'),'CHANGE_ME')),'$.client_secret',COALESCE(JSON_VALUE(config_json,'$.client_secret'),'CHANGE_ME'))
    WHERE source_type = 'Insight360'
      AND JSON_VALUE(config_json,'$.auth_type') = 'OAuth2'
      AND (
            JSON_VALUE(config_json,'$.token_url') IS NULL
            OR JSON_VALUE(config_json,'$.client_id') IS NULL
            OR JSON_VALUE(config_json,'$.client_secret') IS NULL
          );

    -- TeamViewer (OAuth2): token_url, client_id, client_secret
    UPDATE app.MonitorSources
      SET config_json = JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(config_json,'$.token_url','/oauth2/token'),'$.client_id',COALESCE(JSON_VALUE(config_json,'$.client_id'),'CHANGE_ME')),'$.client_secret',COALESCE(JSON_VALUE(config_json,'$.client_secret'),'CHANGE_ME'))
    WHERE source_type = 'TeamViewer'
      AND JSON_VALUE(config_json,'$.auth_type') = 'OAuth2'
      AND (
            JSON_VALUE(config_json,'$.token_url') IS NULL
            OR JSON_VALUE(config_json,'$.client_id') IS NULL
            OR JSON_VALUE(config_json,'$.client_secret') IS NULL
          );

    -- TempStick (Basic): username/password
    UPDATE app.MonitorSources
      SET config_json = JSON_MODIFY(JSON_MODIFY(config_json,'$.username',COALESCE(JSON_VALUE(config_json,'$.username'),'CHANGE_ME')),'$.password',COALESCE(JSON_VALUE(config_json,'$.password'),'CHANGE_ME'))
    WHERE source_type = 'TempStick'
      AND JSON_VALUE(config_json,'$.auth_type') = 'Basic'
      AND (
            JSON_VALUE(config_json,'$.username') IS NULL
            OR JSON_VALUE(config_json,'$.password') IS NULL
          );
END;
GO
