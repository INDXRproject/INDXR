import yt_dlp
import json

url = "https://www.youtube.com/playlist?list=PLTHI_OCTUesNsthoZNh1TVLpxo3grWm1e"
ydl_opts = {
    'extract_flat': 'in_playlist',
    'quiet': True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    print(f"Keys: {info.keys()}")
    print(f"playlist_count: {info.get('playlist_count')}")
    print(f"n_entries: {info.get('n_entries')}")
    print(f"entries length: {len(info.get('entries', []))}")
