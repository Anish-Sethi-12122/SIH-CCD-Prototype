"""Focused deterministic tests for the session-scoped suspicious activity rules."""
import unittest

from app.core.config import settings
from app.video.pipeline import VideoPipeline
from app.models.schemas import AlertFeedback, TrackSchema


def tracked(track_id=1, object_type="human"):
    return {"track_id": track_id, "track_uid": "H-0001" if object_type == "human" else "V-0001",
            "object_type": object_type, "confidence": .9, "centroid_norm": [.5, .5]}


class SuspiciousActivityTests(unittest.TestCase):
    def setUp(self):
        self.p = VideoPipeline()
        self.p.camera_id, self.p.camera_code, self.p.session_id = "cam", "CAM-01", "session"
        self.p.set_zones([{"id": "zone", "name": "Restricted", "polygon": [[0,0], [1,0], [1,1], [0,1]]}])

    def test_entry_fires_once_while_inside(self):
        self.assertEqual(len(self.p._check_intrusions([tracked()])), 1)
        self.assertEqual(self.p._check_intrusions([tracked()]), [])

    def test_dwell_and_exit_reset(self):
        old = settings.SUSPICIOUS_DWELL_SECONDS
        settings.SUSPICIOUS_DWELL_SECONDS = 0
        try:
            self.p._check_intrusions([tracked()])
            events = self.p._check_intrusions([tracked()])
            self.assertEqual(events[0]["rule_id"], "SA-02")
            self.p._check_intrusions([{**tracked(), "centroid_norm": [1.5, 1.5]}])
            self.assertNotIn(("SA-02", 1, "zone"), self.p._rule_fired)
        finally:
            settings.SUSPICIOUS_DWELL_SECONDS = old

    def test_repeated_entries_and_session_reset(self):
        old = settings.REPEATED_ENTRY_COUNT
        settings.REPEATED_ENTRY_COUNT = 2
        try:
            self.p._check_intrusions([tracked()])
            self.p._check_intrusions([{**tracked(), "centroid_norm": [1.5, 1.5]}])
            events = self.p._check_intrusions([tracked()])
            self.assertTrue(any(e.get("rule_id") == "SA-03" for e in events))
            self.p._reset_runtime_state()
            self.assertFalse(self.p._in_zone)
            self.assertFalse(self.p._entry_history)
        finally:
            settings.REPEATED_ENTRY_COUNT = old

    def test_enrichment_contract_does_not_auto_verify_or_fabricate_anpr(self):
        record = TrackSchema(
            id="internal", internal_id="internal", session_id="session", track_uid="H-0001",
            track_id=1, camera_id="cam", object_type="human", object_class="person",
            confidence=.9, first_seen="2026-01-01T00:00:00", last_seen="2026-01-01T00:00:00",
            in_frame=True, status="IN_FRAME", identity_state="CANDIDATE",
            anpr_state="UNAVAILABLE",
        )
        self.assertEqual(record.identity_state, "CANDIDATE")
        self.assertNotEqual(record.identity_state, "VERIFIED")
        self.assertIsNone(record.mock_plate)
        self.assertEqual(record.anpr_state, "UNAVAILABLE")

    def test_operator_correction_contract_keeps_original_observation_separate(self):
        feedback = AlertFeedback(status="false_positive", operator_note="Authorized",
                                 operator_correction={"license_plate": "DL 01 AB 1234"})
        self.assertEqual(feedback.status, "false_positive")
        self.assertEqual(feedback.operator_correction["license_plate"], "DL 01 AB 1234")
