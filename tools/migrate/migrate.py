from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

import firebase_admin
import requests
from firebase_admin import auth, credentials
from google.cloud import firestore_v1, storage


COLLECTIONS = [
    "users",
    "public_profiles",
    "pets",
    "payments",
    "expenses",
    "events",
    "notifications",
    "posts",
    "postComments",
    "settings",
]

MEDIA_FIELDS = ("photoUrl", "proofUrl", "receiptUrl", "mediaUrl")


@dataclass
class FirebaseContext:
    project_id: str
    database_id: str
    bucket_name: str | None
    db: firestore_v1.Client
    bucket: storage.Bucket | None
    firestore_rest_token: str | None = None


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Migrate Pet Place from Firebase to Cloudflare.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    for name in ("audit", "export"):
        p = sub.add_parser(name)
        add_firebase_args(p)
        if name == "export":
            p.add_argument("--out", default="migration-export")

    load = sub.add_parser("load")
    load.add_argument("--export-dir", default="migration-export")
    load.add_argument("--database", default="caixinha_pet_place")
    load.add_argument("--bucket", default="caixinha-pet-media")
    load.add_argument("--remote", action="store_true")
    load.add_argument("--skip-r2", action="store_true")
    load.add_argument("--skip-d1", action="store_true")

    verify = sub.add_parser("verify")
    verify.add_argument("--export-dir", default="migration-export")
    verify.add_argument("--database", default="caixinha_pet_place")
    verify.add_argument("--remote", action="store_true")

    args = parser.parse_args()
    if args.cmd == "audit":
        audit(args)
    elif args.cmd == "export":
        export(args)
    elif args.cmd == "load":
        load_export(args)
    elif args.cmd == "verify":
        verify_export(args)


def add_firebase_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--service-account", required=True)
    parser.add_argument("--database-id", required=True)
    parser.add_argument("--bucket")
    parser.add_argument(
        "--use-gcloud-firestore",
        action="store_true",
        help="Read Firestore through the REST API using the active gcloud user token.",
    )


def init_firebase(args: argparse.Namespace) -> FirebaseContext:
    service_account = Path(args.service_account)
    if not service_account.exists():
        raise SystemExit(f"Service account not found: {service_account}")
    with service_account.open("r", encoding="utf-8") as handle:
        service_data = json.load(handle)
    project_id = service_data["project_id"]
    cred = credentials.Certificate(str(service_account))
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {"storageBucket": args.bucket or service_data.get("storage_bucket") or ""})
    google_creds = cred.get_credential()
    db = firestore_v1.Client(project=project_id, database=args.database_id, credentials=google_creds)
    bucket_name = args.bucket or service_data.get("storage_bucket")
    bucket = storage.Client(project=project_id, credentials=google_creds).bucket(bucket_name) if bucket_name else None
    rest_token = gcloud_access_token() if getattr(args, "use_gcloud_firestore", False) else None
    return FirebaseContext(project_id, args.database_id, bucket_name, db, bucket, rest_token)


def audit(args: argparse.Namespace) -> None:
    ctx = init_firebase(args)
    auth_users = list_auth_users()
    print(f"Firebase project: {ctx.project_id}")
    print(f"Firestore database: {ctx.database_id}")
    print(f"Auth users: {len(auth_users)}")
    for collection in COLLECTIONS:
        docs = list_firestore_collection(ctx, collection)
        print(f"{collection}: {len(docs)} documents")
    media = collect_media_refs(export_firestore(ctx))
    print(f"Media references: {len(media)}")
    missing = [url for url in media if not can_fetch_media(ctx, url)]
    print(f"Missing/unreadable media: {len(missing)}")
    for url in missing[:20]:
        print(f"  missing: {url}")


def export(args: argparse.Namespace) -> None:
    ctx = init_firebase(args)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    media_dir = out_dir / "media"
    media_dir.mkdir(exist_ok=True)

    data = {
        "meta": {
            "projectId": ctx.project_id,
            "databaseId": ctx.database_id,
            "bucket": ctx.bucket_name,
        },
        "authUsers": list_auth_users(),
        "collections": export_firestore(ctx),
        "mediaMap": {},
    }

    media_refs = sorted(collect_media_refs(data["collections"]))
    for index, url in enumerate(media_refs, start=1):
        key = media_key_for_url(url)
        target = media_dir / key
        target.parent.mkdir(parents=True, exist_ok=True)
        if download_media(ctx, url, target):
            data["mediaMap"][url] = key.replace("\\", "/")
        print(f"[{index}/{len(media_refs)}] {url} -> {data['mediaMap'].get(url, 'FAILED')}")

    (out_dir / "export.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "import.sql").write_text(build_import_sql(data), encoding="utf-8")
    print(f"Export written to {out_dir}")


def list_auth_users() -> list[dict[str, Any]]:
    users: list[dict[str, Any]] = []
    page = auth.list_users()
    while page:
        for user in page.users:
            users.append(user._data)
        page = page.get_next_page()
    return users


def export_firestore(ctx: FirebaseContext) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for collection in COLLECTIONS:
        out[collection] = list_firestore_collection(ctx, collection)
    return out


def list_firestore_collection(ctx: FirebaseContext, collection: str) -> list[dict[str, Any]]:
    if ctx.firestore_rest_token:
        return list_firestore_collection_rest(ctx, collection)
    docs = []
    for snap in ctx.db.collection(collection).stream():
        item = snap.to_dict() or {}
        item["id"] = snap.id
        docs.append(normalize_firestore_value(item))
    return docs


def list_firestore_collection_rest(ctx: FirebaseContext, collection: str) -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    page_token: str | None = None
    base_url = (
        f"https://firestore.googleapis.com/v1/projects/{ctx.project_id}"
        f"/databases/{ctx.database_id}/documents/{collection}"
    )
    headers = {"Authorization": f"Bearer {ctx.firestore_rest_token}"}
    while True:
        params = {"pageSize": "300"}
        if page_token:
            params["pageToken"] = page_token
        response = requests.get(base_url, headers=headers, params=params, timeout=60)
        if response.status_code == 404:
            return docs
        response.raise_for_status()
        payload = response.json()
        for document in payload.get("documents", []):
            item = {
                key: firestore_rest_value(value)
                for key, value in document.get("fields", {}).items()
            }
            item["id"] = document["name"].rsplit("/", 1)[-1]
            docs.append(normalize_firestore_value(item))
        page_token = payload.get("nextPageToken")
        if not page_token:
            return docs


def firestore_rest_value(value: dict[str, Any]) -> Any:
    if "nullValue" in value:
        return None
    if "booleanValue" in value:
        return value["booleanValue"]
    if "integerValue" in value:
        return int(value["integerValue"])
    if "doubleValue" in value:
        return float(value["doubleValue"])
    if "timestampValue" in value:
        return value["timestampValue"]
    if "stringValue" in value:
        return value["stringValue"]
    if "bytesValue" in value:
        return value["bytesValue"]
    if "referenceValue" in value:
        return value["referenceValue"]
    if "geoPointValue" in value:
        return value["geoPointValue"]
    if "arrayValue" in value:
        return [firestore_rest_value(item) for item in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return {
            key: firestore_rest_value(item)
            for key, item in value["mapValue"].get("fields", {}).items()
        }
    return value


def gcloud_access_token() -> str:
    local = Path(os.environ.get("LOCALAPPDATA", "")) / "mise" / "installs" / "gcloud"
    matches = sorted(local.glob("*/bin/gcloud.cmd")) if local.exists() else []
    gcloud = str(matches[-1]) if matches else ""
    if not gcloud:
        gcloud = shutil.which("gcloud") or shutil.which("gcloud.cmd") or ""
    if not gcloud:
        raise SystemExit("gcloud not found for --use-gcloud-firestore.")
    result = subprocess.run([gcloud, "auth", "print-access-token"], text=True, capture_output=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout.splitlines()[0].strip()


def normalize_firestore_value(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: normalize_firestore_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize_firestore_value(v) for v in value]
    return value


def collect_media_refs(collections: dict[str, list[dict[str, Any]]]) -> set[str]:
    refs: set[str] = set()
    for docs in collections.values():
        for doc in docs:
            for field in MEDIA_FIELDS:
                value = doc.get(field)
                if isinstance(value, str) and value.startswith("http") and ("firebasestorage" in value or "storage.googleapis.com" in value):
                    refs.add(value)
    return refs


def can_fetch_media(ctx: FirebaseContext, url: str) -> bool:
    path = firebase_storage_path(url)
    if path and ctx.bucket:
        return ctx.bucket.blob(path).exists()
    try:
        return requests.head(url, timeout=10).status_code < 400
    except requests.RequestException:
        return False


def download_media(ctx: FirebaseContext, url: str, target: Path) -> bool:
    path = firebase_storage_path(url)
    if path and ctx.bucket:
        blob = ctx.bucket.blob(path)
        if blob.exists():
            blob.download_to_filename(target)
            return True
    try:
        response = requests.get(url, timeout=60)
        if response.status_code < 400:
            target.write_bytes(response.content)
            return True
    except requests.RequestException:
        return False
    return False


def firebase_storage_path(url: str) -> str | None:
    parsed = urlparse(url)
    if "/o/" in parsed.path:
        return unquote(parsed.path.split("/o/", 1)[1])
    if parsed.netloc.endswith("storage.googleapis.com"):
        parts = parsed.path.strip("/").split("/", 1)
        if len(parts) == 2:
            return unquote(parts[1])
    return None


def media_key_for_url(url: str) -> str:
    path = firebase_storage_path(url) or urlparse(url).path.strip("/") or "file"
    path = re.sub(r"[^a-zA-Z0-9._/\-]+", "-", path).strip("/")
    return path or "file"


def build_import_sql(data: dict[str, Any]) -> str:
    collections = data["collections"]
    auth_by_uid = {u.get("localId") or u.get("uid"): u for u in data["authUsers"]}
    media_map = data.get("mediaMap", {})
    lines: list[str] = []

    users = {doc["id"]: doc for doc in collections.get("users", [])}
    public_profiles = {doc["id"]: doc for doc in collections.get("public_profiles", [])}
    for uid, doc in {**public_profiles, **users}.items():
        auth_user = auth_by_uid.get(uid, {})
        provider = next((p for p in auth_user.get("providerUserInfo", []) if p.get("providerId") == "google.com"), {})
        email = doc.get("email") or auth_user.get("email") or f"{uid}@missing.invalid"
        photo_key, photo_url = media_pair(doc.get("photoUrl"), media_map)
        values = [
            uid,
            provider.get("rawId") or provider.get("uid"),
            doc.get("name") or auth_user.get("displayName") or "",
            doc.get("phone") or "",
            doc.get("dogName") or "",
            photo_key,
            photo_url,
            doc.get("role") or "resident",
            email,
            doc.get("familyId"),
            doc.get("userStatus") or "active",
            doc.get("createdAt") or now_iso(),
            now_iso(),
        ]
        lines.append(insert("users", ["id", "google_sub", "name", "phone", "dog_name", "photo_key", "photo_url", "role", "email", "family_id", "user_status", "created_at", "updated_at"], values))

    for doc in collections.get("settings", []):
        if doc.get("id") != "config":
            continue
        lines.append(insert("settings", ["id", "pix_key", "monthly_amount", "due_date_day", "payment_instructions", "updated_at"], [
            "config", doc.get("pixKey", ""), doc.get("monthlyAmount", 30), doc.get("dueDateDay", 10), doc.get("paymentInstructions", ""), doc.get("updatedAt") or now_iso()
        ]))

    for doc in collections.get("payments", []):
        proof_key, proof_url = media_pair(doc.get("proofUrl"), media_map)
        lines.append(insert("payments", ["id", "family_id", "month", "amount", "proof_key", "proof_url", "status", "type", "description", "created_at", "updated_at"], [
            doc["id"], doc.get("familyId", ""), doc.get("month", ""), doc.get("amount", 0), proof_key, proof_url, doc.get("status", "pending"), doc.get("type"), doc.get("description"), doc.get("createdAt") or now_iso(), doc.get("updatedAt") or now_iso()
        ]))

    for doc in collections.get("expenses", []):
        receipt_key, receipt_url = media_pair(doc.get("receiptUrl"), media_map)
        lines.append(insert("expenses", ["id", "date", "title", "category", "amount", "receipt_key", "receipt_url", "created_by", "created_at"], [
            doc["id"], doc.get("date", ""), doc.get("title", ""), doc.get("category", ""), doc.get("amount", 0), receipt_key, receipt_url, doc.get("createdBy", ""), doc.get("createdAt") or now_iso()
        ]))

    for doc in collections.get("pets", []):
        photo_key, photo_url = media_pair(doc.get("photoUrl"), media_map)
        lines.append(insert("pets", ["id", "owner_id", "name", "photo_key", "photo_url", "breed", "created_at"], [
            doc["id"], doc.get("ownerId", ""), doc.get("name", ""), photo_key, photo_url, doc.get("breed", ""), doc.get("createdAt") or now_iso()
        ]))

    for doc in collections.get("events", []):
        lines.append(insert("events", ["id", "title", "description", "date", "time", "type", "notify_24h", "notify_1h", "notify_now", "notified_24h", "notified_1h", "notified_now", "created_by", "created_at"], [
            doc["id"], doc.get("title", ""), doc.get("description", ""), doc.get("date", ""), doc.get("time", ""), doc.get("type", "announcement"), int(bool(doc.get("notify24h"))), int(bool(doc.get("notify1h"))), int(bool(doc.get("notifyNow"))), int(bool(doc.get("notified24h"))), int(bool(doc.get("notified1h"))), int(bool(doc.get("notifiedNow"))), doc.get("createdBy", ""), doc.get("createdAt") or now_iso()
        ]))
        for user_id in doc.get("readBy") or []:
            lines.append(insert("event_reads", ["event_id", "user_id", "read_at"], [doc["id"], user_id, now_iso()]))

    for doc in collections.get("notifications", []):
        lines.append(insert("notifications", ["id", "user_id", "title", "message", "is_read", "created_at"], [
            doc["id"], doc.get("userId", ""), doc.get("title", ""), doc.get("message", ""), int(bool(doc.get("isRead"))), doc.get("createdAt") or now_iso()
        ]))

    for doc in collections.get("posts", []):
        media_key, media_url = media_pair(doc.get("mediaUrl"), media_map)
        lines.append(insert("posts", ["id", "author_id", "content", "media_key", "media_url", "media_type", "created_at"], [
            doc["id"], doc.get("authorId", ""), doc.get("content", ""), media_key, media_url, doc.get("mediaType"), doc.get("createdAt") or now_iso()
        ]))
        for user_id in doc.get("likedBy") or []:
            lines.append(insert("post_likes", ["post_id", "user_id", "created_at"], [doc["id"], user_id, now_iso()]))
        for user_id in doc.get("tags") or []:
            lines.append(insert("post_tags", ["post_id", "user_id"], [doc["id"], user_id]))

    for doc in collections.get("postComments", []):
        lines.append(insert("post_comments", ["id", "post_id", "author_id", "content", "created_at"], [
            doc["id"], doc.get("postId", ""), doc.get("authorId", ""), doc.get("content", ""), doc.get("createdAt") or now_iso()
        ]))

    return "\n".join(lines) + "\n"


def media_pair(url: str | None, media_map: dict[str, str]) -> tuple[str | None, str]:
    if url and url in media_map:
        return media_map[url], ""
    return None, url or ""


def insert(table: str, columns: list[str], values: list[Any]) -> str:
    cols = ", ".join(columns)
    vals = ", ".join(sql_value(v) for v in values)
    updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "id")
    return f"INSERT INTO {table} ({cols}) VALUES ({vals}) ON CONFLICT DO UPDATE SET {updates};"


def sql_value(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def load_export(args: argparse.Namespace) -> None:
    export_dir = Path(args.export_dir)
    sql_file = export_dir / "import.sql"
    if not sql_file.exists():
        raise SystemExit(f"Missing {sql_file}. Run export first.")
    if not args.skip_d1:
        run_wranger(["d1", "migrations", "apply", args.database, *remote_flag(args)])
        run_wranger(["d1", "execute", args.database, *remote_flag(args), "--file", str(sql_file)])
    if not args.skip_r2:
        media_dir = export_dir / "media"
        for path in media_dir.rglob("*"):
            if path.is_file():
                key = path.relative_to(media_dir).as_posix()
                content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                run_wranger(["r2", "object", "put", f"{args.bucket}/{key}", *remote_flag(args), "--file", str(path), "--content-type", content_type])


def verify_export(args: argparse.Namespace) -> None:
    export_dir = Path(args.export_dir)
    data = json.loads((export_dir / "export.json").read_text(encoding="utf-8"))
    expected = {
        "users": len({*(d["id"] for d in data["collections"].get("users", [])), *(d["id"] for d in data["collections"].get("public_profiles", []))}),
        "payments": len(data["collections"].get("payments", [])),
        "expenses": len(data["collections"].get("expenses", [])),
        "pets": len(data["collections"].get("pets", [])),
        "events": len(data["collections"].get("events", [])),
        "notifications": len(data["collections"].get("notifications", [])),
        "posts": len(data["collections"].get("posts", [])),
        "post_comments": len(data["collections"].get("postComments", [])),
    }
    for table, count in expected.items():
        output = run_wranger(["d1", "execute", args.database, *remote_flag(args), "--command", f"SELECT COUNT(*) AS count FROM {table};"], capture=True)
        print(f"{table}: expected>={count} remote={output.strip()}")


def remote_flag(args: argparse.Namespace) -> list[str]:
    return ["--remote"] if getattr(args, "remote", False) else ["--local"]


def run_wranger(args: list[str], capture: bool = False) -> str:
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        raise SystemExit("npx not found. Install Node.js/npm first.")
    cmd = [npx, "wrangler", *args]
    print("$", " ".join(cmd))
    result = subprocess.run(cmd, text=True, encoding="utf-8", errors="replace", capture_output=capture)
    if result.returncode != 0:
        if capture:
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout if capture else ""


def now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    main()
