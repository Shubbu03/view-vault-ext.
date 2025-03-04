console.log("View Vault: Background script loaded");

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log("View Vault: Extension installed/updated", reason);

  chrome.storage.local.get(["viewedVideos"], (result) => {
    if (!result.viewedVideos) {
      chrome.storage.local.set({ viewedVideos: [] });
    }
  });
});
