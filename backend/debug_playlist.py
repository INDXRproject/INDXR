import yt_dlp
import json

url = "https://www.youtube.com/playlist?list=PLOU2XLYxmsIKL2S2n8I6V78eC95X8uM8t"
ydl_opts = {
    'extract_flat': True,
    'quiet': False,
    'proxy': 'http://user-7gvqk2mha9d7-sessid-debug-sesstime-90:SCMQY7cKPNyI4@pr-new.lunaproxy.com:12233'
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        print(json.dumps(info.get('title')))
        print(len(info.get('entries', [])))
except Exception as e:
    print(f"Error: {e}")
