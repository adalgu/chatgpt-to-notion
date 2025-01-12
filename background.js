chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportToNotion") {
    console.log('Received exportToNotion request:', request); // 디버깅 로그 추가
    handleNotionExport(request.content, request.blocks).then(sendResponse);
    return true; // Will respond asynchronously
  }
});

async function loadEnvConfig() {
  try {
    const envUrl = chrome.runtime.getURL('.env');
    const response = await fetch(envUrl);
    const text = await response.text();
    
    const config = {};
    text.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          config[key.trim()] = value.trim();
        }
      }
    });
    
    return {
      notionKey: config.NOTION_API_KEY,
      databaseId: config.NOTION_DATABASE_ID
    };
  } catch (error) {
    console.error('Error loading .env:', error);
    // Fallback to storage
    return chrome.storage.sync.get(['notionKey', 'databaseId']);
  }
}

function isValidNotionBlock(block) {
  if (!block || typeof block !== 'object') return false;
  
  // Check required properties
  if (!block.object || block.object !== 'block') return false;
  if (!block.type || typeof block.type !== 'string') return false;
  
  // Check if the block has content for its type
  if (!block[block.type]) return false;
  
  // For text-based blocks, check rich_text array
  const textBasedTypes = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'code', 'quote', 'image'];
  if (textBasedTypes.includes(block.type)) {
    if (block.type === 'image') {
      if (!block.image || !block.image.external || !block.image.external.url) return false;
    } else {
      if (!Array.isArray(block[block.type].rich_text)) return false;
      if (block.type !== 'image' && block[block.type].rich_text.length === 0) return false;
    }
  }
  
  return true;
}

async function createNotionPage(settings, title, blocks, isPlainText = false) {
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28' // 최신 Notion API 버전으로 업데이트
    },
    body: JSON.stringify({
      parent: { database_id: settings.databaseId },
      properties: {
        Name: {
          title: [{ 
            text: { 
              content: isPlainText ? title.substring(0, 50) + "..." : title 
            } 
          }]
        }
      },
      children: blocks
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Notion API Error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

async function handleNotionExport(content, blocks) {
  try {
    const settings = await loadEnvConfig();
    
    if (!settings.notionKey || !settings.databaseId) {
      throw new Error('Notion API key and Database ID are required');
    }

    console.log('Handling Notion Export with Blocks:', blocks); // 디버깅 로그 추가

    // First attempt: Try with formatted blocks
    try {
      const validBlocks = blocks.filter(block => {
        try {
          const isValid = isValidNotionBlock(block);
          if (!isValid) {
            console.warn('Invalid block detected and skipped:', block);
          }
          return isValid;
        } catch (error) {
          console.error('Error validating block:', block, error);
          return false;
        }
      });

      console.log('Valid Blocks for Notion:', validBlocks); // 디버깅 로그 추가

      if (validBlocks.length > 0) {
        const result = await createNotionPage(settings, content, validBlocks);
        return { success: true, data: result };
      }
    } catch (error) {
      console.log('Formatted export failed, falling back to plain text:', error);
    }

    // Second attempt: Fall back to plain text
    console.log('Attempting plain text fallback');
    
    // Split content into manageable chunks (Notion has a text limit per block)
    const MAX_BLOCK_LENGTH = 2000;
    const textChunks = [];
    let remainingText = content;
    
    while (remainingText.length > 0) {
      textChunks.push(remainingText.slice(0, MAX_BLOCK_LENGTH));
      remainingText = remainingText.slice(MAX_BLOCK_LENGTH);
    }

    const plainTextBlocks = textChunks.map(chunk => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          type: "text",
          text: { content: chunk }
        }]
      }
    }));

    console.log('Plain Text Blocks for Notion:', plainTextBlocks); // 디버깅 로그 추가

    const result = await createNotionPage(
      settings, 
      content.substring(0, 50) + "...", 
      plainTextBlocks, 
      true
    );
    return { 
      success: true, 
      data: result, 
      wasPlainText: true,
      message: 'Content was exported as plain text due to formatting issues'
    };

  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
}
