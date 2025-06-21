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
    
    // Performance optimizations
    this.requestCache = new Map(); // Cache for API requests
    this.pendingRequests = new Map(); // Prevent duplicate requests
    this.lastRenderTime = 0; // Throttle rendering
    this.renderThrottleMs = 16; // ~60fps

    // Multi-select state
    this.selectedGenres = [];
    this.selectedAuthors = [];
    this.availableGenres = [];
    this.availableAuthors = [];
    this.filteredGenres = [];
    this.filteredAuthors = [];

    this.initializeEventListeners();
    this.initializeApp();
  }

  async initializeApp() {
    await this.checkDatabaseStatus();
    await this.loadFilterOptions();
    this.loadBooks();
  }

  initializeEventListeners() {
    // Book management
    document.getElementById('addBookBtn').addEventListener('click', () => this.openModal());
    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('bookForm').addEventListener('submit', (e) => this.saveBook(e));

    // Database retry
    const retryBtn = document.getElementById('retryConnectionBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryDatabaseConnection());
    }

    // Search and filters - optimized with debouncing
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const authorFilter = document.getElementById('authorFilter');
    const yearFilter = document.getElementById('yearFilter');
    const limitSelect = document.getElementById('limitSelect');
    const clearFilters = document.getElementById('clearFilters');

    if (searchInput) searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
    if (yearFilter) yearFilter.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
    if (limitSelect) limitSelect.addEventListener('change', () => this.changeLimit());
    if (clearFilters) clearFilters.addEventListener('click', () => this.clearFilters());

    // Multi-select dropdowns
    if (genreFilter) this.initializeMultiSelect('genre');
    if (authorFilter) this.initializeMultiSelect('author');

    // Modal click outside to close
    document.getElementById('bookModal').addEventListener('click', (e) => {
      if (e.target.id === 'bookModal') {
        this.closeModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  async checkDatabaseStatus() {
    const cacheKey = 'db_status';
    const cached = this.getFromCache(cacheKey, 5000); // 5 second cache
    if (cached !== null) {
      this.dbConnected = cached;
      return cached;
    }

    try {
      const response = await fetch('/api/db/status');
      const result = await response.json();
      this.dbConnected = result.connected;
      this.setCache(cacheKey, result.connected);
      return result.connected;
    } catch (error) {
      console.error('Error checking database status:', error);
      this.dbConnected = false;
      return false;
    }
  }

  async retryDatabaseConnection() {
    const retryBtn = document.getElementById('retryConnectionBtn');
    const retryIcon = retryBtn?.querySelector('i');
    
    if (retryBtn) retryBtn.disabled = true;
    if (retryIcon) retryIcon.classList.add('fa-spin');
    
    try {
      const response = await fetch('/api/db/reconnect', { method: 'POST' });
      const result = await response.json();
      
      if (result.success && result.connected) {
        this.showSuccess('Database reconnected successfully!');
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
      if (retryBtn) retryBtn.disabled = false;
      if (retryIcon) retryIcon.classList.remove('fa-spin');
    }
  }

  // Optimized debounce with cleanup
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

  // Request caching and deduplication
  getFromCache(key, maxAge = 30000) {
    const cached = this.requestCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries
    if (this.requestCache.size > 50) {
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }
  }

  // Prevent duplicate requests
  async makeRequest(url, options = {}) {
    const requestKey = `${options.method || 'GET'}_${url}`;
    
    // Return pending request if exists
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Make new request
    const requestPromise = fetch(url, options);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const response = await requestPromise;
      return response;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  async loadBooks() {
    if (!this.dbConnected) {
      this.showNoDatabaseMessage();
      return;
    }

    try {
      this.showLoading(true);
      
      // Build query parameters properly handling arrays
      const params = new URLSearchParams();
      params.append('page', this.currentPage.toString());
      params.append('limit', this.limit.toString());
      
      // Handle filters properly (arrays need special handling)
      Object.entries(this.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // For arrays, append each value separately
          value.forEach(item => params.append(key, item));
        } else if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      console.log('Loading books with params:', params.toString());
      console.log('Current filters:', this.filters);

      const cacheKey = `books_${params.toString()}`;
      const cached = this.getFromCache(cacheKey, 10000); // 10 second cache
      
      let result;
      if (cached) {
        console.log('Using cached result for:', cacheKey);
        result = cached;
      } else {
        console.log('Making API request to:', `/api/books?${params}`);
        const response = await this.makeRequest(`/api/books?${params}`);
        result = await response.json();
        
        if (result.success) {
          this.setCache(cacheKey, result);
          console.log('API request successful, cached result');
        }
      }

      if (result.success) {
        this.books = result.data;
        this.totalPages = result.totalPages;
        this.total = result.total;
        this.throttledRender();
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

  // Throttled rendering for better performance
  throttledRender() {
    const now = Date.now();
    if (now - this.lastRenderTime < this.renderThrottleMs) {
      return;
    }
    
    this.lastRenderTime = now;
    this.renderBooks();
    this.renderPagination();
  }

  showNoDatabaseMessage() {
    const tbody = document.getElementById('booksTableBody');
    const noBooksMessage = document.getElementById('noBooksMessage');
    const pagination = document.getElementById('pagination');
    
    if (tbody) tbody.innerHTML = '';
    if (noBooksMessage) noBooksMessage.classList.remove('hidden');
    if (pagination) pagination.classList.add('hidden');
  }

  // Optimized DOM rendering
  renderBooks() {
    const tbody = document.getElementById('booksTableBody');
    const noBooksMessage = document.getElementById('noBooksMessage');
    
    if (!tbody) return;

    if (this.books.length === 0) {
      tbody.innerHTML = '';
      if (noBooksMessage) noBooksMessage.classList.remove('hidden');
      return;
    }

    if (noBooksMessage) noBooksMessage.classList.add('hidden');

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    this.books.forEach(book => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 transition-colors duration-150';
      
      // Create cells more efficiently
      row.innerHTML = this.createBookRowHTML(book);
      fragment.appendChild(row);
    });

    // Single DOM update
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  // Separate method for creating book row HTML
  createBookRowHTML(book) {
    const isAuthenticated = window.authManager?.isAuthenticated() || false;
    
    return `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${this.escapeHtml(book.title)}</div>
        <div class="text-sm text-gray-500">ID: ${book.id}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${this.escapeHtml(book.author)}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          ${book.genre ? this.escapeHtml(book.genre) : 'N/A'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${book.published_year || 'N/A'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${this.formatDate(book.created_at)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div class="flex justify-end space-x-2">
          <button onclick="bookManager.viewBook(${book.id})" class="text-blue-600 hover:text-blue-900 transition-colors duration-150">
            <i class="fas fa-eye"></i>
          </button>
          ${isAuthenticated ? `
            <button onclick="bookManager.editBook(${book.id})" class="text-indigo-600 hover:text-indigo-900 transition-colors duration-150">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="bookManager.deleteBook(${book.id})" class="text-red-600 hover:text-red-900 transition-colors duration-150">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;
  }

  // Optimized pagination rendering
  renderPagination() {
    const pagination = document.getElementById('pagination');
    const showingFrom = document.getElementById('showingFrom');
    const showingTo = document.getElementById('showingTo');
    const totalRecords = document.getElementById('totalRecords');
    const paginationButtons = document.getElementById('paginationButtons');
    
    if (!pagination) return;

    if (this.totalPages <= 1) {
      pagination.classList.add('hidden');
      return;
    }

    pagination.classList.remove('hidden');

    // Update showing info
    const from = (this.currentPage - 1) * this.limit + 1;
    const to = Math.min(this.currentPage * this.limit, this.total);
    
    if (showingFrom) showingFrom.textContent = from.toString();
    if (showingTo) showingTo.textContent = to.toString();
    if (totalRecords) totalRecords.textContent = this.total.toString();

    // Generate pagination buttons efficiently
    if (paginationButtons) {
      paginationButtons.innerHTML = this.generatePaginationHTML();
    }
  }

  // Separate method for pagination HTML generation
  generatePaginationHTML() {
    let html = '';
    
    // Previous button
    html += `
      <button onclick="bookManager.goToPage(${this.currentPage - 1})" 
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 ${this.currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
    `;

    // Page numbers (optimized for large page counts)
    const maxVisiblePages = 7;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page + ellipsis
    if (startPage > 1) {
      html += this.createPageButton(1);
      if (startPage > 2) {
        html += '<span class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">...</span>';
      }
    }

    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
      html += this.createPageButton(i);
    }

    // Ellipsis + last page
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        html += '<span class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">...</span>';
      }
      html += this.createPageButton(this.totalPages);
    }

    // Next button
    html += `
      <button onclick="bookManager.goToPage(${this.currentPage + 1})" 
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 ${this.currentPage === this.totalPages ? 'cursor-not-allowed opacity-50' : ''}" 
              ${this.currentPage === this.totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;

    return html;
  }

  createPageButton(pageNum) {
    const isActive = pageNum === this.currentPage;
    return `
      <button onclick="bookManager.goToPage(${pageNum})" 
              class="px-3 py-2 text-sm font-medium ${isActive ? 'text-blue-600 bg-blue-50 border-blue-500' : 'text-gray-500 bg-white hover:bg-gray-50'} border border-gray-300">
        ${pageNum}
      </button>
    `;
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadBooks();
  }

  changeLimit() {
    const limitSelect = document.getElementById('limitSelect');
    if (limitSelect) {
      this.limit = parseInt(limitSelect.value);
      this.currentPage = 1;
      this.requestCache.clear(); // Clear cache when limit changes
      this.loadBooks();
    }
  }

  applyFilters() {
    const newFilters = {};
    
    const search = document.getElementById('searchInput')?.value.trim();
    const year = document.getElementById('yearFilter')?.value;

    if (search) newFilters.search = search;
    if (year) newFilters.year = year;

    // Add multi-select filters
    if (this.selectedGenres.length > 0) {
      newFilters.genre = [...this.selectedGenres].sort(); // Sort for consistent comparison
    }
    
    if (this.selectedAuthors.length > 0) {
      newFilters.author = [...this.selectedAuthors].sort(); // Sort for consistent comparison
    }

    // More robust filter comparison
    const filtersChanged = this.hasFiltersChanged(this.filters, newFilters);
    
    if (filtersChanged) {
      console.log('Filters changed:', { old: this.filters, new: newFilters });
      this.filters = newFilters;
      this.currentPage = 1;
      this.requestCache.clear(); // Clear cache when filters change
      this.loadBooks();
    }
  }

  // Helper method for robust filter comparison
  hasFiltersChanged(oldFilters, newFilters) {
    // Get all unique keys from both objects
    const allKeys = new Set([...Object.keys(oldFilters), ...Object.keys(newFilters)]);
    
    for (const key of allKeys) {
      const oldValue = oldFilters[key];
      const newValue = newFilters[key];
      
      // If one exists and the other doesn't
      if ((oldValue === undefined) !== (newValue === undefined)) {
        return true;
      }
      
      // If both are arrays, compare them
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        if (oldValue.length !== newValue.length) {
          return true;
        }
        // Sort both arrays for comparison
        const sortedOld = [...oldValue].sort();
        const sortedNew = [...newValue].sort();
        if (sortedOld.join(',') !== sortedNew.join(',')) {
          return true;
        }
      } else if (oldValue !== newValue) {
        return true;
      }
    }
    
    return false;
  }

  clearFilters() {
    // Clear text inputs
    const elements = ['searchInput', 'yearFilter'];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = '';
    });
    
    // Clear multi-select filters
    this.selectedGenres = [];
    this.selectedAuthors = [];
    
    // Update multi-select displays
    this.updateMultiSelectDisplay('genre');
    this.updateMultiSelectDisplay('author');
    
    // Clear search inputs and reset options
    const genreSearch = document.getElementById('genreSearch');
    const authorSearch = document.getElementById('authorSearch');
    if (genreSearch) {
      genreSearch.value = '';
      this.renderMultiSelectOptions('genre', this.availableGenres);
    }
    if (authorSearch) {
      authorSearch.value = '';
      this.renderMultiSelectOptions('author', this.availableAuthors);
    }

    // Uncheck all checkboxes
    document.querySelectorAll('#genreOptions input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#authorOptions input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    this.filters = {};
    this.currentPage = 1;
    this.requestCache.clear();
    this.loadBooks();
  }

  openModal(book = null, viewMode = false) {
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }

    // Check authentication only for add/edit modes
    if (!viewMode && (!window.authManager || !window.authManager.isAuthenticated())) {
      this.showError('Please login to add or edit books.');
      return;
    }

    const modal = document.getElementById('bookModal');
    const modalContent = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('bookForm');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Get all input fields
    const inputs = form.querySelectorAll('input, select, textarea');

    if (viewMode) {
      title.textContent = 'View Book Details';
      // Disable all inputs
      inputs.forEach(input => input.disabled = true);
      // Hide save button, change cancel to close
      saveBtn.style.display = 'none';
      cancelBtn.textContent = 'Close';
    } else {
      // Enable all inputs
      inputs.forEach(input => input.disabled = false);
      // Show save button, restore cancel text
      saveBtn.style.display = 'block';
      cancelBtn.textContent = 'Cancel';
    }

    if (book) {
      if (!viewMode) {
        title.textContent = 'Edit Book';
      }
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

    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('modal-enter');
    modalContent.classList.add('modal-content-enter');
    
    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.remove('modal-enter');
      modal.classList.add('modal-enter-active');
      modalContent.classList.remove('modal-content-enter');
      modalContent.classList.add('modal-content-enter-active');
    });

    // Focus on title input after animation starts (only if not in view mode)
    if (!viewMode) {
      setTimeout(() => {
        document.getElementById('bookTitle').focus();
      }, 50);
    }
  }

  closeModal() {
    const modal = document.getElementById('bookModal');
    const modalContent = document.getElementById('modalContent');
    
    // Start exit animation
    modal.classList.add('modal-exit');
    modalContent.classList.add('modal-content-exit');
    
    requestAnimationFrame(() => {
      modal.classList.remove('modal-enter-active');
      modal.classList.add('modal-exit-active');
      modalContent.classList.remove('modal-content-enter-active');
      modalContent.classList.add('modal-content-exit-active');
    });
    
    // Hide modal after animation completes
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('modal-exit', 'modal-exit-active');
      modalContent.classList.remove('modal-content-exit', 'modal-content-exit-active');
      
      // Reset form
      const form = document.getElementById('bookForm');
      form.reset();
      
      // Reset form state (re-enable inputs, restore buttons)
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => input.disabled = false);
      
      const saveBtn = document.getElementById('saveBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      saveBtn.style.display = 'block';
      cancelBtn.textContent = 'Cancel';
    }, 300);
  }

  async saveBook(e) {
    e.preventDefault();
    
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }

    // Check authentication
    if (!window.authManager || !window.authManager.isAuthenticated()) {
      this.showError('Please login to add or edit books.');
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
          'Content-Type': 'application/json',
          ...window.authManager.getAuthHeader()
        },
        body: JSON.stringify(bookData)
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(result.message);
        this.closeModal();
        
        // Clear cache to ensure fresh data
        this.requestCache.clear();
        
        // Reload books and update stats
        await this.loadBooks();
        this.updateStats();
        
        // Refresh filter options to include any new genres/authors
        await this.loadFilterOptions();
      } else {
        if (response.status === 401) {
          this.showError('Please login to perform this action.');
        } else {
          this.showError(result.message || 'Failed to save book');
        }
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

    // Check authentication
    if (!window.authManager || !window.authManager.isAuthenticated()) {
      this.showError('Please login to delete books.');
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
          method: 'DELETE',
          headers: window.authManager.getAuthHeader()
        });

        const result = await response.json();

        if (result.success) {
          this.showSuccess('Book deleted successfully');
          
          // Clear cache to ensure fresh data
          this.requestCache.clear();
          
          // Reload books and update stats
          await this.loadBooks();
          this.updateStats();
          
          // Refresh filter options in case deleted book was last with certain genre/author
          await this.loadFilterOptions();
        } else {
          if (response.status === 401) {
            this.showError('Please login to perform this action.');
          } else {
            this.showError('Failed to delete book');
          }
        }
      } catch (error) {
        console.error('Error deleting book:', error);
        this.showError('Failed to delete book');
      }
    }
  }

  async updateStats() {
    if (!this.dbConnected) return;

    const cacheKey = 'stats';
    const cached = this.getFromCache(cacheKey, 30000); // 30 second cache
    
    try {
      let result;
      if (cached) {
        result = cached;
      } else {
        const response = await this.makeRequest('/api/books/stats');
        result = await response.json();
        
        if (result.success) {
          this.setCache(cacheKey, result);
        }
      }
      
      if (result.success) {
        const elements = ['totalBooks', 'totalAuthors', 'totalGenres', 'recentBooks'];
        elements.forEach(id => {
          const element = document.getElementById(id);
          if (element) {
            element.textContent = result.data[id] || '0';
          }
        });
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

  // New method for viewing book details
  async viewBook(id) {
    if (!this.dbConnected) {
      this.showError('Database not connected. Please reconnect first.');
      return;
    }

    try {
      const response = await fetch(`/api/books/${id}`);
      const result = await response.json();

      if (result.success) {
        this.openModal(result.data, true); // true = view mode
      } else {
        this.showError('Failed to load book details');
      }
    } catch (error) {
      console.error('Error loading book:', error);
      this.showError('Failed to load book details');
    }
  }

  // Load filter options from API
  async loadFilterOptions() {
    try {
      console.log('Loading filter options...');
      
      // Load genres
      console.log('Making API request to: /api/books/filters/genres');
      const genresResponse = await this.makeRequest('/api/books/filters/genres');
      const genresResult = await genresResponse.json();
      if (genresResult.success) {
        console.log('Loaded genres:', genresResult.data);
        this.availableGenres = genresResult.data;
      }

      // Load authors
      console.log('Making API request to: /api/books/filters/authors');
      const authorsResponse = await this.makeRequest('/api/books/filters/authors');
      const authorsResult = await authorsResponse.json();
      if (authorsResult.success) {
        console.log('Loaded authors:', authorsResult.data);
        this.availableAuthors = authorsResult.data;
      }

      // Populate dropdowns
      this.populateMultiSelect('genre', this.availableGenres);
      this.populateMultiSelect('author', this.availableAuthors);
      
      console.log('Filter options loaded and dropdowns updated');
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

  // Initialize multi-select dropdown
  initializeMultiSelect(type) {
    const dropdown = document.getElementById(`${type}Filter`);
    const optionsContainer = document.getElementById(`${type}Dropdown`);
    
    if (!dropdown || !optionsContainer) return;

    // Toggle dropdown on click
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMultiSelectDropdown(type);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !optionsContainer.contains(e.target)) {
        this.closeMultiSelectDropdown(type);
      }
    });

    // Make dropdown focusable
    dropdown.setAttribute('tabindex', '0');
    
    // Handle keyboard navigation
    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleMultiSelectDropdown(type);
      }
    });
  }

  // Populate multi-select options
  populateMultiSelect(type, options) {
    const optionsContainer = document.getElementById(`${type}Options`);
    if (!optionsContainer) return;

    // Store original options
    if (type === 'genre') {
      this.filteredGenres = [...options];
    } else {
      this.filteredAuthors = [...options];
    }

    this.renderMultiSelectOptions(type, options);
    this.setupSearchFunctionality(type);
    this.updateSelectAllButtonsState(type);
  }

  // Render multi-select options
  renderMultiSelectOptions(type, options) {
    const optionsContainer = document.getElementById(`${type}Options`);
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';
    
    if (options.length === 0) {
      optionsContainer.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }
    
    options.forEach(option => {
      const optionElement = document.createElement('div');
      optionElement.className = 'multi-select-option';
      
      // Check if this option is currently selected
      const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;
      const isSelected = selectedArray.includes(option);
      
      optionElement.innerHTML = `
        <input type="checkbox" id="${type}_${option}" value="${option}" ${isSelected ? 'checked' : ''}>
        <label for="${type}_${option}" class="flex-1 cursor-pointer">${option}</label>
      `;
      
      if (isSelected) {
        optionElement.classList.add('selected');
      }
      
      const checkbox = optionElement.querySelector('input');
      checkbox.addEventListener('change', () => {
        this.handleMultiSelectChange(type, option, checkbox.checked);
      });
      
      optionsContainer.appendChild(optionElement);
    });
  }

  // Setup search functionality
  setupSearchFunctionality(type) {
    const searchInput = document.getElementById(`${type}Search`);
    if (!searchInput) return;

    // Remove existing event listeners to prevent duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener('input', this.debounce((e) => {
      this.filterOptions(type, e.target.value);
    }, 150));

    // Prevent dropdown from closing when clicking on search input
    newSearchInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Handle keyboard navigation in search
    newSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMultiSelectDropdown(type);
        newSearchInput.blur();
      }
    });

    // Setup select all/deselect all buttons
    this.setupSelectAllButtons(type);
  }

  // Filter options based on search term
  filterOptions(type, searchTerm) {
    const originalOptions = type === 'genre' ? this.availableGenres : this.availableAuthors;
    
    if (!searchTerm.trim()) {
      // Show all options if search is empty
      this.renderMultiSelectOptions(type, originalOptions);
      return;
    }

    // Filter options based on search term (case-insensitive)
    const filteredOptions = originalOptions.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Highlight matching text and render
    this.renderMultiSelectOptionsWithHighlight(type, filteredOptions, searchTerm);
  }

  // Render options with highlighted search terms
  renderMultiSelectOptionsWithHighlight(type, options, searchTerm) {
    const optionsContainer = document.getElementById(`${type}Options`);
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';
    
    if (options.length === 0) {
      optionsContainer.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }
    
    options.forEach(option => {
      const optionElement = document.createElement('div');
      optionElement.className = 'multi-select-option';
      
      // Check if this option is currently selected
      const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;
      const isSelected = selectedArray.includes(option);
      
      // Highlight matching text
      const highlightedText = this.highlightSearchTerm(option, searchTerm);
      
      optionElement.innerHTML = `
        <input type="checkbox" id="${type}_${option}" value="${option}" ${isSelected ? 'checked' : ''}>
        <label for="${type}_${option}" class="flex-1 cursor-pointer">${highlightedText}</label>
      `;
      
      if (isSelected) {
        optionElement.classList.add('selected');
      }
      
      const checkbox = optionElement.querySelector('input');
      checkbox.addEventListener('change', () => {
        this.handleMultiSelectChange(type, option, checkbox.checked);
      });
      
      optionsContainer.appendChild(optionElement);
    });
  }

  // Highlight search term in text
  highlightSearchTerm(text, searchTerm) {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  // Setup select all/deselect all buttons
  setupSelectAllButtons(type) {
    const selectAllBtn = document.getElementById(`${type}SelectAll`);
    const deselectAllBtn = document.getElementById(`${type}DeselectAll`);

    if (selectAllBtn) {
      // Remove existing event listeners
      const newSelectAllBtn = selectAllBtn.cloneNode(true);
      selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);

      newSelectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectAllVisibleOptions(type);
      });
    }

    if (deselectAllBtn) {
      // Remove existing event listeners
      const newDeselectAllBtn = deselectAllBtn.cloneNode(true);
      deselectAllBtn.parentNode.replaceChild(newDeselectAllBtn, deselectAllBtn);

      newDeselectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deselectAllVisibleOptions(type);
      });
    }
  }

  // Select all visible options
  selectAllVisibleOptions(type) {
    const optionsContainer = document.getElementById(`${type}Options`);
    const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
    const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;

    checkboxes.forEach(checkbox => {
      const value = checkbox.value;
      if (!checkbox.checked && !selectedArray.includes(value)) {
        checkbox.checked = true;
        selectedArray.push(value);
        
        // Update visual state
        const optionElement = checkbox.closest('.multi-select-option');
        if (optionElement) {
          optionElement.classList.add('selected');
        }
      }
    });

    this.updateMultiSelectDisplay(type);
    this.updateSelectAllButtonsState(type);
    this.applyFilters();
  }

  // Deselect all visible options
  deselectAllVisibleOptions(type) {
    const optionsContainer = document.getElementById(`${type}Options`);
    const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
    const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;

    checkboxes.forEach(checkbox => {
      const value = checkbox.value;
      if (checkbox.checked) {
        checkbox.checked = false;
        
        // Remove from selected array
        const index = selectedArray.indexOf(value);
        if (index > -1) {
          selectedArray.splice(index, 1);
        }
        
        // Update visual state
        const optionElement = checkbox.closest('.multi-select-option');
        if (optionElement) {
          optionElement.classList.remove('selected');
        }
      }
    });

    this.updateMultiSelectDisplay(type);
    this.updateSelectAllButtonsState(type);
    this.applyFilters();
  }

  // Update select all buttons state
  updateSelectAllButtonsState(type) {
    const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;
    const selectAllBtn = document.getElementById(`${type}SelectAll`);
    const deselectAllBtn = document.getElementById(`${type}DeselectAll`);

    if (selectAllBtn && deselectAllBtn) {
      const count = selectedArray.length;
      if (count > 0) {
        selectAllBtn.textContent = `Select All`;
        deselectAllBtn.textContent = `Deselect All (${count})`;
      } else {
        selectAllBtn.textContent = `Select All`;
        deselectAllBtn.textContent = `Deselect All`;
      }
    }
  }

  // Toggle multi-select dropdown
  toggleMultiSelectDropdown(type) {
    const optionsContainer = document.getElementById(`${type}Dropdown`);
    const dropdown = document.getElementById(`${type}Filter`);
    
    if (!optionsContainer || !dropdown) return;

    const isHidden = optionsContainer.classList.contains('hidden');
    
    // Close all other dropdowns first
    ['genre', 'author'].forEach(otherType => {
      if (otherType !== type) {
        this.closeMultiSelectDropdown(otherType);
      }
    });

    if (isHidden) {
      optionsContainer.classList.remove('hidden');
      dropdown.classList.add('ring-2', 'ring-blue-500');
      
      // Focus on search input when opening
      setTimeout(() => {
        const searchInput = document.getElementById(`${type}Search`);
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    } else {
      optionsContainer.classList.add('hidden');
      dropdown.classList.remove('ring-2', 'ring-blue-500');
      
      // Clear search when closing
      const searchInput = document.getElementById(`${type}Search`);
      if (searchInput) {
        searchInput.value = '';
        // Reset to show all options
        const originalOptions = type === 'genre' ? this.availableGenres : this.availableAuthors;
        this.renderMultiSelectOptions(type, originalOptions);
      }
    }
  }

  // Close multi-select dropdown
  closeMultiSelectDropdown(type) {
    const optionsContainer = document.getElementById(`${type}Dropdown`);
    const dropdown = document.getElementById(`${type}Filter`);
    
    if (optionsContainer) optionsContainer.classList.add('hidden');
    if (dropdown) dropdown.classList.remove('ring-2', 'ring-blue-500');
  }

  // Handle multi-select change
  handleMultiSelectChange(type, value, isChecked) {
    console.log(`Multi-select change: ${type}, ${value}, ${isChecked}`);
    
    const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;
    console.log(`Current ${type} selections:`, [...selectedArray]);
    
    if (isChecked) {
      if (!selectedArray.includes(value)) {
        selectedArray.push(value);
        console.log(`Added ${value} to ${type} selections`);
      }
    } else {
      const index = selectedArray.indexOf(value);
      if (index > -1) {
        selectedArray.splice(index, 1);
        console.log(`Removed ${value} from ${type} selections`);
      }
    }
    
    console.log(`Updated ${type} selections:`, [...selectedArray]);
    
    // Update the option's selected state in the UI
    const optionElement = document.getElementById(`${type}_${value}`)?.closest('.multi-select-option');
    if (optionElement) {
      if (isChecked) {
        optionElement.classList.add('selected');
      } else {
        optionElement.classList.remove('selected');
      }
    }
    
    this.updateMultiSelectDisplay(type);
    this.updateSelectAllButtonsState(type);
    this.applyFilters();
  }

  // Update multi-select display
  updateMultiSelectDisplay(type) {
    const dropdown = document.getElementById(`${type}Filter`);
    const selectedItemsContainer = dropdown?.querySelector('.selected-items');
    
    if (!selectedItemsContainer) return;

    const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;
    const placeholder = selectedItemsContainer.getAttribute('data-placeholder');
    
    if (selectedArray.length === 0) {
      selectedItemsContainer.innerHTML = `<span class="multi-select-placeholder">${placeholder}</span>`;
    } else {
      selectedItemsContainer.innerHTML = selectedArray.map(item => `
        <span class="selected-item">
          ${item}
          <span class="remove" onclick="bookManager.removeMultiSelectItem('${type}', '${item}')">&times;</span>
        </span>
      `).join('');
    }
  }

  // Remove multi-select item
  removeMultiSelectItem(type, value) {
    const selectedArray = type === 'genre' ? this.selectedGenres : this.selectedAuthors;
    const index = selectedArray.indexOf(value);
    
    if (index > -1) {
      selectedArray.splice(index, 1);
      
      // Update checkbox state
      const checkbox = document.getElementById(`${type}_${value}`);
      if (checkbox) checkbox.checked = false;
      
      this.updateMultiSelectDisplay(type);
      this.applyFilters();
    }
  }
}

// BookManager class is defined above
// Instance will be created in the main HTML file 