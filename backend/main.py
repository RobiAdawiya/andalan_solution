import json
import psycopg2
import paho.mqtt.client as mqtt
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import threading
import time
import logging
import os

# Enable debug logging (set to logging.INFO for production)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# ==============================
# CONSTANTS AND CONFIG
# ==============================
DB_CONFIG = {
    "host": "localhost",
    "database": "database_barcode",
    "user": "postgres",
    "password": "a",
    "port": "5432"
}

MQTT_BROKER = os.getenv("MQTT_BROKER", "192.168.1.205") 
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

TOPIC_MANPOWER = "data/manpower"
TOPIC_PRODUCT = "data/product"
TOPIC_MACHINE = "data/machine"

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
    """Fungsi untuk menahan aplikasi sampai Database benar-benar siap."""
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
        self.emg_active = False
        self.last_login = None  # Cache last manpower login state
        self.last_product = None  # Cache last product state
        self.client = None

    def update_cached_states(self):
        """Update cached states from DB to reduce frequent queries."""
        try:
            # Update last login
            self.last_login = fetch_one("SELECT nik, name, status FROM log_manpower ORDER BY created_at DESC LIMIT 1")

            # Update last product
            self.last_product = fetch_one("SELECT machine_name, name_product, action, name_manpower FROM log_product ORDER BY created_at DESC LIMIT 1")
        except Exception as e:
            logging.error(f"Error updating cached states: {e}")

    # ==============================
    # EMERGENCY HANDLER
    # ==============================
    def handle_emergency(self):
        try:
            # Always fetch the latest EMG value from DB to ensure accuracy
            emg = fetch_one(f"SELECT tag_value FROM log_machine WHERE tag_name='{EMG_TAG_NAME}' ORDER BY created_at DESC LIMIT 1")
            current_emg = int(emg["tag_value"]) if emg else 0

            logging.debug(f"EMG check: current value = {current_emg}, active flag = {self.emg_active}")

            if current_emg != 1:
                if self.emg_active:  # EMG just turned off
                    self.emg_active = False
                    logging.info("EMG deactivated")
                    self.client.publish("data/feedback/emg", json.dumps({"status": "deactivated"}), qos=1)
                return

            if self.emg_active:  # Already handled, skip
                return

            self.emg_active = True
            logging.warning("🚨 EMERGENCY ACTIVE → FORCE LOGOUT & STOP")

            # --- FORCE LOGOUT MANPOWER ---
            manpower = fetch_one("""
                SELECT nik, name
                FROM log_manpower lm
                WHERE lm.status='login'
                AND NOT EXISTS (
                    SELECT 1 FROM log_manpower lo
                    WHERE lo.nik=lm.nik AND lo.status='logout' AND lo.created_at>lm.created_at
                )
                ORDER BY lm.created_at DESC LIMIT 1
            """)

            if manpower:
                execute_query("""
                    INSERT INTO log_manpower (created_at, nik, name, status)
                    VALUES (NOW(), %s, %s, 'logout')
                """, (manpower["nik"], manpower["name"]))
                logging.info(f"👷 Force Logout: {manpower['name']}")
                self.last_login = {"nik": manpower["nik"], "name": manpower["name"], "status": "logout"}  # Update cache

                self.client.publish(
                    "machine_01/cmd",
                    json.dumps({"w": [{"tag": "ManPower_Validation", "value": 0}]}),
                    qos=1
                )

            # --- FORCE STOP PRODUCT ---
            product = self.last_product  # Use cached
            if not product:
                product = fetch_one("SELECT machine_name, name_product, action, name_manpower FROM log_product ORDER BY created_at DESC LIMIT 1")

            if product and product["action"].lower() == "start":
                execute_query("""
                    INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
                    VALUES (NOW(), %s, %s, 'stop', %s)
                """, (
                    product["machine_name"],
                    product["name_product"],
                    product["name_manpower"]
                ))
                logging.info(f"🛑 Force Stop Product: {product['name_product']}")
                self.last_product = {**product, "action": "stop"}  # Update cache

                self.client.publish(
                    "machine_01/cmd",
                    json.dumps({"w": [{"tag": "Product_Validation", "value": 0}]}),
                    qos=1
                )

            # Publish EMG feedback
            self.client.publish("data/feedback/emg", json.dumps({"status": "active", "message": "Emergency triggered"}), qos=1)

        except Exception as e:
            logging.error(f"EMG handling error: {e}")

    def emg_loop(self):
        while True:
            try:
                self.handle_emergency()
            except Exception as e:
                logging.error(f"❌ EMG LOOP ERROR: {e}")
            time.sleep(5)  # Check every 5 seconds

    # ==============================
    # MANPOWER LOGIC
    # ==============================
    def handle_manpower(self, data):
        nik = data.get("nik")
        name = data.get("name")

        if not nik or not name:
            return False, "Field nik / name kosong"

        row = fetch_one("SELECT nik, name FROM manpower WHERE nik=%s", (nik,))
        if not row or row["name"].lower() != name.lower():
            return False, "Manpower tidak valid"

        # Fetch EMG directly from DB for accuracy in manpower logic
        emg = fetch_one(f"SELECT tag_value FROM log_machine WHERE tag_name='{EMG_TAG_NAME}' ORDER BY created_at DESC LIMIT 1")
        machine_status = int(emg["tag_value"]) if emg else 0

        last_product = self.last_product  # Use cached
        last_login = self.last_login  # Use cached

        # INGIN LOGIN
        if not last_login or last_login["status"] == "logout":
            if machine_status == 1:
                return False, "Gagal Login: WISE4050:PB_EMG (1). Harap matikan WISE4050:PB_EMG dulu."

            execute_query("""
                INSERT INTO log_manpower (created_at, nik, name, status)
                VALUES (NOW(), %s, %s, 'login')
            """, (nik, name))
            self.last_login = {"nik": nik, "name": name, "status": "login"}  # Update cache
            return True, "Login berhasil"

        # INGIN LOGOUT
        if not last_login or last_login["status"] == "login":
            if machine_status == 0:
                return False, "Gagal Logout: WISE4050:PB_EMG (0). Harap nyalakan WISE4050:PB_EMG dulu."
            if str(last_login["nik"]) != str(nik):
                return False, f"Gagal: {last_login['name']} sedang login"

            status_msg = "Logout berhasil"

            if last_product and last_product["action"].lower() == "start":
                execute_query("""
                    INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
                    VALUES (NOW(), %s, %s, 'stop', %s)
                """, (
                    last_product["machine_name"],
                    last_product["name_product"],
                    last_product["name_manpower"]
                ))
                status_msg += " & Product Auto-Stop"
                self.last_product = {**last_product, "action": "stop"}  # Update cache

            execute_query("""
                INSERT INTO log_manpower (created_at, nik, name, status)
                VALUES (NOW(), %s, %s, 'logout')
            """, (nik, name))
            self.last_login = {"nik": nik, "name": name, "status": "logout"}  # Update cache

            return True, status_msg

        return False, "Status logic tidak dikenal"

    # ==============================
    # PRODUCT LOGIC
    # ==============================
    def handle_product(self, data):
        machine = data.get("machine_name")
        product = data.get("name_product")

        if not machine or not product:
            return False, "Data product tidak lengkap"

        row = fetch_one("SELECT name_product FROM product WHERE machine_name=%s AND name_product=%s", (machine, product))
        if not row or row["name_product"].lower() != product.lower():
            return False, "Produk tidak sesuai mesin"

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
            return False, "Tidak ada manpower login"

        last_product = fetch_one(f"SELECT action FROM log_product WHERE machine_name=%s ORDER BY created_at DESC LIMIT 1", (machine,))

        action = "start" if not last_product or last_product["action"].lower() == "stop" else "stop"

        execute_query("""
            INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
            VALUES (NOW(), %s, %s, %s, %s)
        """, (machine, product, action, manpower["name"]))

        # Update cache for global last product
        self.last_product = {"machine_name": machine, "name_product": product, "action": action, "name_manpower": manpower["name"]}

        return True, f"Product valid, action: {action}, manpower: {manpower['name']}"

    # ==============================
    # MQTT CALLBACKS
    # ==============================
    def on_connect(self, client, userdata, flags, rc):
        self.client = client  # Set client reference
        if rc == 0:
            logging.info("✅ Connected to Broker")
            client.subscribe([(TOPIC_MANPOWER, 1), (TOPIC_PRODUCT, 1), (TOPIC_MACHINE, 1)])
        else:
            logging.error(f"Connection failed with code {rc}")

    def on_message(self, client, userdata, msg):
        logging.info(f"\n📩 {msg.topic}")

        try:
            payload = json.loads(msg.payload.decode())
        except:
            logging.error("Payload bukan JSON")
            return

        # ---------- HANDLE MACHINE (LOG DATA) ----------
        if msg.topic == TOPIC_MACHINE:
            tag_name = payload.get("tag_name")
            tag_value = payload.get("tag_value")
            if tag_name and tag_value is not None:
                execute_query("""
                    INSERT INTO log_machine (created_at, tag_name, tag_value)
                    VALUES (NOW(), %s, %s)
                """, (tag_name, tag_value))
                logging.debug(f"Logged machine data: {tag_name} = {tag_value}")
                # No need to update cache here since EMG is now queried directly
            return  # No further processing for machine topic

        # ---------- HANDLE MANPOWER ----------
        if msg.topic == TOPIC_MANPOWER:
            success, message = self.handle_manpower(payload)

            if success:
                # 1. Kirim Sinyal Manpower (Login=1, Logout=0)
                val = 1 if "Login berhasil" in message else 0
                client.publish(
                    "machine_01/cmd",
                    json.dumps({"w": [{"tag": "ManPower_Validation", "value": val}]}),
                    qos=1
                )

                # 2. [AUTO-STOP] Jika terjadi Auto-Stop, kirim sinyal matikan produk
                if "Auto-Stop" in message:
                    client.publish(
                        "machine_01/cmd",
                        json.dumps({"w": [{"tag": "Product_Validation", "value": 0}]}),
                        qos=1
                    )
                    logging.info("⚠️ Command sent: Force Stop Product (Auto-Stop)")

                # Feedback Dashboard (only on success)
                client.publish(
                    "data/feedback/manpower",
                    json.dumps({
                        "nik": payload.get("nik"),
                        "name": payload.get("name"),
                        "success": success,
                        "message": message
                    }),
                    qos=1
                )
                logging.info(f"Feedback Manpower: {message}")

        # ---------- HANDLE PRODUCT ----------
        elif msg.topic == TOPIC_PRODUCT:
            success, message = self.handle_product(payload)

            if success:
                val_prod = 1 if "action: start" in message.lower() else 0
                client.publish(
                    "machine_01/cmd",
                    json.dumps({"w": [{"tag": "Product_Validation", "value": val_prod}]}),
                    qos=1
                )

            # Use cached last product for feedback
            product_info = self.last_product

            client.publish(
                "data/feedback/product",
                json.dumps({
                    "machine_name": product_info["machine_name"] if product_info else None,
                    "name_product": product_info["name_product"] if product_info else None,
                    "success": success,
                    "message": message
                }),
                qos=1
            )
            logging.info(f"Feedback Product: {message}")

    def run(self):
        wait_for_db()
        self.update_cached_states()
        
        client = mqtt.Client()
        client.on_connect = self.on_connect
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

        threading.Thread(target=self.emg_loop, daemon=True).start()

        client.loop_forever()

system = BarcodeSystem()
# ==============================
# MAIN PROGRAM
# ==============================
if __name__ == "__main__":
    system.run()