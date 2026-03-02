import requests
import time

url = "http://localhost:8000/api/playlist/info"
payload = {
    # The playlist from the user's conversation
    "videoIdOrUrl": "https://www.youtube.com/playlist?list=PLNs1aorVWMRjvh6i3MVWEktbl3x6KSlBw"
}

print(f"Fetching playlist: {payload['videoIdOrUrl']}")
start = time.time()
try:
    response = requests.post(url, json=payload)
    elapsed = time.time() - start
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Fetched in {elapsed:.2f} seconds")
        print(f"Title: {data.get('title')}")
        print(f"Items: {len(data.get('entries', []))}")
        print(f"First Item: {data.get('entries', [])[0]['title']}")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Error: {e}")
