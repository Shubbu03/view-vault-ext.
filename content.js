(function () {
  if (window.viewVaultContentScriptInjected) return;
  window.viewVaultContentScriptInjected = true;

  let currentVideoId = null;
  let currentVideoData = null;
  let videoWatchStartTime = null;

  function extractVideoData() {
    try {
      const playerElement = document.querySelector("video.html5-main-video");
      if (!playerElement) return null;

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
      console.error("View Vault: Error extracting video data", error);
      return null;
    }
  }

  function saveVideoToStorage(videoData) {
    if (!videoData) return;

    try {
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

        chrome.storage.local.set({ viewedVideos: limitedVideos }, () => {
          console.log("View Vault: Video saved successfully");
        });
      });
    } catch (error) {
      console.error("View Vault: Error saving video", error);
    }
  }

  function handleVideoStart() {
    const videoData = extractVideoData();

    if (!videoData || !videoData.videoId) return;

    if (videoData.videoId !== currentVideoId) {
      currentVideoId = videoData.videoId;
      currentVideoData = videoData;
      videoWatchStartTime = Date.now();

      console.log(
        "View Vault: Started watching new video",
        currentVideoData.title
      );
    }
  }

  function handleVideoEnd() {
    if (!currentVideoData || !currentVideoId) return;

    const watchDuration = Date.now() - videoWatchStartTime;
    if (watchDuration < 10000) {
      console.log(
        "View Vault: Video watched for less than 10 seconds, not saving"
      );
      return;
    }

    console.log("View Vault: Saving video", currentVideoData.title);
    saveVideoToStorage(currentVideoData);

    currentVideoId = null;
    currentVideoData = null;
    videoWatchStartTime = null;
  }

  function setupVideoObserver() {
    const videoElement = document.querySelector("video.html5-main-video");
    if (!videoElement) {
      setTimeout(setupVideoObserver, 1000);
      return;
    }

    videoElement.addEventListener("play", handleVideoStart);
    videoElement.addEventListener("ended", handleVideoEnd);
  }

  function init() {
    setupVideoObserver();
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
