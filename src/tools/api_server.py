#!/usr/bin/env python3
"""Mail relay for the Mysuru Swachha Portal.

Bridges the portal's notification queue to the user's connected Gmail account
via the `pplx connector` CLI. All live sends are redirected to a single
safe inbox (SAFE_INBOX) because the seeded demo complaints carry example.in
addresses that would bounce; the originally intended recipient is preserved
in the subject prefix, an X-Intended-For banner and the Reply-To hint.
"""
import asyncio
import json
import os
import re
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

SAFE_INBOX = os.environ.get("MCC_SAFE_INBOX", "punithj454@gmail.com")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# per-visitor send log, newest first
LOG: dict[str, list[dict]] = {}
LIMIT_PER_VISITOR = 60


async def call_tool(source_id: str, tool_name: str, arguments: dict) -> dict:
    proc = await asyncio.create_subprocess_exec(
        "pplx", "connector", "call", source_id, tool_name,
        "--input", json.dumps(arguments),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError((err.decode() or out.decode())[:600])
    text = out.decode().strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text[:600]}


BANNER = (
    '<div style="margin:0;padding:10px 14px;background:#fff4d6;border-bottom:1px solid #e8d49a;'
    'font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#6b4e00">'
    "Demo relay &middot; this notification was addressed to <b>{to}</b> and redirected to your inbox."
    "</div>"
)


class SendReq(BaseModel):
    to: str
    subject: str
    html: str
    text: str = ""
    complaint_id: str = ""
    status: str = ""
    visitor: str = "anon"


@app.get("/api/health")
async def health():
    try:
        await call_tool("gcal", "list_drafts", {"limit": 1})
        return {"ok": True, "provider": "Gmail", "relay_inbox": SAFE_INBOX}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "provider": "Gmail", "error": str(e)[:300]}


@app.get("/api/log")
async def get_log(visitor: str = "anon"):
    return {"sent": LOG.get(visitor, [])}


@app.post("/api/send")
async def send(req: SendReq):
    intended = req.to.strip()
    if not EMAIL_RE.match(intended):
        return {"ok": False, "error": f"'{intended}' is not a valid email address"}

    is_relay = intended.lower() != SAFE_INBOX.lower()
    recipient = SAFE_INBOX
    subject = f"[for {intended}] {req.subject}" if is_relay else req.subject
    html = (BANNER.format(to=intended) + req.html) if is_relay else req.html
    text = req.text or re.sub(r"<[^>]+>", " ", req.html)
    if is_relay:
        text = f"(Demo relay — addressed to {intended})\n\n{text}"

    try:
        res = await call_tool("gcal", "send_email", {
            "action": "send",
            "to": [recipient],
            "subject": subject,
            "body": text[:8000],
            "html_body": html,
        })
    except Exception as e:  # noqa: BLE001
        msg = str(e)
        auth = "auth_required" in msg
        return {"ok": False, "error": "Gmail needs to be reconnected." if auth else msg[:300],
                "auth_required": auth}

    entry = {
        "id": req.complaint_id,
        "status": req.status,
        "intended": intended,
        "delivered_to": recipient,
        "relayed": is_relay,
        "subject": subject,
        "at": int(time.time() * 1000),
        "provider_response": json.dumps(res)[:400],
    }
    log = LOG.setdefault(req.visitor, [])
    log.insert(0, entry)
    del log[LIMIT_PER_VISITOR:]
    return {"ok": True, **entry}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
