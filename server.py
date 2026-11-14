"""Zero-dependency personality quiz API and static site."""
import argparse
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("DB_PATH", ROOT / "data" / "personality.db"))
DISPLAY_BASELINE = 1000
BASE_PATH = "/mbti"
QUIZ_KEY = os.environ.get("QUIZ_KEY", "SK-20261114")
ACCESS_TOKENS = {}
ACCESS_TOKEN_TTL = 60 * 60

DIMENSIONS = [
    ("EI", "社交能量", "E", "I", "外向", "内向", "与人互动时获得能量，还是独处时更容易恢复？"),
    ("SN", "信息关注", "S", "N", "实感", "直觉", "更关注具体事实，还是未来的可能性？"),
    ("TF", "决策方式", "T", "F", "思考", "情感", "做决定时更看重逻辑，还是人的感受？"),
    ("JP", "生活节奏", "J", "P", "计划", "灵活", "喜欢提前安排，还是保留随机应变的空间？"),
    ("AO", "自我态度", "A", "O", "坚定", "审慎", "面对自己的判断，更果断还是更愿意反复推敲？"),
    ("CH", "情绪表达", "C", "H", "平和", "热烈", "情绪通常平稳内敛，还是鲜明直接？"),
]
INSIGHTS = {
    "E": "你常通过交流整理想法，和他人的互动可能为你带来动力。",
    "I": "你通常需要独处整理思绪，更偏好深入而有质量的交流。",
    "S": "你倾向于从可观察的事实入手，重视经验和具体细节。",
    "N": "你善于联想和发现可能性，常先看见事情的整体走向。",
    "T": "你做决定时倾向于梳理逻辑、证据和一致的原则。",
    "F": "你做决定时会留意人的感受，也重视关系中的价值。",
    "J": "清晰的计划和阶段性完成感，通常能帮助你保持节奏。",
    "P": "你喜欢保持选择的弹性，能随新信息调整自己的安排。",
    "A": "你较容易相信已形成的判断，并据此向前行动。",
    "O": "你习惯多想一步，反复检查能帮你发现遗漏。",
    "C": "你往往能平稳地处理情绪，在变化中保留思考空间。",
    "H": "你的情绪体验和表达较鲜明，常能让人感受到你的投入。",
}

# Positive response supports the first letter; reverse-scored items are marked -1.
QUESTION_ROWS = [
    ("EI", 1, "参加一场聚会后，我通常觉得更有精神。"),
    ("EI", -1, "忙碌的社交之后，我需要独处来恢复精力。"),
    ("EI", 1, "进入陌生环境时，我会主动找人聊聊。"),
    ("EI", -1, "我更喜欢和少数熟悉的人深入交流。"),
    ("EI", 1, "想到一个有趣的话题时，我会找人一起讨论。"),
    ("EI", -1, "需要认真思考时，我更喜欢先自己安静一会儿。"),
    ("SN", 1, "了解新事物时，我先关注可核实的事实和细节。"),
    ("SN", -1, "我常常先想到一件事未来可能发展成什么样。"),
    ("SN", 1, "学习技能时，具体示例比抽象概念更有帮助。"),
    ("SN", -1, "我喜欢从零散信息里寻找隐藏的联系。"),
    ("SN", 1, "描述一件事时，我会先讲清楚发生了什么。"),
    ("SN", -1, "听到一个新想法时，我会联想到它还能带来什么变化。"),
    ("TF", 1, "做重要决定时，我优先比较利弊与证据。"),
    ("TF", -1, "如果一个决定会让人难过，我会特别慎重。"),
    ("TF", 1, "讨论分歧时，我倾向于先指出论证中的问题。"),
    ("TF", -1, "讨论分歧时，我先关注彼此的感受。"),
    ("TF", 1, "分配任务时，我会先考虑能力、规则和实际条件。"),
    ("TF", -1, "给别人反馈时，我会先考虑对方如何接收这句话。"),
    ("JP", 1, "我喜欢提前确定计划和截止时间。"),
    ("JP", -1, "临时出现的新机会常让我愿意调整计划。"),
    ("JP", 1, "任务完成后再放松，会让我更安心。"),
    ("JP", -1, "我享受保留多个选择直到最后一刻。"),
    ("JP", 1, "开始一项任务前，我通常会先安排步骤。"),
    ("JP", -1, "计划有变化时，我能很快转向新的做法。"),
    ("AO", 1, "充分了解情况后，我能相信自己的判断并行动。"),
    ("AO", -1, "即使做了决定，我也会不断想是否有更好的选择。"),
    ("AO", 1, "收到不同意见时，我通常仍能保持对自己的信心。"),
    ("AO", -1, "重要决定前，我会多次检查有没有遗漏。"),
    ("AO", 1, "面对信息不完整的选择，我愿意先行动再根据反馈调整。"),
    ("AO", -1, "做出承诺前，我倾向先比较几种方案的风险。"),
    ("CH", 1, "遇到意外时，我通常能平静地整理思路。"),
    ("CH", -1, "开心或失望时，别人很容易看出我的情绪。"),
    ("CH", 1, "面对冲突，我一般能保持平稳的表达。"),
    ("CH", -1, "让我在意的事情，往往会激起很强烈的感受。"),
    ("CH", 1, "情绪起伏时，我通常会先让自己平静下来再回应。"),
    ("CH", -1, "遇到让我在意的事情时，我会直接表达自己的热情或不满。"),
]
QUESTIONS = [{"id": i + 1, "dimension": key, "text": prompt} for i, (key, _, prompt) in enumerate(QUESTION_ROWS)]


@contextmanager
def connect_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.execute("PRAGMA busy_timeout=10000")
    db.execute("CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, first_completed_at TEXT NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS assessments (id INTEGER PRIMARY KEY AUTOINCREMENT, participant_id TEXT NOT NULL REFERENCES participants(id), result_code TEXT NOT NULL, answers_json TEXT NOT NULL, created_at TEXT NOT NULL)")
    try:
        yield db
        db.commit()
    finally:
        db.close()


def score(answers):
    if not isinstance(answers, list) or len(answers) != len(QUESTION_ROWS) or any(type(v) is not int or v < 1 or v > 5 for v in answers):
        raise ValueError("请完成全部 36 道题，每题选择 1 至 5。")
    result, details = [], []
    for key, title, first, second, first_name, second_name, description in DIMENSIONS:
        values = [(answers[i] - 1 if direction == 1 else 5 - answers[i]) for i, (dimension, direction, _) in enumerate(QUESTION_ROWS) if dimension == key]
        percent = round(sum(values) / (len(values) * 4) * 100)
        chosen = first if percent >= 50 else second
        result.append(chosen)
        details.append({"key": key, "title": title, "first": first_name, "second": second_name, "percent": percent, "chosen": chosen, "description": INSIGHTS[chosen]})
    return "".join(result[:4]) + "-" + result[4] + "-" + result[5], details


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def has_quiz_access(self):
        scheme, _, token = self.headers.get("Authorization", "").partition(" ")
        expires = ACCESS_TOKENS.get(token) if scheme.lower() == "bearer" else None
        if expires and expires > time.monotonic():
            return True
        ACCESS_TOKENS.pop(token, None)
        return False

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            self.send_response(302)
            self.send_header("Location", f"{BASE_PATH}/")
            self.end_headers()
            return
        if path == BASE_PATH:
            self.send_response(302)
            self.send_header("Location", f"{BASE_PATH}/")
            self.end_headers()
            return
        if not path.startswith(BASE_PATH + "/"):
            return self.send_json(404, {"error": "\u672a\u627e\u5230\u9875\u9762"})
        path = path[len(BASE_PATH):]
        if path == "/api/dimensions":
            return self.send_json(200, {"dimensions": [{"key": d[0], "title": d[1], "first": d[4], "second": d[5], "description": d[6]} for d in DIMENSIONS]})
        if path == "/api/questions":
            if not self.has_quiz_access():
                return self.send_json(403, {"error": "\u8bf7\u8f93\u5165\u6b63\u786e\u7684 KEY \u540e\u5f00\u59cb\u6d4b\u9a8c\u3002"})
            return self.send_json(200, {"questions": QUESTIONS, "dimensions": [{"key": d[0], "title": d[1], "first": d[4], "second": d[5], "description": d[6]} for d in DIMENSIONS]})
        if path == "/api/stats":
            with connect_db() as db:
                count = db.execute("SELECT COUNT(*) FROM participants").fetchone()[0]
            return self.send_json(200, {"completed_people": DISPLAY_BASELINE + count})
        files = {"/": ("index.html", "text/html; charset=utf-8"), "/types": ("index.html", "text/html; charset=utf-8"), "/app.js": ("app.js", "text/javascript; charset=utf-8"), "/style.css": ("style.css", "text/css; charset=utf-8")}
        files.update({f"/portraits/{name}.webp": (f"portraits/{name}.webp", "image/webp") for name in ("INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP")})
        if path not in files:
            return self.send_json(404, {"error": "未找到页面"})
        name, content_type = files[path]
        body = (ROOT / "static" / name).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        request_path = urlparse(self.path).path
        if not request_path.startswith(BASE_PATH + "/"):
            return self.send_json(404, {"error": "\u672a\u627e\u5230\u63a5\u53e3"})
        path = request_path[len(BASE_PATH):]
        if path not in ("/api/verify-key", "/api/assessments"):
            return self.send_json(404, {"error": "\u672a\u627e\u5230\u63a5\u53e3"})
        if path == "/api/assessments" and not self.has_quiz_access():
            return self.send_json(403, {"error": "\u8bf7\u8f93\u5165\u6b63\u786e\u7684 KEY \u540e\u63d0\u4ea4\u6d4b\u9a8c\u3002"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 4096:
                raise ValueError("\u8bf7\u6c42\u5185\u5bb9\u5927\u5c0f\u65e0\u6548\u3002")
            payload = json.loads(self.rfile.read(length))
            if path == "/api/verify-key":
                if not secrets.compare_digest(str(payload.get("key", "")).casefold().encode("utf-8"), QUIZ_KEY.casefold().encode("utf-8")):
                    return self.send_json(401, {"error": "KEY \u4e0d\u6b63\u786e\uff0c\u8bf7\u8f93\u5165\u6b63\u786e\u7684 KEY\u3002"})
                token = secrets.token_urlsafe(32)
                ACCESS_TOKENS[token] = time.monotonic() + ACCESS_TOKEN_TTL
                return self.send_json(200, {"token": token})
            participant_id = payload.get("participant_id")
            if not isinstance(participant_id, str) or not re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", participant_id):
                raise ValueError("\u6d4f\u89c8\u5668\u6807\u8bc6\u65e0\u6548\u3002")
            code, details = score(payload.get("answers"))
        except (ValueError, TypeError, AttributeError) as exc:
            return self.send_json(400, {"error": str(exc)})
        now = datetime.now(timezone.utc).isoformat()
        with connect_db() as db:
            db.execute("INSERT OR IGNORE INTO participants VALUES (?, ?)", (participant_id, now))
            db.execute("INSERT INTO assessments (participant_id, result_code, answers_json, created_at) VALUES (?, ?, ?, ?)", (participant_id, code, json.dumps(payload["answers"]), now))
            count = db.execute("SELECT COUNT(*) FROM participants").fetchone()[0]
        self.send_json(201, {"code": code, "dimensions": details, "completed_people": DISPLAY_BASELINE + count})

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Personality quiz website")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")), help="Listening port (default: 8000)")
    port = parser.parse_args().port
    print(f"Personality quiz: http://127.0.0.1:{port}{BASE_PATH}/")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
