# Suspicious-activity policy (prototype)

## Purpose and scope

This policy turns existing YOLO/ByteTrack observations and operator-drawn
restricted zones into reviewable alerts during one surveillance session. It is
not identity inference, intent inference, or proof of wrongdoing.

**SUSPICIOUS** is an operational hypothesis produced by deterministic prototype
rules over observations/tracks. It is not a verified conclusion about intent or
identity.

## Rule catalogue and thresholds

| Rule | Condition | Default | Severity |
| --- | --- | --- | --- |
| SA-01 | Track changes from outside to inside an active restricted zone | immediate | Critical |
| SA-02 | Track remains inside the zone | 30 seconds | Warning |
| SA-03 | Same track enters the same zone repeatedly | 3 entries in 120 seconds | Warning |

Inputs are ByteTrack UID, class/type, normalized centroid, active zone polygon,
and monotonic elapsed time. Configured values are `SUSPICIOUS_DWELL_SECONDS=30`,
`REPEATED_ENTRY_COUNT=3`, `REPEATED_ENTRY_WINDOW_SECONDS=120`, and the reserved
`VEHICLE_DWELL_SECONDS=30`. SA-04 is not enabled: there is no reliable
meaningful-motion calculation in this prototype.

## State, deduplication, and incidents

For each `(session, track, zone)`, the engine records OUTSIDE, ENTERED/INSIDE,
and EXITED. SA-01 fires only on OUTSIDE → ENTERED. SA-02 fires once per
continuous inside period. SA-03 fires once when the threshold is crossed inside
its rolling window. A temporarily missed track retains its last state; it is not
treated as an exit. An observed zone exit clears dwell state, while entry history
remains only for the rolling-window calculation. New sessions clear all runtime
rule state. Multiple rules can each create their own auditable event/alert; an
incident is one such rule event tied to its track, zone, and session.

## Review and limitations

Alerts require operator review. False-positive disposition and operator supplied
identity/vehicle information are stored separately from the original machine
observation. Human enrichment is `NO_MATCH` unless a controlled enrichment
record exists; it is never auto-verified. ANPR is `UNAVAILABLE` with an image
quality reason when no readable OCR result exists. This prototype has no
biometric verification, plate detector/OCR model, labelled behavioural
evaluation, or production identity system. Production work would require
validated data, privacy/legal controls, calibrated thresholds, and audited human
review workflows.
