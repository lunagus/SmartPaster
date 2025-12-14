// Initialize menu on install
chrome.runtime.onInstalled.addListener(() => {
    refreshContextMenu();
});

// Update menu when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.snippets) {
        refreshContextMenu();
    }
});

function refreshContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "smart-paster-root",
            title: "Smart Paster",
            contexts: ["editable"]
        });

        // Add "Quick Add" for selections
        chrome.contextMenus.create({
            id: "quick-add-selection",
            title: "Add to Smart Paster",
            contexts: ["selection"]
        });

        chrome.storage.local.get(['snippets'], (result) => {
            const snippets = result.snippets || [];
            
            if (snippets.length === 0) {
                chrome.contextMenus.create({
                    id: "no-snippets",
                    parentId: "smart-paster-root",
                    title: "No snippets configured (Go to Options)",
                    contexts: ["editable"],
                    enabled: false
                });
            } else {
                snippets.forEach(snippet => {
                    chrome.contextMenus.create({
                        id: snippet.id,
                        parentId: "smart-paster-root",
                        title: snippet.label,
                        contexts: ["editable"]
                    });
                });
            }
        });
    });
}

// Handle clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    // Handle Quick Add
    if (info.menuItemId === "quick-add-selection") {
        if (tab.id && info.selectionText) {
            chrome.tabs.sendMessage(tab.id, {
                action: "quickAddPrompt",
                value: info.selectionText
            }).catch(err => console.log("Error sending prompt:", err));
        }
        return;
    }

    if (info.menuItemId === "smart-paster-root" || info.menuItemId === "no-snippets") return;
    
    // Handle Paste
    chrome.storage.local.get(['snippets'], (result) => {
        const snippets = result.snippets || [];
        const snippet = snippets.find(s => s.id === info.menuItemId);
        
        if (snippet && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                action: "paste",
                value: snippet.value
            }).catch(err => console.log("Could not send message to content script:", err));
        }
    });
});

// Handle messages from content script (saving new snippets)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveNewSnippet") {
        const { label, value } = request;
        
        chrome.storage.local.get(['snippets'], (result) => {
            const snippets = result.snippets || [];
            snippets.push({
                id: Date.now().toString(),
                label: label,
                value: value
            });
            chrome.storage.local.set({ snippets }, () => {
                console.log("Snippet saved via Quick Add");
            });
        });
    }
});
