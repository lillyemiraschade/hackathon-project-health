from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.realtime import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/provider")
async def provider_ws(websocket: WebSocket):
    await manager.connect_provider(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Provider can send messages to patients through here
    except WebSocketDisconnect:
        manager.disconnect_provider(websocket)


@router.websocket("/ws/patient/{patient_id}")
async def patient_ws(websocket: WebSocket, patient_id: int):
    await manager.connect_patient(websocket, patient_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_patient(websocket, patient_id)
