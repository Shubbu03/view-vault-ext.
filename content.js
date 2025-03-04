let currentVideoId = null;
let currentVideoData = null;
let videoWatchStartTime = null;

function extractVideoData() {
  try {
    const url = window.location.href;
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/
    )?.[1];

    if (!videoId) return null;

    const title =
      document
        .querySelector(".ytd-video-primary-info-renderer h1")
        ?.textContent?.trim() ||
      document.querySelector("#title h1")?.textContent?.trim() ||
      document.title.replace(" - YouTube", "");

    const channelName =
      document.querySelector("#owner-name a")?.textContent?.trim() ||
      document.querySelector(".ytd-channel-name a")?.textContent?.trim();

    const durationElement = document.querySelector(".ytp-time-duration");
    const duration = durationElement ? durationElement.textContent : null;

    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    return {
      title,
      url,
      thumbnailUrl,
      videoId,
      channelName,
      duration,
    };
  } catch (error) {
    console.error("Error extracting video data:", error);
    return null;
  }
}

function saveVideoToStorage(videoData) {
  if (!videoData) return;

  chrome.storage.local.get(["viewedVideos"], (result) => {
    const viewedVideos = result.viewedVideos || [];

    const existingVideoIndex = viewedVideos.findIndex(
      (v) => v.url === videoData.url
    );

    if (existingVideoIndex !== -1) {
      viewedVideos[existingVideoIndex].timestamp = Date.now();
    } else {
      viewedVideos.unshift({
        ...videoData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      });
    }

    const limitedVideos = viewedVideos.slice(0, 100);

    chrome.storage.local.set({ viewedVideos: limitedVideos });
  });
}

function handleVideoStart() {
  const videoData = extractVideoData();

  if (!videoData || !videoData.videoId) return;

  if (videoData.videoId !== currentVideoId) {
    currentVideoId = videoData.videoId;
    currentVideoData = videoData;
    videoWatchStartTime = Date.now();
  }
}

function handleVideoEnd() {
  if (!currentVideoData || !currentVideoId) return;

  const watchDuration = Date.now() - videoWatchStartTime;
  if (watchDuration < 10000) {
    console.log("Video watched for less than 10 seconds, not saving");
    return;
  }

  saveVideoToStorage(currentVideoData);

  currentVideoId = null;
  currentVideoData = null;
  videoWatchStartTime = null;
}

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    handleVideoEnd();
    lastUrl = url;

    setTimeout(handleVideoStart, 1500);
  }
}).observe(document, { subtree: true, childList: true });

setTimeout(handleVideoStart, 1500);

window.addEventListener("beforeunload", handleVideoEnd);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_CURRENT_VIDEO") {
    sendResponse({ videoData: currentVideoData });
  }
  return true;
});
