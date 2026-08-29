document.addEventListener('DOMContentLoaded', init);

// State
let snippets = [];
let deleteId = null;

// DOM Elements (Initialized in init)
let gridContainer, searchInput, quickAddForm, quickLabel, quickValue;
let toast, deleteModal, confirmDeleteBtn, cancelDeleteBtn;
let snippetCount, exportBtn, importBtn, importFile;

function init() {
    // Initialize References
    gridContainer = document.getElementById('gridContainer');
    searchInput = document.getElementById('searchInput');
    quickAddForm = document.getElementById('quickAddForm');
    quickLabel = document.getElementById('quickLabel');
    quickValue = document.getElementById('quickValue');
    toast = document.getElementById('toast');
    deleteModal = document.getElementById('deleteModal');
    confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    snippetCount = document.getElementById('snippetCount');
    exportBtn = document.getElementById('exportBtn');
    importBtn = document.getElementById('importBtn');
    importFile = document.getElementById('importFile');

    loadSnippets();
    setupEventListeners();
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSnippets(e.target.value));
        // Ctrl+K to search
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }
    
    if (quickAddForm) {
        quickAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const label = quickLabel.value.trim();
            const value = quickValue.value.trim();
            
            if (label && value) {
                await addSnippet(label, value);
                quickLabel.value = '';
                quickValue.value = '';
                loadSnippets();
                showToast("Snippet created!");
            }
        });
    }
    
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', performDelete);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    // Escape key closes the delete modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDeleteModal();
    });

    // Export / Import
    if (exportBtn) exportBtn.addEventListener('click', exportSnippets);
    if (importBtn) importBtn.addEventListener('click', () => importFile && importFile.click());
    if (importFile) importFile.addEventListener('change', handleImport);
}

async function loadSnippets() {
    const data = await chrome.storage.local.get(['snippets']);
    snippets = data.snippets || [];
    renderGrid(snippets);
    updateSnippetCount(snippets.length, snippets.length);
}

function renderGrid(items) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = snippets.length === 0
            ? 'No snippets yet. Use the bar above to add one.'
            : 'No snippets match your search.';
        gridContainer.appendChild(empty);
        return;
    }
    
    items.forEach(snippet => {
        const card = createCardElement(snippet);
        gridContainer.appendChild(card);
    });
}

function createCardElement(snippet) {
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.id = snippet.id;

    // Normal State HTML
    div.innerHTML = `
        <div class="card-label">${escapeHtml(snippet.label)}</div>
        <div class="card-value">${escapeHtml(snippet.value)}</div>
        <div class="card-actions">
            <button class="btn-card-action edit-btn">Edit</button>
            <button class="btn-card-action btn-card-danger delete-btn">Delete</button>
        </div>
    `;

    // Edit Handler
    div.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(div, snippet);
    });

    // Delete Handler
    div.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(snippet.id);
    });

    return div;
}

function enterEditMode(cardElement, snippetOrNull = null) {
    const isNew = !snippetOrNull;
    
    cardElement.classList.add('editing');
    cardElement.innerHTML = `
        <input type="text" class="card-input-label" placeholder="Label" value="${isNew ? '' : escapeHtml(snippetOrNull.label)}" autofocus>
        <textarea class="card-input-value" placeholder="Value">${isNew ? '' : escapeHtml(snippetOrNull.value)}</textarea>
        <div class="card-actions">
            <button class="btn-card-action cancel-btn">Cancel</button>
            <button class="btn-card-action btn-card-primary save-btn">Save</button>
        </div>
    `;

    const labelInput = cardElement.querySelector('.card-input-label');
    const valueInput = cardElement.querySelector('.card-input-value');
    
    // Save Handler
    cardElement.querySelector('.save-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const label = labelInput.value.trim();
        const value = valueInput.value.trim();
        
        if (!label || !value) return; 

        if (isNew) {
            await addSnippet(label, value);
        } else {
            await updateSnippet(snippetOrNull.id, label, value);
        }
        
        loadSnippets();
        showToast(isNew ? "Snippet created!" : "Snippet updated!");
    });

    // Cancel Handler
    cardElement.querySelector('.cancel-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (isNew) {
            cardElement.remove();
        } else {
            const restoredCard = createCardElement(snippetOrNull);
            cardElement.replaceWith(restoredCard);
        }
    });
}

async function addSnippet(label, value) {
    snippets.unshift({ 
        id: crypto.randomUUID(),
        label, 
        value
    });
    await chrome.storage.local.set({ snippets });
}

async function updateSnippet(id, label, value) {
    const index = snippets.findIndex(s => s.id === id);
    if (index !== -1) {
        snippets[index] = { ...snippets[index], label, value };
        await chrome.storage.local.set({ snippets });
    }
}

function openDeleteModal(id) {
    deleteId = id;
    if (deleteModal) deleteModal.classList.add('active');
}

function closeDeleteModal() {
    if (deleteModal) deleteModal.classList.remove('active');
    deleteId = null;
}

async function performDelete() {
    if (deleteId) {
        snippets = snippets.filter(s => s.id !== deleteId);
        await chrome.storage.local.set({ snippets });
        loadSnippets();
        closeDeleteModal();
        showToast("Snippet deleted.");
    }
}

function filterSnippets(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = snippets.filter(s => 
        s.label.toLowerCase().includes(lowerQuery) || 
        s.value.toLowerCase().includes(lowerQuery)
    );
    renderGrid(filtered);
    updateSnippetCount(filtered.length, snippets.length);
}

function updateSnippetCount(shown, total) {
    if (!snippetCount) return;
    if (total === 0) {
        snippetCount.textContent = '';
    } else if (shown === total) {
        snippetCount.textContent = `${total} snippet${total === 1 ? '' : 's'}`;
    } else {
        snippetCount.textContent = `${shown} of ${total} snippet${total === 1 ? '' : 's'}`;
    }
}

// --- Export / Import ---

function exportSnippets() {
    if (snippets.length === 0) {
        showToast("Nothing to export.");
        return;
    }
    const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-paster-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Snippets exported!");
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) throw new Error("Invalid format");

            // Validate and assign fresh IDs to avoid collisions
            const newSnippets = imported
                .filter(s => s.label && s.value)
                .map(s => ({
                    id: crypto.randomUUID(),
                    label: String(s.label),
                    value: String(s.value)
                }));

            if (newSnippets.length === 0) {
                showToast("No valid snippets found in file.");
                return;
            }

            snippets = [...newSnippets, ...snippets];
            await chrome.storage.local.set({ snippets });
            loadSnippets();
            showToast(`Imported ${newSnippets.length} snippet${newSnippets.length === 1 ? '' : 's'}!`);
        } catch (err) {
            showToast("Import failed: invalid JSON file.");
        }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-imported
    e.target.value = '';
}

// --- Utilities ---

function showToast(message = "Done!") {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
