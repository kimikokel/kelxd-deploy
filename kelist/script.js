// Kelist - Personal Reminder Boards
// Data Structure and State Management

class KelistApp {
    constructor() {
        this.boards = [];
        this.currentBoardId = null;
        this.currentEditingItem = null;
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

    // Item Management
    addItem(text) {
        const currentBoard = this.getCurrentBoard();
        if (!currentBoard || !text.trim()) return;

        const item = {
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
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

        if (currentBoard.items.length === 0) {
            itemsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #718096;">
                    <h3>📝 No items yet</h3>
                    <p>Add your first item to get started!</p>
                </div>
            `;
            return;
        }

        // Sort items: incomplete first, then completed
        const sortedItems = [...currentBoard.items].sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
        });

        itemsContainer.innerHTML = sortedItems.map(item => `
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
                        <button class="btn-small" onclick="app.startEditItem('${item.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-small danger" onclick="app.deleteItem('${item.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
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
        this.currentEditingItem = null;
    }

    promptAddItem() {
        const text = prompt('Enter new item:');
        if (text && text.trim()) {
            this.addItem(text);
        }
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
        navigator.serviceWorker.register('/kelist/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    });
}
