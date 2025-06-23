#!/usr/bin/env python3
"""
dump_db.py

A quick script to dump all rows from every table in your SQLite chess_tournament.db.
"""

import os
import sqlite3
from pathlib import Path
from pprint import pprint

# ─── CONFIGURE YOUR DATABASE PATH HERE ────────────────────────────────────────

# If you’re using a .env, you can load it:
from dotenv import load_dotenv
load_dotenv()  # looks for .env in cwd

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./chess_tournament.db"
)

# Normalize to a filesystem path
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
else:
    raise ValueError("Only sqlite URLs of the form sqlite:///PATH are supported by this dump script")

if not Path(db_path).exists():
    print(f"✖ Database file not found at {db_path}")
    exit(1)

# ─── DUMP LOGIC ───────────────────────────────────────────────────────────────

def dump_table(cursor, table_name: str):
    print(f"\n=== {table_name.upper()} ===")
    cursor.execute(f"PRAGMA table_info({table_name})")
    cols = [row[1] for row in cursor.fetchall()]
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    if not rows:
        print("(no rows)")
    else:
        for row in rows:
            # build dict {col: value}
            record = dict(zip(cols, row))
            pprint(record)

def main():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get list of user tables
    cur.execute("""
      SELECT name FROM sqlite_master
       WHERE type='table'
         AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    """)
    tables = [r[0] for r in cur.fetchall()]

    print(f"Dumping {len(tables)} tables from {db_path!r}: {tables}")
    for tbl in tables:
        dump_table(cur, tbl)

    conn.close()

if __name__ == "__main__":
    main()
