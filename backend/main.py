import json
import psycopg2
import paho.mqtt.client as mqtt
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import threading
import time
import logging
import os

# Enable DEBUG logging to show DEBUG messages
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# ==============================
# DB CONSTANTS AND CONFIG
# ==============================
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "database_barcode"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASS", "a"),
    "host": os.getenv("DB_HOST", "postgres-db"),
    "port": os.getenv("DB_PORT", "5432")
}

# MQTT CONFIG
MQTT_BROKER = os.getenv("MQTT_BROKER", "192.168.1.205") 
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

# Topic
TOPIC_MANPOWER = "data/manpower"
TOPIC_PRODUCT = "data/product"
TOPIC_MACHINE = "data/machine"
FEEDBACK_MANPOWER = "data/feedback/manpower"
FEEDBACK_PRODUCT = "data/feedback/product"
CMD_MACHINE = "machine_01/cmd"

EMG_TAG_NAME = "WISE4050:PB_EMG"

# ==============================
# DATABASE HELPERS
# ==============================
@contextmanager
def db_session():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
    except Exception as e:
        logging.error(f"DATABASE ERROR: {e}")
        raise
    finally:
        conn.close()

def fetch_one(query, params=None):
    with db_session() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchone()

def execute_query(query, params=None):
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()

def wait_for_db():
    logging.info("⏳ Memeriksa koneksi Database...")
    while True:
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            conn.close()
            logging.info("✅ Database Terhubung!")
            break
        except Exception as e:
            logging.warning(f"Database belum siap, mencoba lagi dalam 5 detik... Error: {e}")
            time.sleep(5)

# ==============================
# MAIN SYSTEM CLASS
# ==============================
class BarcodeSystem:
    def __init__(self):
        self.last_login = None  # Cache last manpower login state
        self.last_product = None  # Cache last product state
        self.client = None
        self.mqtt_connected = False

    def update_cached_states(self):
        try:
            # Update last login
            self.last_login = fetch_one("SELECT nik, name, status FROM log_manpower ORDER BY created_at DESC LIMIT 1")

            # Update last product
            self.last_product = fetch_one("SELECT machine_name, name_product, action, name_manpower FROM log_product ORDER BY created_at DESC LIMIT 1")
        except Exception as e:
            logging.error(f"Error updating cached states: {e}")

    # ==============================
    # MANPOWER LOGIC
    # ==============================
    def handle_manpower(self, data):
        nik = data.get("nik")
        name = data.get("name")

        if not nik or not name:
            logging.warning("Manpower: Field nik / name kosong")
            return False, "Login" if not self.last_login or self.last_login["status"] == "logout" else "Logout", None

        row = fetch_one("SELECT nik, name FROM manpower WHERE nik=%s", (nik,))
        if not row or row["name"].lower() != name.lower():
            logging.warning(f"Manpower: NIK {nik} tidak valid atau nama tidak cocok")
            return False, "Login" if not self.last_login or self.last_login["status"] == "logout" else "Logout", None

        emg = fetch_one(f"SELECT tag_value FROM log_machine WHERE tag_name='{EMG_TAG_NAME}' ORDER BY created_at DESC LIMIT 1")
        machine_status = int(emg["tag_value"]) if emg else 0

        last_login = self.last_login
        last_product = self.last_product  

        attempted_action = "Login" if not last_login or last_login["status"] == "logout" else "Logout"

        logging.info(f"Manpower: {attempted_action} attempted by {name} (NIK: {nik})")

        if not last_login or last_login["status"] == "logout":
            logging.debug(f"DEBUG Login successfully Name : {name}, NIK : {nik}")
            logging.info(f"✅ Manpower: {name} (NIK: {nik}) logged in successfully")
            execute_query("""
                INSERT INTO log_manpower (created_at, nik, name, status)
                VALUES (NOW(), %s, %s, 'login')
            """, (nik, name))
            self.last_login = {"nik": nik, "name": name, "status": "login"}  # Update cache
            return True, attempted_action, attempted_action
        
        if last_login["status"] == "login":
            if machine_status != 1:
                logging.warning(f"❌ Manpower: Logout failed for {name} (NIK: {nik}) - EMG tidak aktif")
                return False, attempted_action, None
            if str(last_login["nik"]) != str(nik):
                logging.warning(f"❌ Manpower: Logout failed - {last_login['name']} sedang login, bukan {name}")
                return False, attempted_action, None

            status_msg = attempted_action

            if last_product and last_product["action"].lower() == "start":
                logging.info("Manpower: Auto-stopping product karena logout")
                execute_query("""
                    INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
                    VALUES (NOW(), %s, %s, 'stop', %s)
                """, (
                    last_product["machine_name"],
                    last_product["name_product"],
                    last_product["name_manpower"]
                ))
                status_msg += " & Product Auto-Stop"
                self.last_product = {**last_product, "action": "stop"}  

            logging.debug(f"DEBUG Logout successfully Name : {name}, NIK : {nik}")
            logging.info(f"✅ Manpower: {name} (NIK: {nik}) logged out successfully")
            execute_query("""
                INSERT INTO log_manpower (created_at, nik, name, status)
                VALUES (NOW(), %s, %s, 'logout')
            """, (nik, name))
            self.last_login = {"nik": nik, "name": name, "status": "logout"}  

            return True, attempted_action, status_msg

        logging.warning("Manpower: Status logic tidak dikenal")
        return False, attempted_action, None

    # ==============================
    # PRODUCT LOGIC
    # ==============================
    def handle_product(self, data):
        machine = data.get("machine_name")
        product = data.get("name_product")

        if not machine or not product:
            logging.warning("Product: Data product tidak lengkap")
            return False, "Data product tidak lengkap"

        row = fetch_one("SELECT name_product FROM product WHERE machine_name=%s AND name_product=%s", (machine, product))
        if not row or row["name_product"].lower() != product.lower():
            logging.warning(f"Product: Produk '{product}' Product gagal '{machine}'")
            return False, "Product gagal"
        
        manpower = fetch_one("""
            SELECT nik, name FROM log_manpower lm
            WHERE lm.status='login'
            AND NOT EXISTS (
                SELECT 1 FROM log_manpower lo
                WHERE lo.nik=lm.nik AND lo.status='logout' AND lo.created_at>lm.created_at
            )
            ORDER BY lm.created_at DESC LIMIT 1
        """)

        if not manpower:
            logging.warning("Product: Tidak ada manpower login")
            return False, "Tidak ada manpower login"

        last_product = fetch_one(f"SELECT action FROM log_product WHERE machine_name=%s ORDER BY created_at DESC LIMIT 1", (machine,))

        action = "start" if not last_product or last_product["action"].lower() == "stop" else "stop"

        logging.debug(f"DEBUG Product {action} successfully Name : {manpower['name']}, NIK : {manpower['nik']}")
        logging.info(f"✅ Product: {action.capitalize()} '{product}' on machine '{machine}' by {manpower['name']} (NIK: {manpower['nik']})")
        execute_query("""
            INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
            VALUES (NOW(), %s, %s, %s, %s)
        """, (machine, product, action, manpower["name"]))

        self.last_product = {"machine_name": machine, "name_product": product, "action": action, "name_manpower": manpower["name"]}

        return True, f"Product valid, action: {action}, manpower: {manpower['name']}"

    # ==============================
    # MACHINE LOGIC (LOG DATA)
    # ==============================
    def handle_machine(self, data):
        tag_name = data.get("tag_name")
        tag_value = data.get("tag_value")
        if tag_name and tag_value is not None:
            execute_query("""
                INSERT INTO log_machine (created_at, tag_name, tag_value)
                VALUES (NOW(), %s, %s)
            """, (tag_name, tag_value))
            logging.info(f"Machine: Logged data - {tag_name} = {tag_value}")

    # ==============================
    # MQTT CALLBACKS
    # ==============================
    def on_connect(self, client, userdata, flags, rc):
        self.client = client  
        if rc == 0:
            logging.info("✅ Connected to Broker")
            self.mqtt_connected = True
            # Subscribe to all defined topics
            client.subscribe([
                (TOPIC_MANPOWER, 1),
                (TOPIC_PRODUCT, 1),
                (TOPIC_MACHINE, 1)
            ])
        else:
            logging.error(f"Connection failed with code {rc}")
            self.mqtt_connected = False

    def on_disconnect(self, client, userdata, rc):
        logging.warning(f"MQTT Disconnected with code {rc}")
        self.mqtt_connected = False

    def on_message(self, client, userdata, msg):
        logging.info(f"📩 Received message on {msg.topic}")

        try:
            payload = json.loads(msg.payload.decode())
        except:
            logging.error("Payload bukan JSON")
            return

        handlers = {
            TOPIC_MANPOWER: self.handle_manpower,
            TOPIC_PRODUCT: self.handle_product,
            TOPIC_MACHINE: self.handle_machine
        }

        if msg.topic in handlers:
            if msg.topic == TOPIC_MACHINE:
                handlers[msg.topic](payload)
                return  


            if msg.topic == TOPIC_MANPOWER:
                success, message, status_msg = handlers[msg.topic](payload)
                feedback_topic = FEEDBACK_MANPOWER
                if message == "Login":
                    msg_text = "Login Berhasil" if success else "Login Gagal"
                elif message == "Logout":
                    msg_text = "Logout Berhasil" if success else "Logout Gagal"
                else:
                    msg_text = "Unknown"
                feedback_payload = {
                    "nik": payload.get("nik"),
                    "name": payload.get("name"),
                    "success": success,
                    "message": msg_text
                }
                if success:
                    val = 1 if message == "Login" else 0
                    client.publish(CMD_MACHINE, json.dumps({"w": [{"tag": "ManPower_Validation", "value": val}]}), qos=1)
                    if status_msg and "Auto-Stop" in status_msg:
                        client.publish(CMD_MACHINE, json.dumps({"w": [{"tag": "Product_Validation", "value": 0}]}), qos=1)
                        logging.info("⚠️ Command sent: Force Stop Product (Auto-Stop)")
            elif msg.topic == TOPIC_PRODUCT:
                success, message = handlers[msg.topic](payload)
                feedback_topic = FEEDBACK_PRODUCT
                product_info = self.last_product
                feedback_payload = {
                    "machine_name": product_info["machine_name"] if product_info else None,
                    "name_product": product_info["name_product"] if product_info else None,
                    "success": success,
                    "message": message
                }
                if success:
                    val_prod = 1 if "action: start" in message.lower() else 0
                    client.publish(CMD_MACHINE, json.dumps({"w": [{"tag": "Product_Validation", "value": val_prod}]}), qos=1)

            # Publish feedback
            client.publish(feedback_topic, json.dumps(feedback_payload), qos=1)
            logging.info(f"Feedback sent to {feedback_topic}: {feedback_payload['message']}")

    def reconnect_mqtt(self):
        while True:
            if not self.mqtt_connected:
                logging.info("⏳ Attempting MQTT reconnection...")
                try:
                    self.client.reconnect()
                except Exception as e:
                    logging.warning(f"MQTT reconnection failed: {e}")
                    time.sleep(5)
            time.sleep(10)  # Check every 10 seconds

    def run(self):
        wait_for_db()
        self.update_cached_states()
        
        client = mqtt.Client()
        client.on_connect = self.on_connect
        client.on_disconnect = self.on_disconnect
        client.on_message = self.on_message
        
        logging.info("⏳ Menghubungkan ke MQTT Broker...")
        while True:
            try:
                client.connect(MQTT_BROKER, MQTT_PORT, 60)
                logging.info("✅ MQTT Terhubung!")
                break
            except Exception as e:
                logging.warning(f"MQTT belum siap, mencoba lagi dalam 5 detik... Error: {e}")
                time.sleep(5)

        # Start MQTT loop in a separate thread
        client.loop_start()
        
        # Start reconnection thread
        threading.Thread(target=self.reconnect_mqtt, daemon=True).start()
        
        # Main infinite loop to keep the server running
        while True:
            try:
                time.sleep(1)  # Keep alive, can add health checks here
            except KeyboardInterrupt:
                logging.info("Shutting down gracefully...")
                client.loop_stop()
                client.disconnect()
                break
            except Exception as e:
                logging.error(f"Unexpected error in main loop: {e}")
                # On error, restart the system after a short delay
                time.sleep(5)
                logging.info("Restarting system...")
                # Note: In a real deployment, you might want to reload configs or reset state here

system = BarcodeSystem()
# ==============================
# MAIN PROGRAM
# ==============================
if __name__ == "__main__":
    system.run()