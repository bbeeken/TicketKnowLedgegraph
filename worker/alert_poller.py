import asyncio
import json
import logging
from datetime import datetime, timezone
import aiohttp
import aioodbc
import structlog
from typing import Dict, List, Optional

logger = structlog.get_logger()

class AlertPoller:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        self.session = None
        self.monitor_sources: Dict[int, Dict] = {}
        
    async def setup(self):
        """Initialize HTTP session and load monitor sources"""
        self.session = aiohttp.ClientSession()
        await self.refresh_monitor_sources()
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            
    async def refresh_monitor_sources(self):
        """Load/refresh monitor sources from database"""
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT source_id, name, api_base_url, auth_type, 
                           auth_config, polling_interval_seconds
                    FROM app.MonitorSources 
                    WHERE is_active = 1
                """)
                rows = await cursor.fetchall()
                
                self.monitor_sources = {
                    row[0]: {
                        'name': row[1],
                        'api_base_url': row[2],
                        'auth_type': row[3],
                        'auth_config': json.loads(row[4]) if row[4] else {},
                        'polling_interval': row[5]
                    }
                    for row in rows
                }
                
    async def get_auth_headers(self, source_id: int) -> Dict[str, str]:
        """Get authentication headers for a monitor source"""
        source = self.monitor_sources[source_id]
        auth_type = source['auth_type']
        config = source['auth_config']
        
        if auth_type == 'ApiKey':
            return {config['header_name']: config['key']}
        
        elif auth_type == 'OAuth2':
            # Get or refresh OAuth token
            async with self.session.post(
                f"{source['api_base_url']}{config['token_url']}",
                data={
                    'client_id': config['client_id'],
                    'client_secret': config['client_secret'],
                    'grant_type': 'client_credentials'
                }
            ) as resp:
                token_data = await resp.json()
                return {'Authorization': f"Bearer {token_data['access_token']}"}
                
        elif auth_type == 'Basic':
            return {
                'Authorization': f"Basic {config['username']}:{config['password']}"
            }
            
        return {}

    async def poll_insight360(self, source_id: int):
        """Poll Insight360 alerts"""
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        
        async with self.session.get(
            f"{source['api_base_url']}/alerts",
            headers=headers
        ) as resp:
            alerts = await resp.json()
            return [
                {
                    'external_id': alert['id'],
                    'external_asset_id': alert['deviceId'],
                    'alert_type': alert['type'],
                    'severity': alert['severity'],
                    'message': alert['message'],
                    'raw_data': json.dumps(alert)
                }
                for alert in alerts
            ]

    async def poll_franklin_monitors(self, source_id: int):
        """Poll FranklinMonitors alerts"""
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        
        async with self.session.get(
            f"{source['api_base_url']}/alerts/active",
            headers=headers
        ) as resp:
            alerts = await resp.json()
            return [
                {
                    'external_id': alert['alertId'],
                    'external_asset_id': alert['assetId'],
                    'alert_type': alert['alertType'],
                    'severity': alert['severity'],
                    'message': alert['description'],
                    'raw_data': json.dumps(alert)
                }
                for alert in alerts
            ]

    async def poll_temp_ticks(self, source_id: int):
        """Poll TempTicks alerts"""
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        
        async with self.session.get(
            f"{source['api_base_url']}/temperatures/alerts",
            headers=headers
        ) as resp:
            alerts = await resp.json()
            return [
                {
                    'external_id': alert['id'],
                    'external_asset_id': alert['sensorId'],
                    'alert_type': 'TemperatureAlert',
                    'severity': 'High' if alert['level'] > 1 else 'Medium',
                    'message': f"Temperature {alert['temp']}°F exceeds threshold",
                    'raw_data': json.dumps(alert)
                }
                for alert in alerts
            ]

    async def poll_teamviewer(self, source_id: int):
        """Poll TeamViewer device status"""
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        
        # First get all mapped devices
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT external_id 
                    FROM app.MonitorAssetMappings
                    WHERE source_id = ?
                """, (source_id,))
                device_ids = [row[0] for row in await cursor.fetchall()]

        # Check status for each device
        alerts = []
        for device_id in device_ids:
            async with self.session.get(
                f"{source['api_base_url']}/devices/{device_id}",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    device = await resp.json()
                    if not device.get('online', False):
                        alerts.append({
                            'external_id': f"offline_{device_id}_{datetime.now(timezone.utc).isoformat()}",
                            'external_asset_id': device_id,
                            'alert_type': 'DeviceOffline',
                            'severity': 'Medium',
                            'message': f"Device {device.get('alias', device_id)} is offline",
                            'raw_data': json.dumps(device)
                        })
        
        return alerts

    async def insert_alerts(self, source_id: int, alerts: List[Dict]):
        """Insert alerts into the queue"""
        if not alerts:
            return
            
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                for alert in alerts:
                    await cursor.execute("""
                        INSERT INTO app.AlertQueue (
                            source_id, external_id, external_asset_id,
                            alert_type, severity, message, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        source_id,
                        alert['external_id'],
                        alert['external_asset_id'],
                        alert['alert_type'],
                        alert['severity'],
                        alert['message'],
                        alert['raw_data']
                    ))
                await conn.commit()

    async def update_last_poll(self, source_id: int):
        """Update last_poll_at timestamp"""
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    UPDATE app.MonitorSources 
                    SET last_poll_at = SYSUTCDATETIME()
                    WHERE source_id = ?
                """, (source_id,))
                await conn.commit()

    async def poll_source(self, source_id: int):
        """Poll a specific monitor source"""
        try:
            source = self.monitor_sources[source_id]
            
            # Select appropriate polling method
            if source['name'] == 'Insight360':
                alerts = await self.poll_insight360(source_id)
            elif source['name'] == 'FranklinMonitors':
                alerts = await self.poll_franklin_monitors(source_id)
            elif source['name'] == 'TempTicks':
                alerts = await self.poll_temp_ticks(source_id)
            elif source['name'] == 'TeamViewer':
                alerts = await self.poll_teamviewer(source_id)
            else:
                logger.warning("Unknown monitor source", source_id=source_id)
                return

            await self.insert_alerts(source_id, alerts)
            await self.update_last_poll(source_id)
            
            logger.info("Successfully polled source", 
                       source=source['name'], 
                       alert_count=len(alerts))
                       
        except Exception as e:
            logger.error("Error polling source", 
                        source_id=source_id,
                        error=str(e))

    async def run(self):
        """Main polling loop"""
        while True:
            try:
                await self.refresh_monitor_sources()
                
                # Poll each source
                for source_id in self.monitor_sources:
                    await self.poll_source(source_id)
                    
                # Process alert queue
                async with aioodbc.connect(self.db_conn_str) as conn:
                    async with conn.cursor() as cursor:
                        await cursor.execute("EXEC app.usp_ProcessAlertQueue")
                        await conn.commit()
                        
            except Exception as e:
                logger.error("Error in polling loop", error=str(e))
                
            # Wait before next iteration
            await asyncio.sleep(60)  # Poll every minute

async def main():
    # Configure logging
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ]
    )
    
    # Create and run poller
    conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=OpsGraph;UID=sa;PWD=Bcool102!"
    poller = AlertPoller(conn_str)
    
    try:
        await poller.setup()
        await poller.run()
    finally:
        await poller.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
