### dump_db.py
#!/usr/bin/env python3
"""
Dump SQLite DB tables for debugging.
"""

import os
import sqlite3
from pathlib import Path
from pprint import pprint
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chess_tournament.db")

if DATABASE_URL.startswith("sqlite:///") or DATABASE_URL.startswith("sqlite+aiosqlite:///"):
    db_path = DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
else:
    raise ValueError("Only sqlite URLs are supported.")

if not Path(db_path).exists():
    print(f"✖ DB not found at {db_path}")
    exit(1)

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
            record = dict(zip(cols, row))
            pprint(record)

def main():
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
      SELECT name FROM sqlite_master
       WHERE type='table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"Dumping {len(tables)} tables from {db_path!r}: {tables}")
    for tbl in tables:
        dump_table(cur, tbl)
    conn.close()

if __name__ == "__main__":
    main()
