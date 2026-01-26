# db/connection.py
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def fetch_one(query, params=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchone()
    finally:
        conn.close()

def insert_log_manpower(nik, name, action):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO log_manpower (created_at, nik, name, action)
                VALUES (NOW(), %s, %s, %s)
            """, (nik, name, action))
            conn.commit()
    finally:
        conn.close()

def insert_log_product(machine, product, action, name_manpower):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
                VALUES (NOW(), %s, %s, %s, %s)
            """, (machine, product, action, name_manpower))
            conn.commit()
    finally:
        conn.close()