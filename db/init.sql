-- SET TIMEZONE KE ASIA/JAKARTA (WIB)
SET TIME ZONE 'Asia/Jakarta';

CREATE TABLE IF NOT EXISTS manpower (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    name_product VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS log_manpower (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    nik VARCHAR(50),
    name VARCHAR(100),
    status VARCHAR(10) CHECK (status IN ('login', 'logout'))
);

CREATE TABLE IF NOT EXISTS log_product (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    machine_name VARCHAR(100) NOT NULL,
    name_product VARCHAR(100) NOT NULL,
    action VARCHAR(20) CHECK (action IN ('start','stop')),
    name_manpower VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS log_machine (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    machine_id VARCHAR(50),
    tag_name VARCHAR(100),
    tag_value VARCHAR(100),
    recorded_at VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    passwords VARCHAR(255) NOT NULL
);

-- 8. TABEL HEADER WO
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. TABEL DETAIL WO
CREATE TABLE work_order_details (
    id SERIAL PRIMARY KEY,
    wo_number VARCHAR(50) REFERENCES work_orders(wo_number) ON DELETE CASCADE,
    machine_name VARCHAR(100) NOT NULL, 
    product_name VARCHAR(100) NOT NULL
);

CREATE VIEW v_work_order_details AS
SELECT 
    id, 
    wo_number, 
    machine_name, 
    product_name, 
    CASE WHEN closed THEN 'Yes' ELSE 'No' END AS closed_status
FROM work_order_details;

-- SEEDING AWAL
INSERT INTO manpower (nik, name, department, position) VALUES ('337', 'syafina', 'Data Science', 'Staff'), ('451', 'Alice Brown', 'Finance', 'Manager') ON CONFLICT (nik) DO NOTHING;
INSERT INTO product (machine_name, name_product) VALUES ('machine_01', 'SAMSUNG'), ('machine_01', 'HUAWEI'), ('machine_02', 'RADEON'), ('machine_02', 'HUAWEI'), ('machine_03', 'RADEON'), ('machine_03', 'SNAPDRAGON') ON CONFLICT DO NOTHING;
INSERT INTO devices (machine_name, serial_number) VALUES ('machine_01', 'SN-0502'), ('machine_02', 'SN-0504'), ('machine_03', 'SN-0505') ON CONFLICT (serial_number) DO NOTHING;
INSERT INTO accounts (username, passwords) VALUES ('admin', 'admin') ON CONFLICT (username) DO NOTHING;

-- INISIALISASI STATUS
INSERT INTO log_manpower (created_at, nik, name, status) SELECT NOW(), nik, name, 'logout' FROM manpower;
INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower) SELECT NOW(), machine_name, name_product, 'stop', 'Initial Settings' FROM product;

-- INISIALISASI WORK ORDER AWAL
INSERT INTO work_orders (wo_number, created_at) VALUES ('WO-INITIAL-01', NOW()) ON CONFLICT DO NOTHING;

-- INISIALISASI SEMUA PARTS KE DALAM WO TERSEBUT DENGAN STATUS CLOSED = TRUE (Yes)
INSERT INTO work_order_details (wo_number, machine_name, product_name, closed) SELECT 'WO-INITIAL-01', machine_name, name_product, true FROM product;