#!/usr/bin/env python3
"""
Quick test script to verify backend is working
"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print("✓ Health check passed\n")

def test_signup():
    """Test user signup"""
    print("Testing signup...")
    data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "Test1234"
    }
    response = requests.post(f"{BASE_URL}/auth/signup", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if response.status_code in [201, 409]:  # 409 if user already exists
        print("✓ Signup test passed\n")
        return result.get('token')
    else:
        print("✗ Signup test failed\n")
        return None

def test_login():
    """Test user login"""
    print("Testing login...")
    data = {
        "email": "test@example.com",
        "password": "Test1234"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if response.status_code == 200:
        print("✓ Login test passed\n")
        return result.get('token')
    else:
        print("✗ Login test failed\n")
        return None

def test_create_task(token):
    """Test task creation"""
    if not token:
        print("✗ Skipping task test (no token)\n")
        return
    
    print("Testing task creation...")
    data = {
        "title": "Test Task",
        "description": "This is a test task",
        "priority": "high",
        "duration": 30
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/tasks", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if response.status_code == 201:
        print("✓ Task creation test passed\n")
        return result.get('task', {}).get('task_id')
    else:
        print("✗ Task creation test failed\n")
        return None

def test_get_tasks(token):
    """Test getting tasks"""
    if not token:
        print("✗ Skipping get tasks test (no token)\n")
        return
    
    print("Testing get tasks...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/tasks", headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Number of tasks: {len(result)}")
    
    if response.status_code == 200:
        print("✓ Get tasks test passed\n")
    else:
        print("✗ Get tasks test failed\n")

def main():
    print("\n" + "="*60)
    print("🧪 VoicePro Backend Test Suite")
    print("="*60 + "\n")
    
    try:
        # Test endpoints
        test_health()
        token = test_signup()
        if not token:
            token = test_login()
        test_create_task(token)
        test_get_tasks(token)
        
        print("="*60)
        print("✅ All tests completed!")
        print("="*60 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to backend")
        print("Make sure the backend is running at http://localhost:5000")
        print("\nRun: python app.py\n")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")

if __name__ == "__main__":
    main()
