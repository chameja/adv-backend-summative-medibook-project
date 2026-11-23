-- =====================================================================
-- MediBook — Clinic Appointment System
--
-- Run on a fresh server:
--   mysql -u <user> -p < database/schema.sql
--
-- Business rules (working hours, slot boundaries, 12/day cap, refunds)
-- are validated in the application layer.
-- =====================================================================

DROP DATABASE IF EXISTS medibook;
CREATE DATABASE medibook;

USE medibook;

CREATE TABLE patients (
  patient_id  INT           NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  phone       VARCHAR(20)   NOT NULL,
  PRIMARY KEY (patient_id)
);

CREATE TABLE doctors (
  doctor_id         INT           NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(100)  NOT NULL,
  specialty         VARCHAR(100)  NOT NULL,
  consultation_fee  DECIMAL(8,2)  NOT NULL,
  room              VARCHAR(50)   NOT NULL,
  PRIMARY KEY (doctor_id)
);

-- Cancelling sets status = 'CANCELLED' (the row is kept for refund history).
-- active_slot is 1 while BOOKED and NULL once CANCELLED, so the UNIQUE key
-- below stops a doctor having two active appointments at the same time,
-- but still lets a cancelled slot be booked again.
CREATE TABLE appointments (
  appointment_id  INT           NOT NULL AUTO_INCREMENT,
  appt_ref        VARCHAR(10)   NOT NULL UNIQUE,
  patient_id      INT           NOT NULL,
  doctor_id       INT           NOT NULL,
  appt_datetime   DATETIME      NOT NULL,
  amount_paid     DECIMAL(8,2)  NOT NULL,
  booked_on       DATE          NOT NULL,
  status          ENUM('BOOKED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
  cancelled_at    DATETIME      NULL,
  refund_amount   DECIMAL(8,2)  NULL,
  active_slot     TINYINT GENERATED ALWAYS AS (IF(status = 'BOOKED', 1, NULL)) STORED,
  PRIMARY KEY (appointment_id),
  UNIQUE KEY uq_doctor_slot (doctor_id, appt_datetime, active_slot),
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id),
  FOREIGN KEY (doctor_id)  REFERENCES doctors (doctor_id)
);
