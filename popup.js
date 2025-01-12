document.addEventListener('DOMContentLoaded', function() {
  // First try to read from .env file
  fetch(chrome.runtime.getURL('.env'))
    .then(response => response.text())
    .then(envContent => {
      const envVars = {};
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      });

      if (envVars.NOTION_API_KEY && envVars.NOTION_DATABASE_ID) {
        // Store env variables to chrome.storage for content.js to use
        chrome.storage.sync.set({
          notionKey: envVars.NOTION_API_KEY,
          databaseId: envVars.NOTION_DATABASE_ID
        }, function() {
          // Try to export
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractAndExport"});
          });
        });
      } else {
        // If .env is incomplete, check chrome.storage
        checkStoredSettings();
      }
    })
    .catch(() => {
      // If .env file doesn't exist or can't be read, check chrome.storage
      checkStoredSettings();
    });

  function checkStoredSettings() {
    chrome.storage.sync.get(['notionKey', 'databaseId'], function(data) {
      if (!data.notionKey || !data.databaseId) {
        window.location.href = 'settings.html';
        return;
      }
      // Try to export
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "extractAndExport"});
      });
    });
  }

  // Settings button
  document.getElementById('openSettings').addEventListener('click', function() {
    window.location.href = 'settings.html';
  });

  // Export button (for manual retries)
  document.getElementById('exportToNotion').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractAndExport"});
    });
  });
});
