import os
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import isodate
import logging

logger = logging.getLogger("indxr-backend")

class YouTubeClient:
    def __init__(self):
        self.api_key = os.getenv("YOUTUBE_API_KEY")
        if not self.api_key:
            logger.warning("YOUTUBE_API_KEY not found. Fallback to scraping will be used.")
            self.youtube = None
        else:
            try:
                self.youtube = build('youtube', 'v3', developerKey=self.api_key)
                logger.info("YouTube Data API client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize YouTube Data API client: {e}")
                self.youtube = None

    def parse_duration(self, duration_iso):
        """Convert ISO 8601 duration to seconds."""
        try:
            return int(isodate.parse_duration(duration_iso).total_seconds())
        except Exception:
            return 0

    def get_playlist_items(self, playlist_id, max_results=50):
        """
        Fetch all items from a playlist.
        Note: We limit to 50 for now based on current requirements, 
        but pagination support can be added easily.
        """
        if not self.youtube:
            raise Exception("YouTube API client not initialized")

        try:
            # 1. Get playlist details (title)
            playlist_response = self.youtube.playlists().list(
                part="snippet,contentDetails",
                id=playlist_id
            ).execute()
            
            if not playlist_response.get("items"):
                raise Exception("Playlist not found or private")
                
            playlist_title = playlist_response["items"][0]["snippet"]["title"]
            
            # 2. Get playlist items (video IDs)
            # We fetch up to 50 items (1 quota unit)
            # For >50 items, we would need to handle nextPageToken
            items_response = self.youtube.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=playlist_id,
                maxResults=max_results
            ).execute()
            
            video_ids = []
            playlist_entries = []
            
            for item in items_response.get("items", []):
                snippet = item["snippet"]
                video_id = snippet["resourceId"]["videoId"]
                video_ids.append(video_id)
                
                # Preliminary entry with basic info
                playlist_entries.append({
                    "id": video_id,
                    "title": snippet["title"],
                    "thumbnail": snippet["thumbnails"].get("high", {}).get("url") or snippet["thumbnails"].get("default", {}).get("url"),
                    # Duration is NOT in playlistItems, must fetch from videos endpoint
                    "duration": 0
                })
                
            # 3. Get video details (duration, caption status)
            # Batch fetch video details (1 quota unit)
            if video_ids:
                videos_response = self.youtube.videos().list(
                    part="contentDetails,snippet",
                    id=",".join(video_ids)
                ).execute()
                
                video_map = {v["id"]: v for v in videos_response.get("items", [])}
                
                # Enrich entries with duration and verify availability
                final_entries = []
                for entry in playlist_entries:
                    vid_details = video_map.get(entry["id"])
                    if vid_details:
                        # Update duration
                        duration_iso = vid_details["contentDetails"]["duration"]
                        entry["duration"] = self.parse_duration(duration_iso)
                        
                        # Check caption availability (returns 'true' or 'false' string)
                        caption_status = vid_details["contentDetails"].get("caption", "false")
                        entry["has_captions"] = (caption_status == "true")
                        
                        # Filter out private/deleted videos if title indicates it
                        # API usually returns them but title might be "Private video"
                        if entry["title"] not in ["Private video", "Deleted video"]:
                             final_entries.append(entry)
            
            return {
                "success": True,
                "title": playlist_title,
                "entries": final_entries,
                "total_count": playlist_response["items"][0]["contentDetails"]["itemCount"]
            }

        except HttpError as e:
            logger.error(f"YouTube API Error: {e}")
            raise Exception(f"YouTube API Error: {e}")
        except Exception as e:
            logger.error(f"Error fetching playlist: {e}")
            raise

    def get_video_details(self, video_id):
        """Fetch details for a single video."""
        if not self.youtube:
             raise Exception("YouTube API client not initialized")

        try:
            response = self.youtube.videos().list(
                part="snippet,contentDetails",
                id=video_id
            ).execute()
            
            items = response.get("items", [])
            if not items:
                raise Exception("Video not found")
                
            item = items[0]
            return {
                "success": True,
                "title": item["snippet"]["title"],
                "duration": self.parse_duration(item["contentDetails"]["duration"]),
                "thumbnail": item["snippet"]["thumbnails"].get("high", {}).get("url")
            }
            
        except Exception as e:
            logger.error(f"Error fetching video details: {e}")
            raise
