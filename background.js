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

// Handle clicks — inject scripts on-demand instead of relying on always-on content script
chrome.contextMenus.onClicked.addListener((info, tab) => {
    // Handle Quick Add
    if (info.menuItemId === "quick-add-selection") {
        if (tab.id && info.selectionText) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: injectedQuickAdd,
                args: [info.selectionText]
            }).catch(err => console.log("Error injecting Quick Add:", err));
        }
        return;
    }

    if (info.menuItemId === "smart-paster-root" || info.menuItemId === "no-snippets") return;
    
    // Handle Paste
    chrome.storage.local.get(['snippets'], (result) => {
        const snippets = result.snippets || [];
        const snippet = snippets.find(s => s.id === info.menuItemId);
        
        if (snippet && tab.id) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: injectedPaste,
                args: [snippet.value]
            }).catch(err => console.log("Error injecting paste:", err));
        }
    });
});

// Handle messages from injected scripts (saving new snippets)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveNewSnippet") {
        const { label, value } = request;
        
        chrome.storage.local.get(['snippets'], (result) => {
            const snippets = result.snippets || [];
            snippets.push({
                id: crypto.randomUUID(),
                label: label,
                value: value
            });
            chrome.storage.local.set({ snippets });
        });
    }
});

// ---------------------------------------------------------------------------
// Injected functions — executed in the page context via chrome.scripting
// These must be self-contained (no references to outer scope).
// ---------------------------------------------------------------------------

/**
 * Inserts text at the cursor position in the currently focused editable element.
 * Handles <input>, <textarea>, and contentEditable elements.
 */
function injectedPaste(text) {
    const el = document.activeElement;
    if (!el) return;

    // Handle normal inputs and textareas
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const value = el.value;
        
        el.value = value.substring(0, start) + text + value.substring(end);
        el.selectionStart = el.selectionEnd = start + text.length;
        
        // Dispatch events to trigger framework listeners (React, Vue, etc.)
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } 
    // Handle contenteditable divs
    else if (el.isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            
            range.setStartAfter(textNode);
            range.setEndAfter(textNode); 
            selection.removeAllRanges();
            selection.addRange(range);

            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

/**
 * Shows a floating overlay for the user to label and save a selected text snippet.
 * Replaces the unreliable prompt() approach with a styled, inline UI.
 */
function injectedQuickAdd(selectedText) {
    // Prevent duplicate overlays
    if (document.getElementById('smart-paster-quick-add')) return;

    // --- Build overlay ---
    const overlay = document.createElement('div');
    overlay.id = 'smart-paster-quick-add';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; justify-content: center;
        align-items: flex-start; padding-top: 20vh; z-index: 2147483647;
        font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: #111; border: 1px solid #333; border-radius: 4px;
        padding: 1.5rem; width: 400px; max-width: 90vw; color: #e5e5e5;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    const title = document.createElement('div');
    title.textContent = 'Smart Paster \u2014 Quick Add';
    title.style.cssText = 'font-size: 0.8rem; color: #888; margin-bottom: 1rem;';

    const preview = document.createElement('div');
    const previewText = selectedText.length > 100 
        ? selectedText.substring(0, 100) + '\u2026' 
        : selectedText;
    preview.textContent = previewText;
    preview.style.cssText = `
        font-size: 0.85rem; color: #666; margin-bottom: 1rem; padding: 0.5rem;
        background: #000; border: 1px solid #222; border-radius: 2px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Label for this snippet\u2026';
    input.value = selectedText.substring(0, 20);
    input.style.cssText = `
        width: 100%; background: #000; border: 1px solid #333; border-radius: 2px;
        padding: 0.6rem 0.8rem; color: #e5e5e5; font-family: inherit;
        font-size: 0.9rem; outline: none; box-sizing: border-box; margin-bottom: 1rem;
    `;
    input.addEventListener('focus', () => { input.style.borderColor = '#fff'; });
    input.addEventListener('blur', () => { input.style.borderColor = '#333'; });

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 0.5rem;';

    const btnBase = `
        padding: 0.4rem 0.8rem; border-radius: 2px; font-family: inherit;
        font-size: 0.8rem; cursor: pointer; border: 1px solid #333;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = btnBase + 'background: transparent; color: #888;';
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.color = '#e5e5e5'; cancelBtn.style.borderColor = '#e5e5e5'; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.color = '#888'; cancelBtn.style.borderColor = '#333'; });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = btnBase + 'background: #e5e5e5; color: #000; border-color: #e5e5e5; font-weight: 600;';
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#fff'; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = '#e5e5e5'; });

    // --- Wire up events ---
    const cleanup = () => overlay.remove();

    cancelBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

    saveBtn.addEventListener('click', () => {
        const label = input.value.trim();
        if (label) {
            chrome.runtime.sendMessage({
                action: 'saveNewSnippet',
                label: label,
                value: selectedText
            });
            cleanup();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
        if (e.key === 'Escape') cleanup();
        e.stopPropagation();
    });

    // --- Assemble and inject ---
    card.append(title, preview, input, actions);
    actions.append(cancelBtn, saveBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => { input.focus(); input.select(); });
}
