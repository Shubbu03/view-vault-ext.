const videosContainer = document.getElementById("videos-container");
const emptyState = document.getElementById("empty-state");

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 6) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

function createVideoCard(video) {
  const videoEl = document.createElement("div");
  videoEl.className = "video-card fade-in";
  videoEl.dataset.id = video.id;

  videoEl.innerHTML = `
    <img class="video-thumbnail" src="${video.thumbnailUrl}" alt="${
    video.title
  }" loading="lazy">
    <button class="delete-button" title="Remove from history">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
      </svg>
    </button>
    <div class="video-details">
      <h3 class="video-title">${video.title}</h3>
      <div class="video-meta">
        <span>${video.channelName || "YouTube Channel"}</span>
        <span style="margin: 0 4px;">•</span>
        <span>${formatDate(video.timestamp)}</span>
      </div>
    </div>
  `;

  videoEl.addEventListener("click", (e) => {
    if (e.target.closest(".delete-button")) return;
    chrome.tabs.create({ url: video.url });
  });

  const deleteBtn = videoEl.querySelector(".delete-button");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteVideo(video.id);
  });

  return videoEl;
}

function renderVideos(videos) {
  videosContainer.innerHTML = "";

  if (!videos || videos.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  const videoList = document.createElement("div");
  videoList.className = "video-list";

  videos.forEach((video) => {
    videoList.appendChild(createVideoCard(video));
  });

  videosContainer.appendChild(videoList);
}

function loadVideos() {
  chrome.storage.local.get(["viewedVideos"], (result) => {
    const videos = result.viewedVideos || [];
    renderVideos(videos);
  });
}

function deleteVideo(videoId) {
  const videoEl = document.querySelector(`.video-card[data-id="${videoId}"]`);
  if (videoEl) {
    videoEl.style.opacity = "0.5";
  }

  chrome.storage.local.get(["viewedVideos"], (result) => {
    const viewedVideos = result.viewedVideos || [];
    const updatedVideos = viewedVideos.filter((video) => video.id !== videoId);

    chrome.storage.local.set({ viewedVideos: updatedVideos }, () => {
      if (videoEl) {
        videoEl.remove();
      }

      const remainingVideos = document.querySelectorAll(".video-card");
      if (remainingVideos.length === 0) {
        emptyState.style.display = "flex";
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadVideos();
});
