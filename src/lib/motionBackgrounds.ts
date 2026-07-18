// Curated free-to-use looping motion backgrounds (Pexels CDN, direct MP4).
// Grouped by common church service moments. Users can also paste any custom
// video URL from the Motion panel.
export type MotionPreset = {
  id: string;
  label: string;
  category: "Worship" | "Sermon" | "Prayer" | "Welcome" | "Offering" | "Ambient";
  url: string;
  poster?: string;
};

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: "worship-rays",
    label: "Light Rays",
    category: "Worship",
    url: "https://videos.pexels.com/video-files/3163534/3163534-hd_1920_1080_30fps.mp4",
  },
  {
    id: "worship-clouds",
    label: "Golden Clouds",
    category: "Worship",
    url: "https://videos.pexels.com/video-files/2818546/2818546-hd_1920_1080_30fps.mp4",
  },
  {
    id: "sermon-bokeh",
    label: "Soft Bokeh",
    category: "Sermon",
    url: "https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_25fps.mp4",
  },
  {
    id: "sermon-gradient",
    label: "Blue Gradient",
    category: "Sermon",
    url: "https://videos.pexels.com/video-files/3163534/3163534-uhd_2560_1440_30fps.mp4",
  },
  {
    id: "prayer-candles",
    label: "Candles",
    category: "Prayer",
    url: "https://videos.pexels.com/video-files/6981411/6981411-hd_1920_1080_25fps.mp4",
  },
  {
    id: "prayer-smoke",
    label: "Slow Smoke",
    category: "Prayer",
    url: "https://videos.pexels.com/video-files/2547268/2547268-hd_1920_1080_30fps.mp4",
  },
  {
    id: "welcome-waves",
    label: "Ocean Waves",
    category: "Welcome",
    url: "https://videos.pexels.com/video-files/2611250/2611250-hd_1920_1080_30fps.mp4",
  },
  {
    id: "welcome-clouds",
    label: "Time-lapse Sky",
    category: "Welcome",
    url: "https://videos.pexels.com/video-files/2035509/2035509-hd_1920_1080_30fps.mp4",
  },
  {
    id: "offering-gold",
    label: "Gold Particles",
    category: "Offering",
    url: "https://videos.pexels.com/video-files/3129576/3129576-hd_1920_1080_25fps.mp4",
  },
  {
    id: "ambient-lines",
    label: "Flowing Lines",
    category: "Ambient",
    url: "https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_25fps.mp4",
  },
  {
    id: "ambient-particles",
    label: "Drifting Particles",
    category: "Ambient",
    url: "https://videos.pexels.com/video-files/2795750/2795750-hd_1920_1080_30fps.mp4",
  },
];

export const MOTION_CATEGORIES: MotionPreset["category"][] = [
  "Worship",
  "Sermon",
  "Prayer",
  "Welcome",
  "Offering",
  "Ambient",
];
