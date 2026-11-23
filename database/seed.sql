-- =====================================================================
-- MediBook — sample data (Part B.1)
-- Run after schema.sql:
--   mysql -u <user> -p < database/seed.sql
--
-- Upcoming appointments are dated relative to CURDATE() so the data stays
-- "in the future" whenever the seed is loaded (stats / reports stay meaningful).
--
-- What this data demonstrates:
--   * AP-001..AP-003  the original spreadsheet rows (historical, partial payment on AP-002)
--   * Dr. Boateng     12/12 slots in 3 days' time  -> at the daily cap
--   * Dr. Adjei       10/12 slots in 5 days' time  -> busy day (> 80% of capacity)
--   * AP-028          a cancelled appointment with its refund kept for history,
--                     and AP-029 re-booking that same slot (cancelled slots are reusable)
--   * Dr. Owusu-Ansah no appointments at all (doctors report must still list her)
-- =====================================================================

USE medibook;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE appointments;
TRUNCATE TABLE doctors;
TRUNCATE TABLE patients;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------
INSERT INTO patients (patient_id, full_name, email, phone) VALUES
  (1,  'Ama Mensah',      'ama@mail.com',      '0244-111-222'),
  (2,  'Kojo Owusu',      'kojo@mail.com',     '0555-333-444'),
  (3,  'Efua Asante',     'efua.asante@mail.com',  '0201-555-010'),
  (4,  'Yaw Darko',       'yaw.darko@mail.com',    '0277-404-118'),
  (5,  'Abena Osei',      'abena.osei@mail.com',   '0546-220-731'),
  (6,  'Kwame Appiah',    'kwame.appiah@mail.com', '0243-998-007'),
  (7,  'Akosua Frimpong', 'akosua.f@mail.com',     '0509-871-662'),
  (8,  'Kofi Agyeman',    'kofi.agyeman@mail.com', '0265-130-945');

-- ---------------------------------------------------------------------
-- Doctors (doctor 4 deliberately has no appointments)
-- ---------------------------------------------------------------------
INSERT INTO doctors (doctor_id, full_name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Boateng',     'Dermatology', 150.00, 'R-12'),
  (2, 'Dr. Adjei',       'Paediatrics', 100.00, 'R-03'),
  (3, 'Dr. Nkrumah',     'Cardiology',  250.00, 'R-07'),
  (4, 'Dr. Owusu-Ansah', 'Neurology',   300.00, 'R-15');

-- Relative dates for upcoming appointments
SET @d1 = CURDATE() + INTERVAL 1 DAY;
SET @d2 = CURDATE() + INTERVAL 2 DAY;
SET @d3 = CURDATE() + INTERVAL 3 DAY;
SET @d5 = CURDATE() + INTERVAL 5 DAY;
SET @d6 = CURDATE() + INTERVAL 6 DAY;
SET @d10 = CURDATE() + INTERVAL 10 DAY;

-- ---------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------

-- Historical rows from the original spreadsheet
INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  ('AP-001', 1, 1, '2026-08-10 09:00:00', 150.00, '2026-07-01'),
  ('AP-002', 2, 1, '2026-08-10 09:30:00', 120.00, '2026-07-02'),
  ('AP-003', 1, 2, '2026-08-15 10:00:00', 100.00, '2026-07-03');

-- Dr. Boateng: fully booked day (12 of 12 slots) in 3 days
INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  ('AP-004', 1, 1, TIMESTAMP(@d3, '09:00:00'), 150.00, CURDATE()),
  ('AP-005', 2, 1, TIMESTAMP(@d3, '09:30:00'), 150.00, CURDATE()),
  ('AP-006', 3, 1, TIMESTAMP(@d3, '10:00:00'), 150.00, CURDATE()),
  ('AP-007', 4, 1, TIMESTAMP(@d3, '10:30:00'), 150.00, CURDATE()),
  ('AP-008', 5, 1, TIMESTAMP(@d3, '11:00:00'), 150.00, CURDATE()),
  ('AP-009', 6, 1, TIMESTAMP(@d3, '11:30:00'), 150.00, CURDATE()),
  ('AP-010', 7, 1, TIMESTAMP(@d3, '13:00:00'), 150.00, CURDATE()),
  ('AP-011', 8, 1, TIMESTAMP(@d3, '13:30:00'), 150.00, CURDATE()),
  ('AP-012', 3, 1, TIMESTAMP(@d3, '14:00:00'), 150.00, CURDATE()),
  ('AP-013', 4, 1, TIMESTAMP(@d3, '14:30:00'), 150.00, CURDATE()),
  ('AP-014', 5, 1, TIMESTAMP(@d3, '15:00:00'), 150.00, CURDATE()),
  ('AP-015', 6, 1, TIMESTAMP(@d3, '16:30:00'), 150.00, CURDATE());

-- Dr. Adjei: busy day (10 of 12 slots = 83%) in 5 days
INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  ('AP-016', 7, 2, TIMESTAMP(@d5, '09:00:00'), 100.00, CURDATE()),
  ('AP-017', 8, 2, TIMESTAMP(@d5, '09:30:00'), 100.00, CURDATE()),
  ('AP-018', 1, 2, TIMESTAMP(@d5, '10:00:00'), 100.00, CURDATE()),
  ('AP-019', 2, 2, TIMESTAMP(@d5, '10:30:00'), 100.00, CURDATE()),
  ('AP-020', 3, 2, TIMESTAMP(@d5, '11:00:00'), 100.00, CURDATE()),
  ('AP-021', 4, 2, TIMESTAMP(@d5, '11:30:00'), 100.00, CURDATE()),
  ('AP-022', 5, 2, TIMESTAMP(@d5, '14:00:00'), 100.00, CURDATE()),
  ('AP-023', 6, 2, TIMESTAMP(@d5, '14:30:00'), 100.00, CURDATE()),
  ('AP-024', 7, 2, TIMESTAMP(@d5, '15:00:00'), 100.00, CURDATE()),
  ('AP-025', 8, 2, TIMESTAMP(@d5, '15:30:00'), 100.00, CURDATE());

-- Dr. Nkrumah: a few scattered upcoming appointments
INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  ('AP-026', 2, 3, TIMESTAMP(@d1,  '10:00:00'), 250.00, CURDATE()),
  ('AP-027', 3, 3, TIMESTAMP(@d6,  '11:30:00'), 250.00, CURDATE());

-- Cancelled appointment (> 48h notice -> 100% refund), refund record kept
INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on,
                          status, cancelled_at, refund_amount) VALUES
  ('AP-028', 4, 3, TIMESTAMP(@d10, '09:00:00'), 250.00, CURDATE() - INTERVAL 3 DAY,
   'CANCELLED', NOW(), 250.00);

-- The freed slot re-booked by another patient (allowed: active_slot of AP-028 is NULL)
INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  ('AP-029', 5, 3, TIMESTAMP(@d10, '09:00:00'), 250.00, CURDATE()),
  ('AP-030', 1, 2, TIMESTAMP(@d2,  '16:00:00'), 100.00, CURDATE());
