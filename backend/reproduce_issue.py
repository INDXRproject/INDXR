
import asyncio
import os
from main import extract_with_ytdlp
from youtube_client import YouTubeClient
from dotenv import load_dotenv

load_dotenv()

async def debug_playlist():
    youtube = YouTubeClient()
    playlist_id = "PLks3neA_yD2brmq1qcPgHZyBCdGsOxt9o"
    
    print(f"Fetching playlist {playlist_id}...")
    try:
        result = youtube.get_playlist_items(playlist_id)
        entries = result['entries']
        print(f"Found {len(entries)} videos.")
        
        # Determine the 6th video
        if len(entries) >= 6:
            target_video = entries[5] # 0-indexed
            video_id = target_video['id']
            title = target_video['title']
            print(f"\n--- Testing Video 6 ---")
            print(f"ID: {video_id}")
            print(f"Title: {title}")
            
            print("Attempting extraction with yt-dlp...")
            try:
                data = await extract_with_ytdlp(video_id, use_proxy=True)
                if isinstance(data, list) or not data:
                    print("FAILURE: No captions returned (empty result)")
                else:
                    print(f"SUCCESS: Extracted {len(data.get('transcript', []))} lines.")
            except Exception as e:
                print(f"FAILURE: Exception occurred: {e}")
        else:
            print("Playlist has fewer than 6 videos.")
            
    except Exception as e:
        print(f"Playlist fetch failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug_playlist())
