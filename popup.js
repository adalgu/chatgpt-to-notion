document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.sync.get(['notionKey', 'databaseId'], function(data) {
    document.getElementById('notionKey').value = data.notionKey || '';
    document.getElementById('databaseId').value = data.databaseId || '';
  });

  // Save settings
  document.getElementById('saveSettings').addEventListener('click', function() {
    const notionKey = document.getElementById('notionKey').value;
    const databaseId = document.getElementById('databaseId').value;
    
    chrome.storage.sync.set({
      notionKey: notionKey,
      databaseId: databaseId
    }, function() {
      document.getElementById('status').textContent = 'Settings saved!';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 2000);
    });
  });

  // Export button
  document.getElementById('exportToNotion').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractAndExport"});
    });
  });
});