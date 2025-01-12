document.addEventListener('DOMContentLoaded', function() {
  // First try to load from .env file
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
        document.getElementById('notionKey').value = envVars.NOTION_API_KEY;
        document.getElementById('databaseId').value = envVars.NOTION_DATABASE_ID;
      } else {
        // If .env is incomplete, load from chrome.storage
        loadFromStorage();
      }
    })
    .catch(() => {
      // If .env file doesn't exist or can't be read, load from chrome.storage
      loadFromStorage();
    });

  function loadFromStorage() {
    chrome.storage.sync.get(['notionKey', 'databaseId'], function(data) {
      document.getElementById('notionKey').value = data.notionKey || '';
      document.getElementById('databaseId').value = data.databaseId || '';
    });
  }

  // Save settings
  document.getElementById('saveSettings').addEventListener('click', function() {
    const notionKey = document.getElementById('notionKey').value;
    const databaseId = document.getElementById('databaseId').value;
    
    if (!notionKey || !databaseId) {
      document.getElementById('status').textContent = 'Please fill in all fields';
      return;
    }

    chrome.storage.sync.set({
      notionKey: notionKey,
      databaseId: databaseId
    }, function() {
      document.getElementById('status').textContent = 'Settings saved!';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
        window.location.href = 'popup.html';
      }, 1500);
    });
  });

  // Back button
  document.getElementById('backToPopup').addEventListener('click', function() {
    window.location.href = 'popup.html';
  });
});
