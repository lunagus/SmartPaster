chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "paste" && request.value) {
        insertTextAtCursor(request.value);
    }
    else if (request.action === "quickAddPrompt" && request.value) {
        // Delay slightly to ensure context menu closes and focus returns (though prompt blocks anyway)
        setTimeout(() => {
            const label = prompt("Smart Paster: Enter a label for this snippet:", request.value.substring(0, 20));
            if (label) {
                chrome.runtime.sendMessage({
                    action: "saveNewSnippet",
                    label: label,
                    value: request.value
                });
            }
        }, 10);
    }
});

function insertTextAtCursor(text) {
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
