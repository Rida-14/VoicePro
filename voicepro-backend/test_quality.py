from datetime import datetime, timedelta

def test_quality(expected_mins, variance_mins):
    expected = expected_mins
    start = datetime.utcnow()
    end = start + timedelta(minutes=expected + variance_mins)
    
    actual = (end - start).total_seconds() / 60
    
    # This is exactly how the backend calculates it
    quality = min(100, round((actual / expected) * 100)) if expected > 0 else 100
    print(f"Expected: {expected}m | Actual: {actual:.1f}m | Quality: {quality}%")

test_quality(30, 0)
test_quality(30, -5) # Focus lost early
test_quality(30, 5)  # Ran long
test_quality(60, -15)
test_quality(45, -8)
