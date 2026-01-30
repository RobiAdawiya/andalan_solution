-- 1. Master Data Manpower
CREATE TABLE IF NOT EXISTS manpower (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100)
);

-- 2. Master Data Product
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    name_product VARCHAR(100) NOT NULL
);

-- 3. Log Manpower
CREATE TABLE IF NOT EXISTS log_manpower (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    nik VARCHAR(50),
    name VARCHAR(100),
    status VARCHAR(10) CHECK (status IN ('login', 'logout'))
);

-- 4. Log Product
CREATE TABLE IF NOT EXISTS log_product (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    machine_name VARCHAR(100),
    name_product VARCHAR(100),
    action VARCHAR(20) CHECK (action IN ('start', 'stop')), -- 'start' atau 'stop'
    name_manpower VARCHAR(100)
);

-- 5. Log Machine (Data dari MQTT)
CREATE TABLE IF NOT EXISTS log_machine (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    machine_id VARCHAR(50),
    tag_name VARCHAR(100),
    tag_value VARCHAR(100),
    recorded_at VARCHAR(100)
);

-- INSERT DATA AWAL (Contoh agar bisa testing login)
INSERT INTO manpower (nik, name, department, position) 
VALUES ('337', 'syafina', 'Data Science', 'Staff'),
       ('451', 'Alice Brown', 'Finance', 'Manager')
ON CONFLICT DO NOTHING;

INSERT INTO product (machine_name, name_product) 
VALUES ('machine_01', 'SAMSUNG'),
       ('machine_01', 'HUAWEI')
ON CONFLICT DO NOTHING;