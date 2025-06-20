// Book Management System - Frontend JavaScript

class BookManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 10;
    this.filters = {};
    this.books = [];
    this.totalPages = 0;
    this.total = 0;
    this.dbConnected = window.initialDbStatus || false;

    this.initializeEventListeners();
    this.initializeApp();
  }

  async initializeApp() {
    await this.checkDatabaseStatus();
    this.loadBooks();
  }

  initializeEventListeners() {
    // Modal controls
    document.getElementById('addBookBtn').addEventListener('click', () => this.openModal());
    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('bookForm').addEventListener('submit', (e) => this.saveBook(e));

    // Database connection retry
    const retryBtn = document.getElementById('retryConnectionBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryDatabaseConnection());
    }

    // Search and filters
    document.getElementById('searchInput').addEventListener('input', this.debounce(() => this.applyFilters(), 300));
    document.getElementById('genreFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('authorFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('yearFilter').addEventListener('input', this.debounce(() => this.applyFilters(), 300));
    document.getElementById('limitSelect').addEventListener('change', () => this.changeLimit());
    document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

    // Close modal on backdrop click
    document.getElementById('bookModal').addEventListener('click', (e) => {
      if (e.target.id === 'bookModal') {
        this.closeModal();
      }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  async checkDatabaseStatus() {
    try {
      const response = await fetch('/api/db/status');
      const result = await response.json();
      this.dbConnected = result.connected;
    //   console.log('Database status checked:', result.connected);
      return result.connected;
    } catch (error) {
      console.error('Error checking database status:', error);
      this.dbConnected = false;
      return false;
    }
  }

  async retryDatabaseConnection() {
    const retryBtn = document.getElementById('retryConnectionBtn');
    const retryIcon = retryBtn.querySelector('i');
    
    retryBtn.disabled = true;
    retryIcon.classList.add('fa-spin');
    
    try {
      const response = await fetch('/api/db/reconnect', { method: 'POST' });
      const result = await response.json();
      
      if (result.success && result.connected) {
        this.showSuccess('Database reconnected successfully!');
        // Reload the page to update the UI
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        this.showError('Failed to reconnect to database. Please check your configuration.');
      }
    } catch (error) {
      console.error('Error retrying database connection:', error);
      this.showError('Failed to reconnect to database.');
    } finally {
      retryBtn.disabled = false;
      retryIcon.classList.remove('fa-spin');
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadBooks() {
    if (!this.dbConnected) {
      this.showNoDatabaseMessage();
      return;
    }

    try {
      this.showLoading(true);
      
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.limit,
        ...this.filters
      });

      const response = await fetch(`/api/books?${params}`);
      const result = await response.json();

      if (result.success) {
        this.books = result.data;
        this.totalPages = result.totalPages;
        this.total = result.total;
        this.renderBooks();
        this.renderPagination();
        this.updateStats();
      } else {
        if (result.error === 'SERVICE_UNAVAILABLE') {
          this.showNoDatabaseMessage();
        } else {
          this.showError('Failed to load books');
        }
      }
    } catch (error) {
      console.error('Error loading books:', error);
      this.showError('Failed to load books');
    } finally {
      this.showLoading(false);
    }
  }

  showNoDatabaseMessage() {
    const tbody = document.getElementById('booksTableBody');
    const noDataMessage = document.getElementById('noBooksMessage');
    
    tbody.innerHTML = '';
    noDataMessage.innerHTML = `
      <i class="fas fa-database text-6xl text-red-300 mb-4"></i>
      <p class="text-red-500 text-lg">Database not connected</p>
      <p class="text-red-400 text-sm">Please check your database configuration and try again</p>
    `;
    noDataMessage.classList.remove('hidden');
  }

  renderBooks() {
    const tbody = document.getElementById('booksTableBody');
    const noDataMessage = document.getElementById('noBooksMessage');

    if (this.books.length === 0) {
      tbody.innerHTML = '';
      noDataMessage.innerHTML = `
        <i class="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500 text-lg">No books found</p>
        <p class="text-gray-400 text-sm">Try adjusting your search criteria or add a new book</p>
      `;
      noDataMessage.classList.remove('hidden');
      return;
    }

    noDataMessage.classList.add('hidden');
    
    tbody.innerHTML = this.books.map(book => `
      <tr class="hover:bg-gray-50 transition-colors duration-150">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <i class="fas fa-book text-blue-600"></i>
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${this.escapeHtml(book.title)}</div>
              <div class="text-sm text-gray-500">ID: ${book.id}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${this.escapeHtml(book.author)}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            ${book.genre || 'Unspecified'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${book.published_year || '-'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${this.formatDate(book.created_at)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div class="flex justify-end space-x-2">
            <button onclick="bookManager.editBook(${book.id})" 
                    class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors duration-150">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="bookManager.deleteBook(${book.id})" 
                    class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-150">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderPagination() {
    const paginationContainer = document.getElementById('paginationButtons');
    const showingFrom = ((this.currentPage - 1) * this.limit) + 1;
    const showingTo = Math.min(this.currentPage * this.limit, this.total);

    document.getElementById('showingFrom').textContent = this.total > 0 ? showingFrom : 0;
    document.getElementById('showingTo').textContent = showingTo;
    document.getElementById('totalRecords').textContent = this.total;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = '';

    // Previous button
    if (this.currentPage > 1) {
      paginationHTML += `
        <button onclick="bookManager.goToPage(${this.currentPage - 1})" 
                class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          <i class="fas fa-chevron-left"></i>
        </button>
      `;
    }

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `
        <button onclick="bookManager.goToPage(1)" 
                class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">1</button>
      `;
      if (startPage > 2) {
        paginationHTML += '<span class="px-3 py-1 text-gray-500">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === this.currentPage;
      paginationHTML += `
        <button onclick="bookManager.goToPage(${i})" 
                class="px-3 py-1 border rounded-md text-sm ${isActive 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">${i}</button>
      `;
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        paginationHTML += '<span class="px-3 py-1 text-gray-500">...</span>';
      }
      paginationHTML += `
        <button onclick="bookManager.goToPage(${this.totalPages})" 
                class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">${this.totalPages}</button>
      `;
    }

    // Next button
    if (this.currentPage < this.totalPages) {
      paginationHTML += `
        <button onclick="bookManager.goToPage(${this.currentPage + 1})" 
                class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          <i class="fas fa-chevron-right"></i>
        </button>
      `;
    }

    paginationContainer.innerHTML = paginationHTML;
  }

  goToPage(page) {
    this.currentPage = page;
    this.loadBooks();
  }

  changeLimit() {
    this.limit = parseInt(document.getElementById('limitSelect').value);
    this.currentPage = 1;
    this.loadBooks();
  }

  applyFilters() {
    this.filters = {};
    
    const search = document.getElementById('searchInput').value.trim();
    const genre = document.getElementById('genreFilter').value;
    const author = document.getElementById('authorFilter').value;
    const year = document.getElementById('yearFilter').value;

    if (search) this.filters.search = search;
    if (genre) this.filters.genre = genre;
    if (author) this.filters.author = author;
    if (year) this.filters.year = year;

    this.currentPage = 1;
    this.loadBooks();
  }

  clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('genreFilter').value = '';
    document.getElementById('authorFilter').value = '';
    document.getElementById('yearFilter').value = '';
    this.filters = {};
    this.currentPage = 1;
    this.loadBooks();
  }

  openModal(book = null) {
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }

    const modal = document.getElementById('bookModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('bookForm');

    if (book) {
      title.textContent = 'Edit Book';
      document.getElementById('bookId').value = book.id;
      document.getElementById('bookTitle').value = book.title;
      document.getElementById('bookAuthor').value = book.author;
      document.getElementById('bookGenre').value = book.genre || '';
      document.getElementById('bookYear').value = book.published_year || '';
    } else {
      title.textContent = 'Add New Book';
      form.reset();
      document.getElementById('bookId').value = '';
    }

    modal.classList.remove('hidden');
    document.getElementById('bookTitle').focus();
  }

  closeModal() {
    document.getElementById('bookModal').classList.add('hidden');
    document.getElementById('bookForm').reset();
  }

  async saveBook(e) {
    e.preventDefault();
    
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }
    
    const bookId = document.getElementById('bookId').value;
    const bookData = {
      title: document.getElementById('bookTitle').value.trim(),
      author: document.getElementById('bookAuthor').value.trim(),
      genre: document.getElementById('bookGenre').value.trim() || null,
      published_year: document.getElementById('bookYear').value ? parseInt(document.getElementById('bookYear').value) : null
    };

    try {
      const isEdit = bookId !== '';
      const url = isEdit ? `/api/books/${bookId}` : '/api/books';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookData)
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(result.message);
        this.closeModal();
        this.loadBooks();
      } else {
        this.showError(result.message || 'Failed to save book');
      }
    } catch (error) {
      console.error('Error saving book:', error);
      this.showError('Failed to save book');
    }
  }

  async editBook(id) {
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }

    try {
      const response = await fetch(`/api/books/${id}`);
      const result = await response.json();

      if (result.success) {
        this.openModal(result.data);
      } else {
        this.showError('Failed to load book details');
      }
    } catch (error) {
      console.error('Error loading book:', error);
      this.showError('Failed to load book details');
    }
  }

  async deleteBook(id) {
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/books/${id}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
          this.showSuccess('Book deleted successfully');
          this.loadBooks();
        } else {
          this.showError('Failed to delete book');
        }
      } catch (error) {
        console.error('Error deleting book:', error);
        this.showError('Failed to delete book');
      }
    }
  }

  async updateStats() {
    if (!this.dbConnected) return;

    try {
      const response = await fetch('/api/books/stats');
      const result = await response.json();
      
      if (result.success) {
        document.getElementById('totalBooks').textContent = result.data.totalBooks;
        document.getElementById('totalAuthors').textContent = result.data.totalAuthors;
        document.getElementById('totalGenres').textContent = result.data.totalGenres;
        document.getElementById('recentBooks').textContent = result.data.recentBooks;
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
      spinner.classList.remove('hidden');
    } else {
      spinner.classList.add('hidden');
    }
  }

  showSuccess(message) {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      timer: 3000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  showError(message) {
    Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: message,
      confirmButtonColor: '#dc2626'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

// Initialize the application
const bookManager = new BookManager(); 