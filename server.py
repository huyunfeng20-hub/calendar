#!/usr/bin/env python3
import cgi
import json
import mimetypes
import os
import re
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import uuid

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
UPLOAD_DIR = ROOT / "uploads"
DB_FILE = DATA_DIR / "checkins.json"

PORT = int(os.getenv("PORT", "8080"))
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "rockygoerlife")
PHONE_RE = re.compile(r"^1\d{10}$")


def ensure_store():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_FILE.exists():
        DB_FILE.write_text("[]", encoding="utf-8")


def read_db():
    try:
        return json.loads(DB_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def write_db(items):
    DB_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, status: int, payload: dict):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/api/health":
            self._send_json(HTTPStatus.OK, {"ok": True, "storage": "local"})
            return

        if self.path.startswith("/api/checkins"):
            token = self.headers.get("x-admin-token", "")
            if token != ADMIN_TOKEN:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"message": "未授权"})
                return
            all_items = sorted(read_db(), key=lambda x: x.get("createdAt", ""), reverse=True)
            self._send_json(HTTPStatus.OK, {"count": len(all_items), "items": all_items})
            return

        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/checkins":
            self._send_json(HTTPStatus.NOT_FOUND, {"message": "Not found"})
            return

        ctype, _ = cgi.parse_header(self.headers.get("Content-Type", ""))
        if ctype != "multipart/form-data":
            self._send_json(HTTPStatus.BAD_REQUEST, {"message": "请求格式错误"})
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type")},
        )

        name = (form.getvalue("name") or "").strip()
        contact = (form.getvalue("contact") or "").strip()
        cycle_days = int(form.getvalue("cycleDays") or 7)
        note = (form.getvalue("note") or "").strip()
        checkin_type = (form.getvalue("checkinType") or "normal").strip()
        file_item = form["proofPhoto"] if "proofPhoto" in form else None

        if not name or not PHONE_RE.match(contact):
            self._send_json(HTTPStatus.BAD_REQUEST, {"message": "姓名和联系方式不合法"})
            return

        if file_item is None or getattr(file_item, "file", None) is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {"message": "请上传图片"})
            return

        original = file_item.filename or "proof.jpg"
        ext = Path(original).suffix or ".jpg"
        filename = f"{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:10]}{ext}"
        file_path = UPLOAD_DIR / filename

        data = file_item.file.read()
        if len(data) > 8 * 1024 * 1024:
            self._send_json(HTTPStatus.BAD_REQUEST, {"message": "图片超过8MB限制"})
            return

        mime_type = (file_item.type or mimetypes.guess_type(filename)[0] or "application/octet-stream")
        if not mime_type.startswith("image/"):
            self._send_json(HTTPStatus.BAD_REQUEST, {"message": "仅支持图片上传"})
            return

        file_path.write_bytes(data)

        all_items = read_db()
        user_records = [x for x in all_items if x.get("contact") == contact and int(x.get("cycleDays", 7)) == cycle_days]

        item = {
            "id": uuid.uuid4().hex[:12],
            "name": name,
            "contact": contact,
            "cycleDays": cycle_days,
            "note": note,
            "checkinType": checkin_type,
            "createdAt": datetime.now().isoformat(),
            "day": len(user_records) + 1,
            "storageMode": "local",
            "fileName": filename,
            "filePath": f"/uploads/{filename}",
            "mimeType": mime_type,
            "fileSize": len(data),
        }

        all_items.append(item)
        write_db(all_items)

        masked = dict(item)
        masked["contact"] = f"{contact[:3]}****{contact[-4:]}"
        self._send_json(HTTPStatus.OK, {"message": "打卡上传成功", "record": masked})


def main():
    ensure_store()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Server running at http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
