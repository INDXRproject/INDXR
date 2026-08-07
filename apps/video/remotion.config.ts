import { Config } from '@remotion/cli/config'

// Homepage-friendly output: H.264 MP4, mild compression (small file), overwrite in place.
Config.setVideoImageFormat('jpeg')
Config.setCodec('h264')
Config.setCrf(23)
Config.setOverwriteOutput(true)
