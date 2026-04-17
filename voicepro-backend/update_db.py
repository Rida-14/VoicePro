import sqlite3

def update_db():
    conn = sqlite3.connect('instance/voicepro.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN focus_sounds BOOLEAN DEFAULT 1")
    except Exception as e:
        print(f"Error adding focus_sounds: {e}")
        
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN voice_feedback BOOLEAN DEFAULT 1")
    except Exception as e:
        print(f"Error adding voice_feedback: {e}")
        
    conn.commit()
    conn.close()
    print("Database updated!")

if __name__ == '__main__':
    update_db()
