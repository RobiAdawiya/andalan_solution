# mqtt/handlers.py
import json
from services.manpower import handle_manpower
from services.product import handle_product
from db_connection import fetch_one

def on_message(client, userdata, msg):
    print("\nTOPIC :", msg.topic)

    try:
        payload = json.loads(msg.payload.decode())
    except:
        print("Payload bukan JSON")
        return

    if msg.topic == "data/manpower":
        success, message = handle_manpower(payload)

        if success:
            val = 1 if message == "Login berhasil" else 0
            client.publish("machine_01/cmd", json.dumps({
                "w": [{"tag": "ManPower_Validation", "value": val}]
            }), qos=1)

        client.publish("data/feedback/manpower", json.dumps({
            "nik": payload.get("nik"),
            "name": payload.get("name"),
            "success": success,
            "message": message
        }), qos=1)

    elif msg.topic == "data/product":
        success, message = handle_product(payload)

        if success:
            val = 1 if "start" in message.lower() else 0
            client.publish("machine_01/cmd", json.dumps({
                "w": [{"tag": "Product_Validation", "value": val}]
            }), qos=1)

        product_info = fetch_one("""
            SELECT machine_name, name_product 
            FROM log_product 
            ORDER BY created_at DESC
            LIMIT 1
        """)

        client.publish("data/feedback/product", json.dumps({
            "machine_name": product_info["machine_name"] if product_info else None,
            "name_product": product_info["name_product"] if product_info else None,
            "success": success,
            "message": message
        }), qos=1)

def on_connect(client, userdata, flags, rc):
    print("Server terhubung ke Broker!")