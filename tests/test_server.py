import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import server


class QuizTests(unittest.TestCase):
    def test_reverse_scoring_changes_the_result(self):
        # Every question supports its first trait, including reverse-worded items.
        answers = [5 if direction == 1 else 1 for _, direction, _ in server.QUESTION_ROWS]
        code, dimensions = server.score(answers)
        self.assertEqual(code, "ESTJ-A-C")
        self.assertTrue(all(d["percent"] == 100 for d in dimensions))

    def test_incomplete_or_invalid_answers_cannot_be_scored(self):
        for answers in ([3] * 35, [3] * 35 + [0], [3] * 35 + [True]):
            with self.assertRaises(ValueError):
                server.score(answers)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db_patch = patch.object(server, "DB_PATH", Path(self.temp.name) / "test.db")
        self.db_patch.start()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.httpd.server_port}"
        _, verified = self.request("/api/verify-key", {"key": "sk-20261114"}, authenticated=False)
        self.token = verified["token"]

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join()
        self.db_patch.stop()
        self.temp.cleanup()

    def request(self, path, payload=None, authenticated=True):
        body = None if payload is None else json.dumps(payload).encode()
        headers = {"Content-Type": "application/json"}
        if authenticated and hasattr(self, "token"):
            headers["Authorization"] = f"Bearer {self.token}"
        request = urllib.request.Request(self.base + server.BASE_PATH + path, data=body, headers=headers)
        with urllib.request.urlopen(request) as response:
            return response.status, json.load(response)

    def test_site_is_mounted_under_mbti_prefix(self):
        status, _ = self.request("/api/dimensions", authenticated=False)
        self.assertEqual(status, 200)
        with urllib.request.urlopen(self.base + "/") as response:
            self.assertEqual(response.geturl(), self.base + server.BASE_PATH + "/")

    def test_key_is_required_and_wrong_key_is_rejected(self):
        wrong = urllib.request.Request(self.base + server.BASE_PATH + "/api/verify-key", data=json.dumps({"key": "wrong"}).encode(), headers={"Content-Type": "application/json"})
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(wrong)
        self.assertEqual(error.exception.code, 401)
        request = urllib.request.Request(self.base + server.BASE_PATH + "/api/questions")
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request)
        self.assertEqual(error.exception.code, 403)
        self.assertEqual(len(self.request("/api/questions")[1]["questions"]), 36)

    def test_count_tracks_people_not_retries_or_retests(self):
        first_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        second_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        answers = [3] * 36
        self.assertEqual(self.request("/api/stats")[1]["completed_people"], 1000)
        for person, expected in ((first_id, 1), (first_id, 1), (second_id, 2)):
            status, result = self.request("/api/assessments", {"participant_id": person, "answers": answers})
            self.assertEqual(status, 201)
            self.assertEqual(result["completed_people"], 1000 + expected)
        self.assertEqual(self.request("/api/stats")[1]["completed_people"], 1002)
        with server.connect_db() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM assessments").fetchone()[0], 3)

    def test_invalid_submission_does_not_change_count(self):
        request = urllib.request.Request(self.base + server.BASE_PATH + "/api/assessments", data=json.dumps({"participant_id": "bad", "answers": [3] * 36}).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}"})
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request)
        self.assertEqual(error.exception.code, 400)
        self.assertEqual(self.request("/api/stats")[1]["completed_people"], 1000)


if __name__ == "__main__":
    unittest.main()
