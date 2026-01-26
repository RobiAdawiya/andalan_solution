# config.py

DB_CONFIG = {
    "host": "192.168.1.48",
    "dbname": "database_barcode",
    "user": "postgres",
    "password": "a",
    "port": 5432
}

MQTT_BROKER = "192.168.1.48"
MQTT_PORT = 1883
SUB_TOPICS = [
    ("data/manpower", 1),
    ("data/product", 1),
    ("machine_01/data", 1)
]