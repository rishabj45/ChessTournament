import sqlite3

conn = sqlite3.connect('chess_tournament.db')
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", tables)

# View first 5 rows of each table
for table_name, in tables:
    print(f"\nData from table: {table_name}")
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
    rows = cursor.fetchall()
    for row in rows:
        print(row)

conn.close()
