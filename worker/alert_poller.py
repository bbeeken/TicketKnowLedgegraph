import asyncio
import json
import logging
from datetime import datetime, timezone
import hashlib
import numpy as np
from typing import Dict, List, Optional
import aiohttp
import aioodbc
import structlog
from sklearn.base import BaseEstimator
from sklearn.ensemble import RandomForestClassifier
import joblib

logger = structlog.get_logger()

class MonitoringManager:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        self.source_metrics = {}
        
    async def record_poll_attempt(self, source_id: int, success: bool, 
                                response_time_ms: Optional[int] = None, 
                                error_msg: Optional[str] = None):
        now = datetime.now(timezone.utc)
        metrics = self.source_metrics.setdefault(source_id, {
            'error_count': 0,
            'last_success': None,
            'avg_response_time': None
        })
        
        if success:
            metrics['last_success'] = now
            if response_time_ms:
                if metrics['avg_response_time'] is None:
                    metrics['avg_response_time'] = response_time_ms
                else:
                    metrics['avg_response_time'] = (
                        0.9 * metrics['avg_response_time'] + 0.1 * response_time_ms
                    )
            metrics['error_count'] = 0
        else:
            metrics['error_count'] += 1
            
        # Update database
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    UPDATE app.MonitorSources 
                    SET last_error_at = CASE WHEN ? = 0 THEN SYSUTCDATETIME() ELSE last_error_at END,
                        error_count = ?,
                        health_status = CASE 
                            WHEN ? = 1 THEN 'Healthy'
                            WHEN ? >= 3 THEN 'Failed'
                            ELSE 'Degraded'
                        END,
                        last_successful_poll_at = CASE WHEN ? = 1 THEN SYSUTCDATETIME() ELSE last_successful_poll_at END,
                        avg_response_time_ms = ?
                    WHERE source_id = ?
                """, (
                    success, 
                    metrics['error_count'],
                    success,
                    metrics['error_count'],
                    success,
                    metrics['avg_response_time'],
                    source_id
                ))
                await conn.commit()

class AlertProcessor:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        
    def compute_alert_hash(self, alert: Dict) -> bytes:
        """Compute deterministic hash for alert deduplication"""
        key_fields = [
            str(alert.get('source_id')),
            str(alert.get('external_asset_id')),
            alert.get('alert_type', ''),
            alert.get('message', '')
        ]
        return hashlib.sha256('|'.join(key_fields).encode()).digest()
        
    async def check_throttling(self, source_id: int, alert_type: str) -> bool:
        """Check if alert should be throttled"""
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "EXEC app.usp_CheckAlertThrottling @SourceId=?, @AlertType=?",
                    (source_id, alert_type)
                )
                result = await cursor.fetchone()
                return bool(result[0]) if result else False
                
    async def check_duplication(self, source_id: int, alert_type: str, 
                              payload: str, hash_signature: bytes) -> bool:
        """Check if alert is a duplicate"""
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "EXEC app.usp_CheckAlertDuplication @SourceId=?, @AlertType=?, @Payload=?, @HashSignature=?",
                    (source_id, alert_type, payload, hash_signature)
                )
                result = await cursor.fetchone()
                return bool(result[0]) if result else False

    async def process_alert(self, alert: Dict) -> bool:
        """Process a single alert with throttling and deduplication"""
        hash_sig = self.compute_alert_hash(alert)
        
        # Check throttling
        if await self.check_throttling(alert['source_id'], alert['alert_type']):
            logger.warning("Alert throttled", 
                         source_id=alert['source_id'],
                         alert_type=alert['alert_type'])
            return False
            
        # Check duplication
        if await self.check_duplication(
            alert['source_id'], 
            alert['alert_type'],
            json.dumps(alert),
            hash_sig
        ):
            logger.info("Duplicate alert detected",
                       source_id=alert['source_id'],
                       alert_type=alert['alert_type'])
            return False
            
        # Process alert
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    INSERT INTO app.AlertQueue (
                        source_id, external_id, external_asset_id,
                        alert_type, severity, message, raw_data,
                        hash_signature
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert['source_id'],
                    alert['external_id'],
                    alert['external_asset_id'],
                    alert['alert_type'],
                    alert['severity'],
                    alert['message'],
                    json.dumps(alert),
                    hash_sig
                ))
                await conn.commit()
                return True

class MaintenancePredictor:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        self.models: Dict[str, BaseEstimator] = {}
        
    async def load_active_models(self):
        """Load all active ML models"""
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT model_id, asset_type, model_artifacts_path
                    FROM app.MaintenanceModels m
                    JOIN app.ModelDeployments d ON m.model_id = d.model_id
                    WHERE m.is_active = 1
                    AND d.deployment_status = 'Active'
                """)
                models = await cursor.fetchall()
                
                for model_id, asset_type, artifacts_path in models:
                    try:
                        self.models[asset_type] = joblib.load(artifacts_path)
                        logger.info(f"Loaded model for {asset_type}")
                    except Exception as e:
                        logger.error(f"Error loading model for {asset_type}: {str(e)}")
                        
    async def predict_maintenance(self, asset_id: int, features: Dict) -> Optional[Dict]:
        """Generate maintenance prediction for an asset"""
        async with aioodbc.connect(self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                # Get asset type
                await cursor.execute(
                    "SELECT type FROM app.Assets WHERE asset_id = ?",
                    (asset_id,)
                )
                result = await cursor.fetchone()
                if not result:
                    return None
                    
                asset_type = result[0]
                if asset_type not in self.models:
                    return None
                    
                # Generate prediction
                model = self.models[asset_type]
                feature_vector = self._prepare_features(features)
                prediction = model.predict_proba([feature_vector])[0]
                confidence = float(max(prediction))
                
                if confidence >= 0.7:  # Configurable threshold
                    feature_importance = self._get_feature_importance(
                        model, features, prediction
                    )
                    
                    # Record prediction
                    await cursor.execute("""
                        INSERT INTO app.MaintenancePredictions (
                            asset_id, predicted_failure_at,
                            confidence_score, feature_importance,
                            prediction_explanation
                        ) VALUES (?, DATEADD(DAY, 7, SYSUTCDATETIME()),
                                ?, ?, ?)
                    """, (
                        asset_id,
                        confidence * 100,
                        json.dumps(feature_importance),
                        self._generate_explanation(feature_importance)
                    ))
                    await conn.commit()
                    
                    return {
                        'asset_id': asset_id,
                        'confidence': confidence,
                        'features': feature_importance,
                        'prediction_window': '7 days'
                    }
                
        return None
        
    def _prepare_features(self, features: Dict) -> np.ndarray:
        """Prepare feature vector for model input"""
        # Implementation depends on feature engineering pipeline
        pass
        
    def _get_feature_importance(self, model: BaseEstimator, 
                              features: Dict, prediction: np.ndarray) -> Dict:
        """Calculate feature importance for the prediction"""
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            return {
                name: float(imp) 
                for name, imp in zip(features.keys(), importances)
            }
        return {}
        
    def _generate_explanation(self, feature_importance: Dict) -> str:
        """Generate human-readable explanation of prediction"""
        top_features = sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        explanation = "Prediction based on: "
        explanation += ", ".join(
            f"{feature} (importance: {importance:.2f})"
            for feature, importance in top_features
        )
        return explanation

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
