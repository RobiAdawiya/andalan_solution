import paho.mqtt.client as mqtt
import psycopg2
from psycopg2.extras import execute_values
import json
from datetime import datetime
import threading
import queue
import time

# --- Configuration ---
MQTT_BROKER = "192.168.1.205"
MQTT_TOPIC = "machine_01/data"
DB_CONFIG = {
    "dbname": "database_barcode",
    "user": "postgres",
    "password": "a",
    "host": "localhost",
    "port": "5432"
}

# --- Global Database Connection ---
conn = None

def get_db_connection():
    global conn
    if conn is None or conn.closed != 0:
        conn = psycopg2.connect(**DB_CONFIG)
    return conn

# --- Queue for asynchronous processing ---
message_queue = queue.Queue()

def db_worker():
    """Worker thread to process DB inserts asynchronously."""
    while True:
        try:
            payload = message_queue.get(timeout=1)  # Wait for a message
            save_to_db(payload)
            message_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"DB Worker Error: {e}")

def save_to_db(payload):
    try:
        data = json.loads(payload)
        timestamp = data.get("ts")
        machine_id = "machine_01"
        
        items = data.get("d", [])
        if not items:
            return

        values = [
            (machine_id, item.get("tag"), item.get("value"), timestamp)
            for item in items
        ]

        connection = get_db_connection()
        with connection.cursor() as cur:
            query = """
                INSERT INTO log_machine (machine_id, tag_name, tag_value, recorded_at)
                VALUES %s
            """
            execute_values(cur, query, values)
            connection.commit()
            
        print(f"[{datetime.now()}] Stored {len(values)} tags for {timestamp}")
        
    except Exception as e:
        print(f"Error saving to DB: {e}")
        if conn:
            conn.rollback()

# --- MQTT Callbacks ---
def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    # Put message in queue for async processing
    message_queue.put(msg.payload.decode())

def on_disconnect(client, userdata, rc):
    print(f"Disconnected with result code {rc}")
    if rc != 0:
        print("Unexpected disconnection. Reconnecting...")
        time.sleep(5)  # Wait before reconnecting
        client.reconnect()

# --- Main ---
if __name__ == "__main__":
    # Start DB worker thread
    db_thread = threading.Thread(target=db_worker, daemon=True)
    db_thread.start()

    # MQTT Client
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    client.connect(MQTT_BROKER, 1883, 60)
    client.loop_forever()