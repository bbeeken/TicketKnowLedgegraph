import asyncio
import json
import logging
from datetime import datetime, timezone
import os
import hashlib
import numpy as np
from typing import Dict, List, Optional, Any
import aiohttp
import aioodbc
import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aiohttp
import aioodbc
import joblib
import numpy as np
import structlog
from sklearn.base import BaseEstimator


logger = structlog.get_logger()


class MonitoringManager:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        self.source_metrics: Dict[int, Dict[str, Any]] = {}

    async def record_poll_attempt(
        self,
        source_id: int,
        success: bool,
        response_time_ms: Optional[int] = None,
        error_msg: Optional[str] = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        metrics = self.source_metrics.setdefault(
            source_id, {"error_count": 0, "last_success": None, "avg_response_time": None}
        )

        if success:
            metrics["last_success"] = now
            if response_time_ms is not None:
                if metrics["avg_response_time"] is None:
                    metrics["avg_response_time"] = response_time_ms
                else:
                    metrics["avg_response_time"] = int(
                        0.9 * metrics["avg_response_time"] + 0.1 * response_time_ms
                    )
            metrics["error_count"] = 0
        else:
            metrics["error_count"] += 1

        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
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
                    """,
                    (
                        1 if success else 0,
                        metrics["error_count"],
                        1 if success else 0,
                        metrics["error_count"],
                        1 if success else 0,
                        metrics["avg_response_time"],
                        source_id,
                    ),
                )
                await conn.commit()


class AlertProcessor:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str

    async def check_throttling(self, source_id: int, alert_type: str) -> bool:
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "EXEC app.usp_CheckAlertThrottling @SourceId=?, @AlertType=?",
                    (source_id, alert_type),
                )
                row = await cursor.fetchone()
                return bool(row[0]) if row else False

    async def check_duplication(
        self, source_id: int, alert_type: str, payload: str, hash_signature: bytes
    ) -> bool:
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "EXEC app.usp_CheckAlertDuplication @SourceId=?, @AlertType=?, @Payload=?, @HashSignature=?",
                    (source_id, alert_type, payload, hash_signature),
                )
                row = await cursor.fetchone()
                return bool(row[0]) if row else False

    async def process_alert(self, alert: Dict[str, Any]) -> bool:
        key_fields = [
            str(alert.get("source_id")),
            str(alert.get("external_asset_id")),
            alert.get("alert_type", ""),
            alert.get("message", ""),
        ]
        import hashlib

        hash_sig = hashlib.sha256("|".join(key_fields).encode()).digest()

        if await self.check_throttling(alert["source_id"], alert["alert_type"]):
            logger.warning("Alert throttled", source_id=alert["source_id"], alert_type=alert["alert_type"])
            return False

        if await self.check_duplication(
            alert["source_id"], alert["alert_type"], json.dumps(alert), hash_sig
        ):
            logger.info(
                "Duplicate alert detected",
                source_id=alert["source_id"],
                alert_type=alert["alert_type"],
            )
            return False

        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO app.AlertQueue (
                        source_id, external_id, external_asset_id,
                        alert_type, severity, message, raw_data,
                        hash_signature
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        alert["source_id"],
                        alert["external_id"],
                        alert["external_asset_id"],
                        alert["alert_type"],
                        alert["severity"],
                        alert["message"],
                        json.dumps(alert),
                        hash_sig,
                    ),
                )
                await conn.commit()
                return True


class MaintenancePredictor:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        self.models: Dict[str, BaseEstimator] = {}

    async def load_active_models(self) -> None:
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    SELECT m.model_id, m.asset_type, m.model_artifacts_path
                    FROM app.MaintenanceModels m
                    JOIN app.ModelDeployments d ON m.model_id = d.model_id
                    WHERE m.is_active = 1 AND d.deployment_status = 'Active'
                    """
                )
                rows = await cursor.fetchall()

        for _, asset_type, artifacts_path in rows:
            try:
                self.models[asset_type] = joblib.load(artifacts_path)
                logger.info("Loaded model", asset_type=asset_type)
            except Exception as e:
                logger.error("Error loading model", asset_type=asset_type, error=str(e))

    def _prepare_features(self, features: Dict[str, Any]) -> np.ndarray:
        vals: List[float] = []
        for k in features.keys():
            v = features[k]
            if isinstance(v, (int, float, np.floating)):
                vals.append(float(v))
            elif isinstance(v, str):
                vals.append((hash(v) % 10000) / 10000.0)
            else:
                vals.append(0.0)
        return np.array(vals, dtype=float)

    def _get_feature_importance(self, model: BaseEstimator, features: Dict[str, Any]) -> Dict[str, float]:
        importances = getattr(model, "feature_importances_", None)
        if importances is None:
            return {}
        return {k: float(v) for k, v in zip(features.keys(), importances)}

    async def predict_maintenance(self, asset_id: int, features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT type FROM app.Assets WHERE asset_id = ?", (asset_id,))
                row = await cursor.fetchone()
                if not row:
                    return None
                asset_type = row[0]

        if asset_type not in self.models:
            return None

        model: Any = self.models[asset_type]
        x = self._prepare_features(features)
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba([x])[0]
            confidence = float(max(proba))
        else:
            pred = getattr(model, "predict")([x])[0]
            try:
                p1 = float(pred)
            except Exception:
                p1 = 0.0
            confidence = max(1.0 - p1, p1)

        if confidence < 0.7:
            return None

        feature_imp = self._get_feature_importance(model, features)

        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO app.MaintenancePredictions (
                        asset_id, predicted_failure_at,
                        confidence_score, feature_importance, prediction_explanation
                    ) VALUES (?, DATEADD(DAY, 7, SYSUTCDATETIME()), ?, ?, ?)
                    """,
                    (
                        asset_id,
                        confidence * 100.0,
                        json.dumps(feature_imp),
                        "Prediction based on top features",
                    ),
                )
                await conn.commit()

        return {
            "asset_id": asset_id,
            "confidence": confidence,
            "features": feature_imp,
            "prediction_window": "7 days",
        }


class AlertPoller:
    def __init__(self, db_conn_str: str):
        self.db_conn_str = db_conn_str
        self.session: Optional[aiohttp.ClientSession] = None
        self.monitor_sources: Dict[int, Dict[str, Any]] = {}

    async def setup(self) -> None:
        self.session = aiohttp.ClientSession()
        await self.refresh_monitor_sources()

    async def cleanup(self) -> None:
        if self.session is not None:
            await self.session.close()
            self.session = None

    def _require_session(self) -> aiohttp.ClientSession:
        if self.session is None:
            raise RuntimeError("HTTP session is not initialized. Call setup() first.")
        return self.session

    async def refresh_monitor_sources(self) -> None:
        # Support legacy minimal schema (source_type/config_json) as created by earlier migration draft
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                # Discover column set
                await cursor.execute("SELECT TOP 0 * FROM app.MonitorSources")
                col_names = [c[0] for c in cursor.description]
                if "name" in col_names:  # full schema present
                    await cursor.execute(
                        """
                        SELECT source_id, name, api_base_url, auth_type, auth_config, polling_interval_seconds, is_active
                        FROM app.MonitorSources
                        WHERE is_active = 1
                        """
                    )
                    rows = await cursor.fetchall()
                    self.monitor_sources = {
                        r[0]: {
                            "name": r[1],
                            "api_base_url": r[2],
                            "auth_type": r[3],
                            "auth_config": json.loads(r[4]) if r[4] else {},
                            "polling_interval": r[5],
                        }
                        for r in rows
                    }
                else:  # legacy minimal schema fallback
                    await cursor.execute(
                        """
                        SELECT source_id, source_type, config_json
                        FROM app.MonitorSources
                        WHERE is_active = 1
                        """
                    )
                    rows = await cursor.fetchall()
                    self.monitor_sources = {}
                    for r in rows:
                        config = json.loads(r[2]) if r[2] else {}
                        self.monitor_sources[r[0]] = {
                            "name": r[1],  # use source_type as name
                            "api_base_url": config.get("api_base_url"),
                            "auth_type": config.get("auth_type", "ApiKey"),
                            "auth_config": config,
                            "polling_interval": 300,
                        }

    async def get_auth_headers(self, source_id: int) -> Dict[str, str]:
        source = self.monitor_sources[source_id]
        auth_type = source["auth_type"]
        config = source["auth_config"]
        if auth_type == "ApiKey":
            return {config["header_name"]: config["key"]}
        if auth_type == "OAuth2":
            session = self._require_session()
            async with session.post(
                f"{source['api_base_url']}{config['token_url']}",
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "grant_type": "client_credentials",
                },
            ) as resp:
                data = await resp.json()
                return {"Authorization": f"Bearer {data['access_token']}"}
        if auth_type == "Basic":
            return {"Authorization": f"Basic {config['username']}:{config['password']}"}
        return {}

    async def poll_insight360(self, source_id: int) -> List[Dict[str, Any]]:
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        session = self._require_session()
        async with session.get(f"{source['api_base_url']}/alerts", headers=headers) as resp:
            alerts = await resp.json()
        return [
            {
                "external_id": a["id"],
                "external_asset_id": a["deviceId"],
                "alert_type": a["type"],
                "severity": a["severity"],
                "message": a["message"],
                "raw_data": json.dumps(a),
            }
            for a in alerts
        ]

    async def poll_franklin_monitors(self, source_id: int) -> List[Dict[str, Any]]:
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        session = self._require_session()
        async with session.get(
            f"{source['api_base_url']}/alerts/active", headers=headers
        ) as resp:
            alerts = await resp.json()
        return [
            {
                "external_id": a["alertId"],
                "external_asset_id": a["assetId"],
                "alert_type": a["alertType"],
                "severity": a["severity"],
                "message": a["description"],
                "raw_data": json.dumps(a),
            }
            for a in alerts
        ]

    async def poll_temp_ticks(self, source_id: int) -> List[Dict[str, Any]]:
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        session = self._require_session()
        async with session.get(
            f"{source['api_base_url']}/temperatures/alerts", headers=headers
        ) as resp:
            alerts = await resp.json()
        return [
            {
                "external_id": a["id"],
                "external_asset_id": a["sensorId"],
                "alert_type": "TemperatureAlert",
                "severity": "High" if a["level"] > 1 else "Medium",
                "message": f"Temperature {a['temp']}°F exceeds threshold",
                "raw_data": json.dumps(a),
            }
            for a in alerts
        ]

    async def poll_teamviewer(self, source_id: int) -> List[Dict[str, Any]]:
        headers = await self.get_auth_headers(source_id)
        source = self.monitor_sources[source_id]
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    SELECT external_id FROM app.MonitorAssetMappings WHERE source_id = ?
                    """,
                    (source_id,),
                )
                device_ids = [row[0] for row in await cursor.fetchall()]

        alerts: List[Dict[str, Any]] = []
        session = self._require_session()
        for device_id in device_ids:
            async with session.get(
                f"{source['api_base_url']}/devices/{device_id}", headers=headers
            ) as resp:
                if resp.status == 200:
                    device = await resp.json()
                    if not device.get("online", False):
                        alerts.append(
                            {
                                "external_id": f"offline_{device_id}_{datetime.now(timezone.utc).isoformat()}",
                                "external_asset_id": device_id,
                                "alert_type": "DeviceOffline",
                                "severity": "Medium",
                                "message": f"Device {device.get('alias', device_id)} is offline",
                                "raw_data": json.dumps(device),
                            }
                        )
        return alerts

    async def insert_alerts(self, source_id: int, alerts: List[Dict[str, Any]]) -> None:
        if not alerts:
            return
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                for a in alerts:
                    await cursor.execute(
                        """
                        INSERT INTO app.AlertQueue (
                            source_id, external_id, external_asset_id,
                            alert_type, severity, message, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            source_id,
                            a["external_id"],
                            a["external_asset_id"],
                            a["alert_type"],
                            a["severity"],
                            a["message"],
                            a["raw_data"],
                        ),
                    )
                await conn.commit()

    async def update_last_poll(self, source_id: int) -> None:
        async with aioodbc.connect(dsn=self.db_conn_str) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    UPDATE app.MonitorSources SET last_poll_at = SYSUTCDATETIME()
                    WHERE source_id = ?
                    """,
                    (source_id,),
                )
                await conn.commit()

    async def poll_source(self, source_id: int) -> None:
        try:
            source = self.monitor_sources[source_id]
            alerts: Optional[List[Dict[str, Any]]] = None
            if source["name"] == "Insight360":
                alerts = await self.poll_insight360(source_id)
            elif source["name"] == "FranklinMonitors":
                alerts = await self.poll_franklin_monitors(source_id)
            elif source["name"] == "TempStick":
                alerts = await self.poll_temp_ticks(source_id)
            elif source["name"] == "TeamViewer":
                alerts = await self.poll_teamviewer(source_id)
            else:
                logger.warning("Unknown monitor source", source_id=source_id)
                return

            await self.insert_alerts(source_id, alerts or [])
            await self.update_last_poll(source_id)
            logger.info(
                "Successfully polled source",
                source=source["name"],
                alert_count=len(alerts or []),
            )
        except Exception as e:
            logger.error("Error polling source", source_id=source_id, error=str(e))

    async def run(self) -> None:
        while True:
            try:
                await self.refresh_monitor_sources()
                for source_id in list(self.monitor_sources.keys()):
                    await self.poll_source(source_id)
                async with aioodbc.connect(dsn=self.db_conn_str) as conn:
                    async with conn.cursor() as cursor:
                        await cursor.execute("EXEC app.usp_ProcessAlertQueue")
                        await conn.commit()
            except Exception as e:
                logger.error("Error in polling loop", error=str(e))
            await asyncio.sleep(60)


async def main() -> None:
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ]
    )

    # Prefer container-provided DSN via environment; fallback is for local dev only
    conn_str = os.environ.get("DB_DSN", "DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=OpsGraph;UID=sa;PWD=YourStrong!Passw0rd")
    poller = AlertPoller(conn_str)
    try:
        await poller.setup()
        await poller.run()
    finally:
        await poller.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
