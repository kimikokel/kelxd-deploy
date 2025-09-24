// Kelist - Personal Reminder Boards
// Data Structure and State Management

class KelistApp {
    constructor() {
        this.boards = [];
        this.currentBoardId = null;
        this.currentEditingItem = null;
        this.currentEditingCategory = null;
        this.currentAddingItemCategory = null;
        this.currentMovingItem = null;
        this.apiUrl = window.KELIST_CONFIG?.API_URL || 'http://localhost:3000/api';
        this.syncEnabled = false;
        this.syncRetryCount = 0;
        this.maxRetries = window.KELIST_CONFIG?.RETRY_ATTEMPTS || 3;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderBoards();
        this.checkSyncConnection();
    }

    // Data Management
    async loadData() {
        try {
            // Try to load from server first
            const response = await fetch(`${this.apiUrl}/boards`);
            if (response.ok) {
                this.boards = await response.json();
                this.syncEnabled = true;
                this.showSyncStatus('✅ Synced', 'success');
            } else {
                throw new Error('Server not available');
            }
        } catch (error) {
            // Fallback to localStorage
            const localData = localStorage.getItem('kelist-boards');
            this.boards = localData ? JSON.parse(localData) : [];
            this.syncEnabled = false;
            console.log('Using local storage:', error.message);
        }
    }

    async saveData() {
        // Save to localStorage first (always)
        localStorage.setItem('kelist-boards', JSON.stringify(this.boards));
        
        // Try to sync to server with retry logic
        await this.syncToServer();
    }

    async syncToServer(retryCount = 0) {
        if (!this.apiUrl.includes('localhost') || this.syncEnabled) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch(`${this.apiUrl}/boards`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(this.boards),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    this.syncEnabled = true;
                    this.syncRetryCount = 0;
                    this.showSyncStatus('✅ Synced', 'success');
                } else {
                    throw new Error(`Server responded with ${response.status}`);
                }
            } catch (error) {
                if (retryCount < this.maxRetries) {
                    this.showSyncStatus('🔄 Retrying...', 'warning');
                    setTimeout(() => {
                        this.syncToServer(retryCount + 1);
                    }, (window.KELIST_CONFIG?.RETRY_DELAY || 2000) * (retryCount + 1));
                } else {
                    this.syncEnabled = false;
                    this.showSyncStatus('⚠️ Offline mode', 'warning');
                    console.error('Sync error after retries:', error.message);
                }
            }
        }
    }

    async checkSyncConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            this.syncEnabled = response.ok;
        } catch (error) {
            this.syncEnabled = false;
        }
    }

    showSyncStatus(message, type = 'info') {
        const syncStatus = document.getElementById('syncStatus');
        const syncIndicator = document.getElementById('syncIndicator');
        
        syncIndicator.textContent = message;
        syncStatus.classList.add('show');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            syncStatus.classList.remove('show');
        }, 3000);
    }

    // Board Management
    createBoard(title) {
        const board = {
            id: Date.now().toString(),
            title: title || 'Untitled Board',
            items: [],
            categories: [], // New: categories array
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.boards.push(board);
        this.currentBoardId = board.id;
        this.saveData();
        this.renderBoards();
        this.renderCurrentBoard();
    }

    deleteBoard(boardId) {
        if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            this.boards = this.boards.filter(board => board.id !== boardId);
            
            if (this.currentBoardId === boardId) {
                this.currentBoardId = this.boards.length > 0 ? this.boards[0].id : null;
            }
            
            this.saveData();
            this.renderBoards();
            this.renderCurrentBoard();
        }
    }

    switchBoard(boardId) {
        this.currentBoardId = boardId;
        this.renderBoards();
        this.renderCurrentBoard();
    }

    updateBoardTitle(boardId, newTitle) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            board.title = newTitle;
            board.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderBoards();
        }
    }

    getCurrentBoard() {
        return this.boards.find(board => board.id === this.currentBoardId);
    }

    // Category Management
    addCategory(name, color = '#E2E8F0') {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard || !name.trim()) return;

        const category = {
            id: Date.now().toString(),
            name: name.trim(),
            color: color,
            createdAt: new Date().toISOString()
        };

        if (!currentBoard.categories) {
            currentBoard.categories = []; // Backward compatibility
        }

        currentBoard.categories.push(category);
        currentBoard.updatedAt = new Date().toISOString();
        this.saveData();
        this.renderCurrentBoard();
    }

    editCategory(categoryId, newName, newcolor) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard || !currentBoard.categories) return;

        const category = currentBoard.categories.find(c => c.id === categoryId);
        if (category) {
            if (newName && newName.trim()) {
                category.name = newName.trim();
            }
            if (newcolor) {
                category.color = newcolor;
            }
            currentBoard.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderCurrentBoard();
        }
    }

    deleteCategory(categoryId) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard || !currentBoard.categories) return;

        if (confirm('Delete this category? Items in this category will become uncategorised.')) {
            // Remove category
            currentBoard.categories = currentBoard.categories.filter(c => c.id !== categoryId);
            
            // Update items that belonged to this category
            currentBoard.items.forEach(item => {
                if (item.categoryId === categoryId) {
                    delete item.categoryId;
                }
            });

            currentBoard.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderCurrentBoard();
        }
    }

    // Item Management
    addItem(text, categoryId = null) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard || !text.trim()) return;

        const item = {
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
            categoryId: categoryId, // New: category assignment
            createdAt: new Date().toISOString()
        };

        currentBoard.items.push(item);
        currentBoard.updatedAt = new Date().toISOString();
        this.saveData();
        this.renderCurrentBoard();
    }

    toggleItem(itemId) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        const item = currentBoard.items.find(i => i.id === itemId);
        if (item) {
            item.completed = !item.completed;
            currentBoard.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderCurrentBoard();
        }
    }

    editItem(itemId, newText) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        const item = currentBoard.items.find(i => i.id === itemId);
        if (item && newText.trim()) {
            item.text = newText.trim();
            currentBoard.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderCurrentBoard();
        }
    }

    deleteItem(itemId) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        currentBoard.items = currentBoard.items.filter(i => i.id !== itemId);
        currentBoard.updatedAt = new Date().toISOString();
        this.saveData();
        this.renderCurrentBoard();
    }

    // UI Rendering
    renderBoards() {
        const tabsContainer = document.getElementById('boardsTabs');
        const emptyState = document.getElementById('emptyState');
        const boardView = document.getElementById('boardView');

        if (this.boards.length === 0) {
            tabsContainer.innerHTML = '';
            emptyState.style.display = 'block';
            boardView.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        boardView.style.display = 'block';

        tabsContainer.innerHTML = this.boards.map(board => `
            <button class="board-tab ${board.id === this.currentBoardId ? 'active' : ''}"
                    onclick="app.switchBoard('${board.id}')"
                    title="${board.title}">
                ${board.title}
            </button>
        `).join('');
    }

    renderCurrentBoard() {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        const boardTitle = document.getElementById('boardTitle');
        const itemsContainer = document.getElementById('itemsContainer');

        boardTitle.value = currentBoard.title;

        // Ensure categories array exists for backward compatibility
        if (!currentBoard.categories) {
            currentBoard.categories = [];
        }

        if (currentBoard.items.length === 0 && currentBoard.categories.length === 0) {
            itemsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #718096;">
                    <h3>📝 No items yet</h3>
                    <p>Add categories and items to get organized!</p>
                    <button class="btn-secondary" onclick="app.openCategoryModal()">+ Add Category</button>
                </div>
            `;
            return;
        }

        let html = '';

        // Categories section
        if (currentBoard.categories.length > 0) {
            html += '<div class="categories-section">';
            
            currentBoard.categories.forEach(category => {
                const categoryItems = currentBoard.items.filter(item => item.categoryId === category.id);
                const sortedCategoryItems = [...categoryItems].sort((a, b) => {
                    if (a.completed === b.completed) return 0;
                    return a.completed ? 1 : -1;
                });

                html += `
                    <div class="category-group" data-category-id="${category.id}">
                        <div class="category-header" style="border-left: 4px solid ${category.color}">
                            <h3 class="category-title">${category.name}</h3>
                            <div class="category-actions">
                                <button class="btn-small" onclick="app.openAddItemModal('${category.id}')" title="Add item to ${category.name}">
                                    ➕ Add
                                </button>
                                <button class="btn-small" onclick="app.editCategoryPrompt('${category.id}')" title="Edit category">
                                    ✏️
                                </button>
                                <button class="btn-small danger" onclick="app.deleteCategory('${category.id}')" title="Delete category">
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <div class="category-items">`;

                if (sortedCategoryItems.length === 0) {
                    html += `
                        <div class="empty-category">
                            <p>No items in this category yet</p>
                            <button class="btn-small" onclick="app.openAddItemModal('${category.id}')">Add First Item</button>
                        </div>`;
                } else {
                    sortedCategoryItems.forEach(item => {
                        html += this.renderItem(item);
                    });
                }

                html += '</div></div>';
            });

            html += '</div>';
        }

        // uncategorised items
        const uncategorisedItems = currentBoard.items.filter(item => !item.categoryId);
        if (uncategorisedItems.length > 0) {
            const sorteduncategorised = [...uncategorisedItems].sort((a, b) => {
                if (a.completed === b.completed) return 0;
                return a.completed ? 1 : -1;
            });

            html += `
                <div class="uncategorised-section">
                    <div class="category-header">
                        <h3 class="category-title">📌 Default Category</h3>
                        <div class="category-actions">
                            <button class="btn-small" onclick="app.openAddItemModal()" title="Add uncategorised item">
                                ➕ Add
                            </button>
                        </div>
                    </div>
                    <div class="category-items">`;
                    
            sorteduncategorised.forEach(item => {
                html += this.renderItem(item);
            });

            html += '</div></div>';
        }

        // Add category button at the bottom
        html += `
            <div class="add-category-section">
                <button class="btn-secondary add-category-btn" onclick="app.openCategoryModal()">
                    🏷️ Add New Category
                </button>
            </div>
        `;

        itemsContainer.innerHTML = html;
    }

    renderItem(item) {
        return `
            <div class="item ${item.completed ? 'completed' : ''}">
                <div class="item-content">
                    <input type="checkbox" 
                           class="item-checkbox" 
                           ${item.completed ? 'checked' : ''}
                           onchange="app.toggleItem('${item.id}')">
                    <span class="item-text" onclick="app.startEditItem('${item.id}')">
                        ${item.text}
                    </span>
                    <div class="item-actions">
                        <button class="btn-small" onclick="app.startEditItem('${item.id}')" title="Edit item">
                            ✏️
                        </button>
                        <button class="btn-small" onclick="app.moveItemToCategory('${item.id}')" title="Move to category">
                            📁
                        </button>
                        <button class="btn-small danger" onclick="app.deleteItem('${item.id}')" title="Delete item">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Event Handlers
    setupEventListeners() {
        // New board button
        document.getElementById('newBoardBtn').onclick = () => this.openNewBoardModal();

        // Add item button
        document.getElementById('addItemBtn').onclick = () => this.promptAddItem();

        // Delete board button
        document.getElementById('deleteBoardBtn').onclick = () => {
            if (this.currentBoardId) {
                this.deleteBoard(this.currentBoardId);
            }
        };

        // Board title input
        document.getElementById('boardTitle').onblur = (e) => {
            if (this.currentBoardId && e.target.value.trim()) {
                this.updateBoardTitle(this.currentBoardId, e.target.value.trim());
            }
        };

        document.getElementById('boardTitle').onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        };

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.onclick = () => this.closeModal();
        });

        // Click outside modal to close
        window.onclick = (event) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    this.closeModal();
                }
            });
        };

        // Keyboard shortcuts
        document.onkeydown = (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openNewBoardModal();
            }
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.promptAddItem();
            }
        };
    }

    // Modal Management
    openNewBoardModal() {
        const modal = document.getElementById('newBoardModal');
        const input = document.getElementById('newBoardTitle');
        modal.style.display = 'block';
        input.focus();
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.confirmCreateBoard();
            }
        };
    }

    // Category Modal Functions
    openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        const input = document.getElementById('categoryName');
        const colorInput = document.getElementById('categorycolor');
        
        // Reset form
        input.value = '';
        colorInput.value = '#E2E8F0';
        
        modal.style.display = 'block';
        input.focus();
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.confirmCreateCategory();
            }
        };
    }

    confirmCreateCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categorycolor').value;
        
        if (name) {
            this.addCategory(name, color);
            this.closeModal();
        } else {
            alert('Please enter a category name');
        }
    }

    editCategoryPrompt(categoryId) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard || !currentBoard.categories) return;

        const category = currentBoard.categories.find(c => c.id === categoryId);
        if (!category) return;

        const modal = document.getElementById('editCategoryModal');
        const nameInput = document.getElementById('editCategoryName');
        const colorInput = document.getElementById('editCategorycolor');

        nameInput.value = category.name;
        colorInput.value = category.color;
        
        this.currentEditingCategory = categoryId;
        modal.style.display = 'block';
        nameInput.focus();
        nameInput.select();

        nameInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.confirmEditCategory();
            }
        };
    }

    confirmEditCategory() {
        const newName = document.getElementById('editCategoryName').value.trim();
        const newcolor = document.getElementById('editCategorycolor').value;
        
        if (newName && this.currentEditingCategory) {
            this.editCategory(this.currentEditingCategory, newName, newcolor);
            this.closeModal();
        } else {
            alert('Please enter a category name');
        }
    }

    // Item Modal Functions
    openAddItemModal(categoryId = null) {
        const modal = document.getElementById('addItemModal');
        const input = document.getElementById('addItemText');
        const categorySelect = document.getElementById('addItemCategory');
        
        input.value = '';
        this.currentAddingItemCategory = categoryId;
        
        // Populate category dropdown
        this.populateCategorySelect(categorySelect, categoryId);
        
        modal.style.display = 'block';
        input.focus();
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.confirmAddItem();
            }
        };
    }

    populateCategorySelect(selectElement, selectedCategoryId = null) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        let options = '<option value="">uncategorised</option>';
        
        if (currentBoard.categories) {
            currentBoard.categories.forEach(category => {
                const selected = category.id === selectedCategoryId ? 'selected' : '';
                options += `<option value="${category.id}" ${selected}>${category.name}</option>`;
            });
        }
        
        selectElement.innerHTML = options;
    }

    confirmAddItem() {
        const text = document.getElementById('addItemText').value.trim();
        const categoryId = document.getElementById('addItemCategory').value || null;
        
        if (text) {
            this.addItem(text, categoryId);
            this.closeModal();
        } else {
            alert('Please enter item text');
        }
    }

    moveItemToCategory(itemId) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        const item = currentBoard.items.find(i => i.id === itemId);
        if (!item) return;

        const modal = document.getElementById('moveItemModal');
        const select = document.getElementById('moveItemCategory');
        
        this.currentMovingItem = itemId;
        this.populateCategorySelect(select, item.categoryId);
        
        modal.style.display = 'block';
    }

    confirmMoveItem() {
        const newCategoryId = document.getElementById('moveItemCategory').value || null;
        
        if (this.currentMovingItem) {
            const currentBoard = this.getCurrentBoard();
            const item = currentBoard.items.find(i => i.id === this.currentMovingItem);
            
            if (item) {
                item.categoryId = newCategoryId;
                currentBoard.updatedAt = new Date().toISOString();
                this.saveData();
                this.renderCurrentBoard();
            }
            
            this.closeModal();
        }
    }

    confirmCreateBoard() {
        const title = document.getElementById('newBoardTitle').value.trim();
        if (title) {
            this.createBoard(title);
            this.closeModal();
        } else {
            alert('Please enter a board title');
        }
    }

    startEditItem(itemId) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard) return;

        const item = currentBoard.items.find(i => i.id === itemId);
        if (!item) return;

        this.currentEditingItem = itemId;
        const modal = document.getElementById('editItemModal');
        const input = document.getElementById('editItemText');
        
        input.value = item.text;
        modal.style.display = 'block';
        input.focus();
        input.select();
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.confirmEditItem();
            }
        };
    }

    confirmEditItem() {
        const newText = document.getElementById('editItemText').value.trim();
        if (newText && this.currentEditingItem) {
            this.editItem(this.currentEditingItem, newText);
            this.closeModal();
        } else {
            alert('Please enter item text');
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset form values
        document.getElementById('newBoardTitle').value = '';
        document.getElementById('editItemText').value = '';
        
        // Reset category form values
        if (document.getElementById('categoryName')) {
            document.getElementById('categoryName').value = '';
            document.getElementById('categorycolor').value = '#E2E8F0';
        }
        if (document.getElementById('editCategoryName')) {
            document.getElementById('editCategoryName').value = '';
            document.getElementById('editCategorycolor').value = '#E2E8F0';
        }
        if (document.getElementById('addItemText')) {
            document.getElementById('addItemText').value = '';
        }
        
        // Reset current editing states
        this.currentEditingItem = null;
        this.currentEditingCategory = null;
        this.currentAddingItemCategory = null;
        this.currentMovingItem = null;
    }

    promptAddItem() {
        this.openAddItemModal();
    }
}

// Global functions for HTML onclick events
function createNewBoard() {
    app.openNewBoardModal();
}

function confirmCreateBoard() {
    app.confirmCreateBoard();
}

function confirmEditItem() {
    app.confirmEditItem();
}

function confirmCreateCategory() {
    app.confirmCreateCategory();
}

function confirmEditCategory() {
    app.confirmEditCategory();
}

function confirmAddItem() {
    app.confirmAddItem();
}

function confirmMoveItem() {
    app.confirmMoveItem();
}

function closeModal() {
    app.closeModal();
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new KelistApp();
});

// Service worker for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
