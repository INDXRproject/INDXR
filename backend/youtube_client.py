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

    def get_playlist_items(self, playlist_id, max_results=500):
        """
        Fetch all items from a playlist.

        The YouTube Data API returns at most 50 items per page, so we page
        through with nextPageToken until the playlist is exhausted or we hit
        max_results (default 500, matching the yt-dlp fallback's '1-500' cap).
        Video details (videos.list) are also capped at 50 IDs per request, so
        those calls are batched in chunks of 50.
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

            # 2. Get playlist items (video IDs) — paginate with nextPageToken.
            playlist_entries = []
            page_token = None
            while len(playlist_entries) < max_results:
                items_response = self.youtube.playlistItems().list(
                    part="snippet,contentDetails",
                    playlistId=playlist_id,
                    maxResults=50,  # API hard limit per page
                    pageToken=page_token
                ).execute()

                for item in items_response.get("items", []):
                    snippet = item["snippet"]
                    video_id = snippet["resourceId"]["videoId"]
                    playlist_entries.append({
                        "id": video_id,
                        "title": snippet["title"],
                        "thumbnail": snippet["thumbnails"].get("high", {}).get("url") or snippet["thumbnails"].get("default", {}).get("url"),
                        # Duration is NOT in playlistItems, must fetch from videos endpoint
                        "duration": 0
                    })

                page_token = items_response.get("nextPageToken")
                if not page_token:
                    break

            # Trim in case the final page overshot the cap.
            playlist_entries = playlist_entries[:max_results]
            fetched_count = len(playlist_entries)

            # 3. Get video details (duration, caption status) — batched by 50.
            video_map = {}
            all_video_ids = [e["id"] for e in playlist_entries]
            for i in range(0, len(all_video_ids), 50):
                chunk = all_video_ids[i:i + 50]
                videos_response = self.youtube.videos().list(
                    part="contentDetails,snippet",
                    id=",".join(chunk)
                ).execute()
                for v in videos_response.get("items", []):
                    video_map[v["id"]] = v

            # Enrich resolvable videos; drop private/deleted/unavailable ones.
            # videos.list omits videos it can't return (private/deleted/region),
            # and playlistItems titles them "Private video"/"Deleted video".
            final_entries = []
            for entry in playlist_entries:
                vid_details = video_map.get(entry["id"])
                if not vid_details:
                    continue
                if entry["title"] in ["Private video", "Deleted video"]:
                    continue

                duration_iso = vid_details["contentDetails"]["duration"]
                entry["duration"] = self.parse_duration(duration_iso)

                # Check caption availability (returns 'true' or 'false' string)
                caption_status = vid_details["contentDetails"].get("caption", "false")
                entry["has_captions"] = (caption_status == "true")

                final_entries.append(entry)

            # Real unavailable count: fetched playlist items that could not be
            # resolved to a playable video (private/members-only/deleted).
            unavailable_count = fetched_count - len(final_entries)

            return {
                "success": True,
                "title": playlist_title,
                "entries": final_entries,
                "total_count": playlist_response["items"][0]["contentDetails"]["itemCount"],
                "unavailable_count": unavailable_count,
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
            snippet = item["snippet"]
            return {
                "success": True,
                "title": snippet["title"],
                "duration": self.parse_duration(item["contentDetails"]["duration"]),
                "thumbnail": snippet["thumbnails"].get("high", {}).get("url"),
                "channel": snippet["channelTitle"],
                "upload_date": snippet["publishedAt"][:10],
                # defaultAudioLanguage is the primary audio language; fall back to
                # defaultLanguage (title/description language) when absent.
                "language": snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage"),
            }
            
        except Exception as e:
            logger.error(f"Error fetching video details: {e}")
            raise
