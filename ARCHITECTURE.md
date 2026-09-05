# SOLI MEDICAL — Architecture

This stage establishes a simple canonical data model for a single-doctor clinic operating across multiple branches. Arabic RTL remains the default presentation language, English remains supported by settings, and all financial values are denominated in EGP and displayed as `ج.م`.

## Canonical entities

| Entity | Responsibility | Key relationships |
|---|---|---|
| `Patient` | Master patient record; only the name is required at creation | Parent of appointments, visits, and follow-ups |
| `Appointment` | A scheduled time slot before attendance | References `patientId`; has no payment, invoice, or visit at creation |
| `Visit` | A paid clinical encounter and queue source | References `patientId` and optional `appointmentId` |
| `Invoice` | Charge for a visit | References patient and visit |
| `Payment` | Successful collection against an invoice | References patient, visit, and invoice |
| `Prescription` | Clinical prescription with medication snapshots | References visit and patient |
| `FollowUp` | Scheduled follow-up with fee-policy snapshot | References source visit and patient |
| `Medication` | Catalog item used to select prescription items | Does not represent a prescription |
| `LabOrder` / `RadiologyOrder` | Independent orders with `ORDERED`, `RESULT`, and `REPORT` states | References visit and patient |

Preview fixtures are kept in `src/data/previewClinicData.ts` and `src/data/previewMedicalCatalogs.ts`. They are not imported by the canonical workflow layer; the application uses them only to render the existing UI preview while canonical state is maintained separately.

## State machine

Appointments use `SCHEDULED -> ARRIVED`. A scheduled appointment does not create revenue, payment, visit, or waiting state. Check-in requires a successful payment before a `WAITING` visit is committed. Walk-ins use `appointmentId = null` and follow the same payment dependency. Visits use only `WAITING -> IN_PROGRESS -> COMPLETED`; `CANCELLED` is terminal. Starting and completing a visit are doctor-only transitions.

## Services and workflows

The `src/services/workflows.ts` module contains transition guards and queue derivation. The canonical data module contains the atomic in-memory workflow builders used by the current local prototype: `executeAtomicArrival`, `executeAtomicWalkIn`, and `executeCompleteVisit`. These functions return a complete commit set; callers update state only after the function succeeds. A failed payment throws before any visit is returned, so no waiting visit is published. The next Firestore implementation should wrap the same commit set in a transaction or batch.

## Data flow

The UI calls a handler, the handler invokes a workflow/service, and the workflow produces canonical entities. The waiting queue is derived only from `Visit.status === 'WAITING'`. Finance is derived from `Payment`. Patient history is derived from completed visits and their related clinical records. Components do not call Firestore directly.

## Scope limits

This stage does not add patient portals, online booking, voice calling, AI diagnosis, mobile applications, or analytics. UI preview values inside examination cards remain presentation fixtures and are not written by the completion workflow.

## Firestore

`firestore.rules` provides readable authenticated-user protection with doctor-only mutation of clinical completion data, prescriptions, user records, and destructive operations. The rules are intentionally small and should be deployed only after the application is connected to Firebase Authentication.
