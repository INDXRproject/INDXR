import requests
import time

# Test video: "The most beautiful beings" from the playlist
video_id = "0F-JtK1a-uU"
url = f"http://localhost:8000/api/video/metadata/{video_id}"

print(f"Fetching video metadata: {video_id}")
start = time.time()
try:
    response = requests.get(url)
    elapsed = time.time() - start
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Fetched in {elapsed:.2f} seconds")
        print(f"Title: {data.get('title')}")
        print(f"Duration: {data.get('duration')}")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Error: {e}")
