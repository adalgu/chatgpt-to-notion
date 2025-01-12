function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: ${isError ? '#f44336' : '#4CAF50'};
    color: white;
    padding: 16px;
    border-radius: 4px;
    z-index: 10000;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function extractAndExport() {
  // Show initial message
  showNotification('Sending to Notion...');

  const articles = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
  
  if (articles.length > 0) {
    const lastArticle = articles[articles.length - 1];
    
    // 마지막 대화에서 어시스턴트 메시지 요소 찾기
    const assistantMessage = lastArticle.querySelector('[data-message-author-role="assistant"]');
    
    if (assistantMessage) {
      const markdownElement = assistantMessage.querySelector('.markdown.prose');
      if (markdownElement) {
        try {
          const blocks = [];
          
          // 각 요소를 처리
          Array.from(markdownElement.children).forEach(node => {
            try {
              const processedBlocks = convertNodeToBlock(node);
              if (Array.isArray(processedBlocks)) {
                blocks.push(...processedBlocks);
              } else if (processedBlocks) {
                blocks.push(processedBlocks);
              } else {
                // 블록 변환 실패 시 일반 텍스트로 변환
                const text = node.textContent.trim();
                if (text) {
                  blocks.push({
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                      rich_text: [{ type: "text", text: { content: text } }]
                    }
                  });
                }
              }
            } catch (error) {
              console.error('Error processing node:', error);
              // 블록 변환 실패 시 일반 텍스트로 추가
              const text = node.textContent.trim();
              if (text) {
                blocks.push({
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [{ type: "text", text: { content: text } }]
                  }
                });
              }
            }
          });

          console.log('Collected Blocks:', blocks); // 디버깅용 로그

          if (blocks.length === 0) {
            showNotification('No content blocks to export', true);
            return;
          }

          chrome.runtime.sendMessage(
            { 
              action: "exportToNotion", 
              content: markdownElement.textContent.substring(0, 50) + "...",
              blocks: blocks 
            },
            (response) => {
              if (response.success) {
                if (response.wasPlainText) {
                  showNotification('Exported to Notion as plain text (formatting simplified)');
                } else {
                  showNotification('Successfully exported to Notion with formatting!');
                }
              } else {
                showNotification('Error: ' + response.error, true);
              }
            }
          );
        } catch (error) {
          console.error('Error processing content:', error);
          // 최종 대안: 전체 내용을 단일 텍스트 블록으로 전송
          const text = markdownElement.textContent.trim();
          const blocks = [{
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: text } }]
            }
          }];
          
          chrome.runtime.sendMessage(
            { 
              action: "exportToNotion", 
              content: text.substring(0, 50) + "...",
              blocks: blocks 
            },
            (response) => {
              if (response.success) {
                showNotification('Successfully exported to Notion (as plain text)!');
              } else {
                showNotification('Error: ' + response.error, true);
              }
            }
          );
        }
      } else {
        showNotification('Could not extract message content', true);
      }
    } else {
      showNotification('No assistant message found in the last conversation turn', true);
    }
  } else {
    showNotification('No conversation found', true);
  }
}

function convertNodeToBlock(node) {
  if (!node.tagName) return null;

  try {
    switch (node.tagName.toLowerCase()) {
      case 'h1':
        return {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [{ 
              type: "text", 
              text: { content: node.textContent.trim() }
            }]
          }
        };
      case 'h2':
        return {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ 
              type: "text", 
              text: { content: node.textContent.trim() }
            }]
          }
        };
      case 'h3':
        return {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [{ 
              type: "text", 
              text: { content: node.textContent.trim() }
            }]
          }
        };
      case 'p':
        return {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: node.textContent.trim() } }]
          }
        };
      case 'hr':
        return {
          object: "block",
          type: "divider"
        };
      case 'pre':
        try {
          let codeContent = '';
          let language = 'plain text';

          // 먼저 overflow-y-auto div에서 내용 추출 (ChatGPT의 코드 컨테이너)
          const codeContainer = node.querySelector('.overflow-y-auto');
          if (codeContainer) {
            codeContent = codeContainer.textContent.trim();
            
            // 언어 표시 div에서 언어 추출 시도
            const langDiv = node.querySelector('.flex.items-center');
            if (langDiv) {
              language = langDiv.textContent.trim().toLowerCase();
            }
          } else {
            // 전통적인 코드 요소로 대체
            const codeElement = node.querySelector('code');
            if (codeElement) {
              codeContent = codeElement.textContent.trim();
              const langMatch = codeElement.className.match(/language-(\w+)/);
              if (langMatch) {
                language = langMatch[1];
              }
            } else {
              // 마지막 수단: UI 요소 제외한 모든 텍스트 내용 추출
              const uiElements = node.querySelectorAll(
                '.contain-inline-size, .sticky, .flex.items-center, .absolute, .relative, button'
              );
              let textContent = node.textContent;
              uiElements.forEach(el => {
                textContent = textContent.replace(el.textContent, '');
              });
              codeContent = textContent.trim();
            }
          }

          if (!codeContent) return null;

          // 내용 정리
          codeContent = codeContent
            .replace(/^\s*copy\s*$|^\s*코드\s*복사\s*$/gm, '') // "copy" 버튼 텍스트 제거
            .replace(/\n\s*\n/g, '\n') // 여분의 빈 줄 제거
            .trim();

          return {
            object: "block",
            type: "code",
            code: {
              rich_text: [{ 
                type: "text", 
                text: { content: codeContent }
              }],
              language: language
            }
          };
        } catch (error) {
          console.error('Error processing code block:', error);
          // 코드 블록 처리 실패 시 일반 텍스트로 대체
          const text = node.textContent.trim();
          if (text) {
            return {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ 
                  type: "text", 
                  text: { content: text }
                }]
              }
            };
          }
          return null;
        }

      case 'ul':
      case 'ol':
        const items = Array.from(node.children)
          .map(li => {
            const text = li.textContent.trim();
            if (!text) return null;
            
            const listType = node.tagName.toLowerCase() === 'ol' ? "numbered_list_item" : "bulleted_list_item";
            return {
              object: "block",
              type: listType,
              [listType]: {
                rich_text: [{ 
                  type: "text", 
                  text: { content: text }
                }]
              }
            };
          })
          .filter(item => item !== null);
        
        return items.length > 0 ? items : null;

      case 'blockquote':
        return {
          object: "block",
          type: "quote",
          quote: {
            rich_text: [{ 
              type: "text", 
              text: { content: node.textContent.trim() }
            }]
          }
        };

      case 'img':
        const src = node.getAttribute('src');
        const alt = node.getAttribute('alt') || '';
        return {
          object: "block",
          type: "image",
          image: {
            type: "external",
            external: {
              url: src
            },
            caption: [{
              type: "text",
              text: { content: alt }
            }]
          }
        };

      default:
        const paragraphText = node.textContent.trim();
        if (!paragraphText) return null;
        
        return {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ 
              type: "text", 
              text: { content: paragraphText }
            }]
          }
        };
    }
  } catch (error) {
    console.error('Error in convertNodeToBlock:', error);
    // 일반 텍스트로 대체
    const text = node.textContent.trim();
    if (text) {
      return {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: text } }]
        }
      };
    }
    return null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractAndExport") {
    extractAndExport();
  }
});
