# INDXR.AI Python Backend

FastAPI backend dedicated to robust extraction of YouTube metadata and captions using `yt-dlp`.

## Setup

1. **Create Virtual Environment**:

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Run Server**:
   ```bash
   python main.py
   # Or via uvicorn:
   uvicorn main:app --reload --port 8000
   ```

## Configuration

This backend relies on **LunaProxy** for IP rotation to bypass YouTube's strict rate limiting.

- **Proxy Host**: `pr-new.lunaproxy.com`
- **Port**: `12233`
- Credentials are currently hardcoded in `main.py` (To be moved to `.env` in Phase 3).

## API Endpoints

### 1. Health Check with Analytics

`GET /health`

- **Returns**: `{"status": "ok"}`
- **Usage**: Verify server is running.
- **PostHog**: Backend tracks uptime via server-side SDK

### 2. Extract Video Transcript

`POST /api/extract/youtube`

- **Body**: `{"videoIdOrUrl": "https://..."}`
- **Returns**: Full transcript array with offsets, video title, and metadata.
- **Error Handling**: Returns 400 for invalid URLs, 500 for extraction failures (e.g., private video).

### 3. Get Playlist Info

`POST /api/playlist/info`

- **Body**: `{"url": "https://www.youtube.com/playlist?list=..."}` or `{"videoIdOrUrl": "..."}`
- **Returns**:
  ```json
  {
    "success": true,
    "title": "Playlist Title",
    "total_count": 25,
    "entries": [
      { "id": "video_id_1", "title": "Video 1", "thumbnail": "https://..." },
      ...
    ]
  }
  ```
- **Notes**: Limits fetching to first 500 items for performance. Returns `missingCount` logic implicitly via `total_count` vs `entries` length.

## Testing

Use the frontend at `http://localhost:3000/free` for end-to-end testing, or `curl` for direct API checks.
