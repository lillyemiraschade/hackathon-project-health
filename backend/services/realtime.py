"""Real-time event broadcasting via WebSocket."""
from __future__ import annotations

from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio


class ConnectionManager:
    def __init__(self) -> None:
        self.provider_connections: List[WebSocket] = []
        self.patient_connections: Dict[int, List[WebSocket]] = {}  # patient_id -> connections

    async def connect_provider(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.provider_connections.append(websocket)

    async def connect_patient(self, websocket: WebSocket, patient_id: int) -> None:
        await websocket.accept()
        if patient_id not in self.patient_connections:
            self.patient_connections[patient_id] = []
        self.patient_connections[patient_id].append(websocket)

    def disconnect_provider(self, websocket: WebSocket) -> None:
        self.provider_connections.remove(websocket)

    def disconnect_patient(self, websocket: WebSocket, patient_id: int) -> None:
        if patient_id in self.patient_connections:
            self.patient_connections[patient_id].remove(websocket)

    async def broadcast_to_providers(self, message: dict) -> None:
        dead: List[WebSocket] = []
        for conn in self.provider_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.provider_connections.remove(d)

    async def send_to_patient(self, patient_id: int, message: dict) -> None:
        dead: List[WebSocket] = []
        for conn in self.patient_connections.get(patient_id, []):
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.patient_connections[patient_id].remove(d)


manager = ConnectionManager()
