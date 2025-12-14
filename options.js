document.addEventListener('DOMContentLoaded', init);

// State
let snippets = [];
let deleteId = null;

// DOM Elements (Initialized in init)
let gridContainer, searchInput, quickAddForm, quickLabel, quickValue;
let toast, deleteModal, confirmDeleteBtn, cancelDeleteBtn;

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
}

async function loadSnippets() {
    const data = await chrome.storage.local.get(['snippets']);
    snippets = data.snippets || [];
    renderGrid(snippets);
}

function renderGrid(items) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    
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

function createInlineCard() {
    if (!gridContainer) return;
    if (gridContainer.querySelector('.card.editing')) return;

    const div = document.createElement('div');
    div.className = 'card editing';
    gridContainer.prepend(div);
    enterEditMode(div, null);
}

async function addSnippet(label, value) {
    snippets.unshift({ 
        id: Date.now().toString(),
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
    }
}

function filterSnippets(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = snippets.filter(s => 
        s.label.toLowerCase().includes(lowerQuery) || 
        s.value.toLowerCase().includes(lowerQuery)
    );
    renderGrid(filtered);
}

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
