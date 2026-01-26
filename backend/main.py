# main.py
import threading
import paho.mqtt.client as mqtt
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import MQTT_BROKER, MQTT_PORT, SUB_TOPICS
from mqtt_handlers import on_message, on_connect
from services.manpower import handle_manpower
from services.product import handle_product

# FASTAPI
app = FastAPI(
    title="API Monitoring Produksi & Manpower",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Online", "message": "API Validasi berjalan"}

@app.get("/validate/manpower")
def api_validate_manpower(nik: str, name: str):
    payload = {"nik": nik, "name": name}
    success, message = handle_manpower(payload)
    return {"success": success, "message": message, "data": payload}

@app.get("/validate/product")
def api_validate_product(machine_name: str, name_product: str):
    payload = {"machine_name": machine_name, "name_product": name_product}
    success, message = handle_product(payload)
    return {"success": success, "message": message}

# MQTT (BACKGROUND)
client = mqtt.Client()
client.on_message = on_message
client.on_connect = on_connect

def start_mqtt():
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.subscribe(SUB_TOPICS)
        print("🚀 MQTT background running...")
        client.loop_forever()
    except Exception as e:
        print("Could not connect to MQTT:", e)

# FASTAPI LIFESPAN HOOK
@app.on_event("startup")
def startup_event():
    mqtt_thread = threading.Thread(target=start_mqtt)
    mqtt_thread.daemon = True
    mqtt_thread.start()