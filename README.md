# Final Assessment — Backend Development

**Weight:** 30% of final grade
**Duration:** 2 weeks
**Mode:** Individual project
**Stack (mandatory):** Node.js, Express.js, MySQL (with parameterized queries only), Redis

---

## Scenario — "MediBook" Clinic Appointment System

A community clinic wants a backend service for booking doctor appointments. Doctors see patients in fixed 30-minute slots during working hours (09:00–17:00), each doctor can handle at most **12 appointments per day**, and the clinic administrator needs reports. You will design the database, build the API, and handle the operational concerns (background jobs, logging, testing).

**Entity limit:** Your database must contain **exactly 3 entities**:

| Entity | Purpose |
|---|---|
| `patients` | People who book appointments |
| `doctors` | Doctors with a specialty, consultation fee, and room |
| `appointments` | A patient's booking with a doctor at a specific date/time (links the other two) |

You may add columns as needed, but no additional tables (lookup/locale JSON files don't count).

---

## Part A — Database Design & Normalization

The clinic currently tracks everything in this single spreadsheet:

| appt_ref | patient_name | patient_email | patient_phone | doctor_name | specialty | consultation_fee | room | appt_datetime | amount_paid | booked_on |
|---|---|---|---|---|---|---|---|---|---|---|
| AP-001 | Ama Mensah | ama@mail.com | 0244-111-222 | Dr. Boateng | Dermatology | 150.00 | R-12 | 2026-08-10 09:00 | 150.00 | 2026-07-01 |
| AP-002 | Kojo Owusu | kojo@mail.com | 0555-333-444 | Dr. Boateng | Dermatology | 150.00 | R-12 | 2026-08-10 09:30 | 120.00 | 2026-07-02 |
| AP-003 | Ama Mensah | ama@mail.com | 0244-111-222 | Dr. Adjei | Paediatrics | 100.00 | R-03 | 2026-08-15 10:00 | 100.00 | 2026-07-03 |

Study the spreadsheet, then produce a **database schema diagram** of your design in fully normalized form (up to 3NF). The diagram must show **everything**:

- all 3 entities with every column and its MySQL data type,
- primary keys and foreign keys, clearly marked,
- the relationships between the entities and their cardinality (1:N, etc.),
- every constraint that enforces a business rule (`NOT NULL`, `UNIQUE`, `CHECK`) — in particular, it must be visible from the diagram that *a doctor cannot have two appointments at the same date/time*.

Use any tool you like (dbdiagram.io, draw.io) and include it in your repository as `schema-diagram` (image or PDF).

## Part B — Database Implementation & Project Setup

1. **Table creation.** Translate your Part A diagram into a MySQL DDL script, `database/schema.sql`, that creates the database and the 3 tables — data types, primary keys, foreign keys, and every constraint shown on the diagram. The script must run cleanly on a fresh MySQL server. Also provide `database/seed.sql` with realistic sample data: at least 3 patients, 3 doctors (including one with no appointments), and 8 appointments (including one doctor-day at or near the 12-slot daily cap).

2. **Project structure.** Set up the Express project in a **models / controllers / routes** structure:

```
├── database/          schema.sql and seed.sql (Part B.1)
└── src/
    ├── models/        all application SQL lives here — nowhere else
    ├── controllers/   business logic; calls model functions, never the DB directly
    └── routes/        maps URLs and HTTP methods to controllers
```

Every SQL statement in the application must use **parameterized queries** (`?` placeholders via `mysql2`). SQL found in a controller or route file loses marks. **Do not use any ORM for this assignment.**

## Part C — Controllers & Endpoints

Implement endpoints for the operations below. **Designing the API is part of the assessment**: you choose the URL paths, the HTTP methods, and how the endpoints are grouped into controllers and routes — your choices should follow REST conventions and will be marked. The business rules listed are **requirements** — *how* you satisfy them is your design decision, and you will be asked to defend it at the viva.

1. **Basic CRUD** — standard **C**reate, **R**ead (one and all), **U**pdate, and **D**elete operations for patients and for doctors, with sensible validation. (Appointments get their create/delete behaviour from the two operations below — no separate CRUD needed there.)

2. **Book an appointment**. Rules that must always hold:
   - Appointments can only be booked in the future, within working hours (09:00–17:00), on a 30-minute slot boundary.
   - A doctor never exceeds 12 appointments in a day.
   - Two patients can never hold the same doctor slot — even when both requests arrive at the same instant.

3. **Cancel an appointment**. Rules:
   - The refund is computed by the server from the notice given: more than 48 hours → 100%; 24–48 hours → 50%; less than 24 hours → 0%. The response states the refund amount.
   - The cancellation and its refund record succeed or fail together.
   - A cancelled slot becomes bookable by another patient, while the cancellation record is kept for refund history.
   - A cancellation notifies the waitlist (Part E).

4. **Doctor statistics** — for a given doctor: revenue collected, upcoming appointment count, appointments per day for the next 7 days, and utilization % against the 12-slot daily cap.

Operations 5 and 6 are where your **advanced SQL** is assessed: the results must be produced by the SQL in your models (joins, aggregates, etc) — not fetched raw and computed in JavaScript.

5. **Doctors report** — every doctor's total appointments and revenue collected, including doctors with zero appointments.
6. **Busy days report** — every (doctor, date) where more than 80% of the 12-slot daily capacity is booked.

### General requirements (all endpoints)

Input validation with meaningful `400` messages; correct status codes (`201`, `404`, `409`, `422`); a central error-handling middleware.

## Part D — Node.js `fs` Module

**Audit log:** every successful booking and cancellation must be appended as a JSON line to `logs/audit.log` using the `fs` module (async, non-blocking — no `*Sync` calls inside request handlers). The logger must create the `logs/` directory on first run if it doesn't exist, and a logging failure must **not** fail the user's request.

## Part E — Queues & Redis

1. **Waitlist queue:** when the requested slot (or the doctor's whole day) is fully booked, offer the patient a waitlist spot — push them onto a queue (Redis list, or Bull/BullMQ). When a cancellation frees a slot, a **worker process** (separate from the web server) pops the first waitlisted patient and books them in. Think through: what happens if the promoted booking itself fails? The patient must not simply vanish from both the queue and the appointments table.
2. **Notification jobs:** every confirmed appointment enqueues a "confirmation SMS/email" job; the worker processes it by writing the message to the audit log (no real sending needed).

## Part F — Unit Testing

Using Jest, write **at least 6 meaningful unit tests**:

- The refund calculator from Part C.3 — cover all three tiers **and both boundaries** (exactly 24 hours, exactly 48 hours). Boundary behaviour must match your documented policy.
- One validation function of your choice — e.g., the slot-alignment/working-hours check — including at least one edge case (17:00 exactly? 09:15? a malformed date?).

Tests must not require a live MySQL or Redis connection — that's the point of extracting pure functions. `npm test` must run them.

## Part G — i18n & l10n: Course Feedback Page

Create a **simple HTML page** (served by your Express app at `GET /feedback`) containing a short course-feedback form with **exactly 5 essay questions** (each answered in a `<textarea>`):

1. Which topic in this course did you find most challenging, and why?
2. Describe one concept you understood only after the practical assignments. What made it click?
3. How has your approach to designing databases or APIs changed since the start of the trimester?
4. What would you improve about how this course was taught or assessed?
5. How do you plan to apply what you learned in this course going forward?

**i18n/l10n requirement (keep it simple):** the page title, instructions, and all 5 questions must be loaded from locale files (e.g., `locales/en.json` and `locales/fr.json` — English plus one other language of your choice). Visiting `/feedback?lang=fr` shows the translated page; the default is English, and an unsupported `lang` value must fall back to English rather than crash. Display today's date on the page formatted for the active locale (e.g., using `Intl.DateTimeFormat`).

---

## Submission Requirements

- Git repository (with meaningful commit history — a single "final commit" will be questioned) containing:
  - `schema-diagram` (image or PDF), `schema.sql`, and `seed.sql` (as specified in Part B)
  - Application source, worker process, tests, locale files
  - `README.md` with: setup steps, `.env.example`, and the short written justifications requested in Parts C, D, and E
- The app must start with `npm install && npm start` (plus documented MySQL/Redis setup) and tests with `npm test`.
- A short **viva/demo (10 minutes)** walkthrough.

**Automatic penalties:** SQL injection vector anywhere in the app (−15), secrets committed to the repo (−5), app does not start per README instructions (−10), work the student cannot explain in the video (or at a follow-up viva if called) | Academic integrity referral; affected criteria re-scored at Developing or below |

---

## Part C — API Reference & Design Justifications

All endpoints are under `/api`, accept and return JSON, and use plural resource nouns.
Datetimes are clinic-local wall-clock times in the form `YYYY-MM-DD HH:MM`.

### Endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/api/patients` | List patients | 200 |
| POST | `/api/patients` | Create patient | 201 + `Location` |
| GET | `/api/patients/:id` | Get one patient | 200 |
| PUT | `/api/patients/:id` | Replace patient (all fields required) | 200 |
| PATCH | `/api/patients/:id` | Partially update patient | 200 |
| DELETE | `/api/patients/:id` | Delete patient | 204 |
| GET / POST | `/api/doctors` | List / create doctors | 200 / 201 |
| GET / PUT / PATCH / DELETE | `/api/doctors/:id` | Same as patients | 200 / 204 |
| GET | `/api/doctors/:id/stats` | Doctor statistics (C.4) | 200 |
| POST | `/api/appointments` | Book an appointment (C.2) | 201 + `Location` |
| GET | `/api/appointments/:id` | View an appointment (includes refund once cancelled) | 200 |
| DELETE | `/api/appointments/:id` | Cancel an appointment (C.3) | 200 + refund |
| GET | `/api/reports/doctors` | Doctors report (C.5) | 200 |
| GET | `/api/reports/busy-days` | Busy days report (C.6) | 200 |

**Bodies**
- Patient: `{ "full_name", "email", "phone" }`
- Doctor: `{ "full_name", "specialty", "consultation_fee", "room" }`
- Booking: `{ "patient_id": 1, "doctor_id": 2, "appt_datetime": "2026-12-01 09:30" }`

### Status codes

| Code | When |
|---|---|
| 400 | Malformed input: invalid JSON, missing or ill-typed fields, unknown fields, non-numeric id, unparseable or impossible date (e.g. `2026-02-30`) |
| 404 | Patient, doctor, appointment or route does not exist |
| 409 | Conflicts with current state: slot already booked, doctor's day full (12/12), patient already booked at that time, duplicate email, appointment already cancelled, deleting a patient or doctor who has appointments |
| 422 | Well-formed but breaks a booking rule: in the past, outside 09:00–17:00, not on a :00/:30 boundary, cancelling an appointment that has already started |

Errors always look like `{ "error": "...", "details": ... }` and are produced by one
central middleware (`src/middleware/errorHandler.js`), which also maps MySQL errors
(`ER_DUP_ENTRY`, `ER_ROW_IS_REFERENCED_2`) to 409.

### Justifications

**Grouping.** There is one router and one controller per resource (`patients`, `doctors`,
`appointments`) plus `reports` for admin read-only aggregates. Stats belong to a single
doctor, so they are a sub-resource (`/doctors/:id/stats`). The reports cover all doctors,
so they live under `/reports`.

**PUT vs PATCH.** PUT replaces the whole resource, so every field is required. PATCH
updates only the fields sent. Unknown fields are rejected with 400 so a typo like
`fullname` can't silently do nothing.

**Cancel = `DELETE /appointments/:id`.** From the client's point of view, cancelling
removes the booking, and the brief says appointments get their delete behaviour from
cancellation. On the server it is a *soft* delete: the row is kept with
`status = 'CANCELLED'`, `cancelled_at` and `refund_amount` for refund history. It returns
200 with the refund in the body, not 204, because the client needs to see the refund.

**Deleting patients/doctors with appointments → 409.** The foreign keys are `RESTRICT`.
Deleting a record with appointments would destroy booking and refund history, so the
server refuses instead of cascading.

**Booking rules (C.2).**
- *Future, working hours, 30-minute boundary.* `validateSlot()` in
  `src/utils/scheduling.js` is a pure function. The last valid slot is **16:30**, because a
  30-minute appointment must end by 17:00, so 17:00 itself is rejected.
- *Max 12 per day* and *no double-booked slot, even with simultaneous requests.* The
  booking runs in one transaction that first takes row locks with `SELECT ... FOR UPDATE`:
  the patient row first, then the doctor row, always in that order so two bookings can't
  deadlock. All bookings for a doctor therefore queue on that doctor's lock, so the
  "slot free?" and "fewer than 12 today?" checks can't go stale before the insert. As a
  final database-level guarantee, the `UNIQUE (doctor_id, appt_datetime, active_slot)` key
  rejects a second active booking of the same slot. Any `ER_DUP_ENTRY` becomes a 409.
  This was tested with 10 parallel requests for one slot (1 × 201, 9 × 409) and 16
  parallel requests for one doctor-day (12 × 201, 4 × 409).
- `amount_paid` is set by the server from the doctor's `consultation_fee`, never by the
  client.

**Cancellation & refunds (C.3).**
- Refund policy (`calculateRefund()` in `src/utils/scheduling.js`, computed in integer cents):

  | Notice before appointment | Refund |
  |---|---|
  | more than 48 h | 100% |
  | 24 h to 48 h **inclusive** (exactly 48 h → 50%, exactly 24 h → 50%) | 50% |
  | less than 24 h | 0% |

- The appointment row is locked, the refund is computed, and the status, cancellation
  time and refund are written in a single `UPDATE` inside one transaction. The
  cancellation and its refund record therefore succeed or fail together, and two
  simultaneous cancels can't both succeed (the second gets 409).
- When the status changes to `CANCELLED`, the generated column `active_slot` becomes `NULL`.
  Unique indexes ignore `NULL`s, so the slot becomes bookable again while the cancelled
  row stays for history.

**Revenue definition.** "Revenue collected" = `SUM(amount_paid - COALESCE(refund_amount, 0))`
over all of a doctor's appointments. Money paid and then refunded is not revenue, but
the part kept from a late cancellation is.

**Advanced SQL (C.4–C.6), all in `src/models/`.**
- *Doctors report*: `doctors LEFT JOIN appointments` with `COUNT`/`SUM` and `COALESCE`,
  so doctors with no appointments appear with `0` and `0.00`.
- *Busy days*: a CTE groups `BOOKED` appointments by `(doctor_id, DATE(appt_datetime))` and
  keeps groups with `HAVING COUNT(*) > 12 * 80 / 100`, i.e. 10 or more of 12. It is then
  joined to `doctors`.
- *Doctor stats*: a `WITH RECURSIVE` calendar of today + 6 days, `LEFT JOIN`ed to
  appointments, so days with no bookings still appear as `0`. Utilization is computed in
  SQL as booked / (days × 12) × 100.

**SQL safety.** Every query uses `?` placeholders via `mysql2`'s `execute()`. The only
dynamic SQL is the `SET` column list in partial updates, and those column names come
from a hard-coded whitelist, never from request input. `multipleStatements` is off.

---

## Part D — Audit Log & Justifications

Every successful booking and cancellation is appended to `logs/audit.log` as one JSON line
by `src/utils/auditLogger.js`. Set `AUDIT_LOG_FILE` in `.env` to use a different path.

```json
{"timestamp":"2026-11-24T12:56:56.428Z","event":"APPOINTMENT_BOOKED","appointment_id":31,"appt_ref":"AP-031","patient_id":1,"doctor_id":4,"appt_datetime":"2026-12-02 09:00:00","amount_paid":"300.00"}
{"timestamp":"2026-11-24T12:56:56.467Z","event":"APPOINTMENT_CANCELLED","appointment_id":31,"appt_ref":"AP-031","patient_id":1,"doctor_id":4,"appt_datetime":"2026-12-02 09:00:00","amount_paid":"300.00","refund_percentage":100,"refund_amount":"300.00"}
```

**Async and non-blocking.** The logger uses `fs/promises` (`appendFile`, `mkdir`), and there
are no `*Sync` calls anywhere in `src/`. Controllers call `logAudit()` without `await`, so the
response goes out without waiting for the disk.

**Creates `logs/` on first run.** It tries to append first. If that fails with `ENOENT`, it
runs `mkdir(..., { recursive: true })` and retries. This creates the folder on first run, and
again if someone deletes it while the server is running, without checking on every write.

**A logging failure never fails the request.** `logAudit()` catches every error and writes a
warning to the console instead of throwing. It also runs only *after* the booking or
cancellation transaction has committed, so a log entry is never written for something that
was rolled back. Tested with a read-only log directory: the booking still returned 201.

**Lines stay whole and in order.** Writes go through a promise chain, one after another, so
entries never interleave and appear in the order the events happened. Tested with 12
simultaneous bookings: 12 intact JSON lines.

**What is logged.** The log holds ids, the appointment reference, time, amounts and refund.
It deliberately leaves out patient names, emails and phone numbers, so the log file doesn't
become a second copy of personal data.
