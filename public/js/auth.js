// Authentication Manager Class
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.initializeAuth();
  }

  // Initialize authentication state
  initializeAuth() {
    if (this.token && this.user) {
      this.updateUIForLoggedInUser();
    } else {
      this.updateUIForLoggedOutUser();
    }
  }

  // Login user
  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.success) {
        this.token = result.token;
        this.user = result.user;
        
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        this.updateUIForLoggedInUser();
        this.showSuccess('Login successful!');
        
        // Reload books with authentication
        if (window.bookManager) {
          window.bookManager.loadBooks();
        }
        
        return { success: true };
      } else {
        this.showError(result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Login failed. Please try again.');
      return { success: false, message: 'Login failed' };
    }
  }

  // Register user
  async register(username, email, password, role = 'user') {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, role })
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Registration successful! Please login with your credentials.');
        
        // Switch to login modal instead of auto-login
        setTimeout(() => {
          this.openLoginModal();
        }, 1500); // Small delay to show success message
        
        return { success: true };
      } else {
        this.showError(result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showError('Registration failed. Please try again.');
      return { success: false, message: 'Registration failed' };
    }
  }

  // Logout user
  logout() {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    this.updateUIForLoggedOutUser();
    this.showSuccess('Logged out successfully!');
    
    // Reload books without authentication
    if (window.bookManager) {
      window.bookManager.loadBooks();
    }
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!(this.token && this.user);
  }

  // Check if user is admin
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  // Get authorization header
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  // Update UI for logged in user
  updateUIForLoggedInUser() {
    // Update header
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    
    if (authButtons) {
      authButtons.style.display = 'none';
    }
    
    if (userInfo) {
      userInfo.style.display = 'flex';
      userInfo.innerHTML = `
        <div class="flex items-center space-x-4">
          <div class="text-sm">
            <span class="text-gray-600">Welcome,</span>
            <span class="font-medium text-gray-900">${this.user.username}</span>
            ${this.user.role === 'admin' ? '<span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Admin</span>' : ''}
          </div>
          ${this.user.role === 'admin' ? '<button id="adminPanelBtn" class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors duration-200"><i class="fas fa-users mr-1"></i>Users</button>' : ''}
          <button id="logoutBtn" class="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors duration-200">
            <i class="fas fa-sign-out-alt mr-1"></i>Logout
          </button>
        </div>
      `;
      
      // Add event listeners
      document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
      
      if (this.user.role === 'admin') {
        document.getElementById('adminPanelBtn').addEventListener('click', () => this.openAdminPanel());
      }
    }

    // Enable book management buttons
    const addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) {
      addBookBtn.disabled = false;
      addBookBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Refresh book list to update action buttons
    if (window.bookManager) {
      window.bookManager.renderBooks();
    }
  }

  // Update UI for logged out user
  updateUIForLoggedOutUser() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    
    if (authButtons) {
      authButtons.style.display = 'flex';
    }
    
    if (userInfo) {
      userInfo.style.display = 'none';
    }

    // Disable book management buttons
    const addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) {
      addBookBtn.disabled = true;
      addBookBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Refresh book list to update action buttons
    if (window.bookManager) {
      window.bookManager.renderBooks();
    }
  }

  // Open login modal
  openLoginModal() {
    console.log('Opening login modal...');
    const modal = document.getElementById('authModal');
    const modalTitle = document.getElementById('authModalTitle');
    const authForm = document.getElementById('authForm');
    const toggleAuth = document.getElementById('toggleAuth');
    
    modalTitle.textContent = 'Login';
    authForm.innerHTML = `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input type="email" id="authEmail" required 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <input type="password" id="authPassword" required 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200">
        Login
      </button>
    `;
    
    toggleAuth.innerHTML = `Don't have an account? <button type="button" class="text-blue-600 hover:text-blue-800 font-medium">Register here</button>`;
    
    this.showModal();
    
    // Add event listeners
    authForm.onsubmit = (e) => this.handleAuthSubmit(e, 'login');
    toggleAuth.querySelector('button').onclick = () => this.openRegisterModal();
  }

  // Open register modal
  openRegisterModal() {
    console.log('Opening register modal...');
    const modal = document.getElementById('authModal');
    const modalTitle = document.getElementById('authModalTitle');
    const authForm = document.getElementById('authForm');
    const toggleAuth = document.getElementById('toggleAuth');
    
    modalTitle.textContent = 'Register';
    authForm.innerHTML = `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
        <input type="text" id="authUsername" required 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input type="email" id="authEmail" required 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <input type="password" id="authPassword" required 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200">
        Register
      </button>
    `;
    
    toggleAuth.innerHTML = `Already have an account? <button type="button" class="text-blue-600 hover:text-blue-800 font-medium">Login here</button>`;
    
    this.showModal();
    
    // Add event listeners
    authForm.onsubmit = (e) => this.handleAuthSubmit(e, 'register');
    toggleAuth.querySelector('button').onclick = () => this.openLoginModal();
  }

  // Handle auth form submission
  async handleAuthSubmit(e, type) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (type === 'login') {
      const result = await this.login(email, password);
      if (result.success) {
        this.closeModal();
      }
    } else {
      const username = document.getElementById('authUsername').value;
      const result = await this.register(username, email, password);
      if (result.success) {
        this.closeModal();
      }
    }
  }

  // Open admin panel
  async openAdminPanel() {
    try {
      const response = await fetch('/api/auth/users', {
        headers: this.getAuthHeader()
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showAdminPanel(result.data);
      } else {
        this.showError('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Failed to load users');
    }
  }

  // Show admin panel
  showAdminPanel(users) {
    const modal = document.getElementById('adminModal');
    const usersList = document.getElementById('usersList');
    
    usersList.innerHTML = users.map(user => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${user.username}</div>
          <div class="text-sm text-gray-500">${user.email}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
            ${user.role}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(user.created_at).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          ${user.id !== this.user.id ? `
            <select onchange="authManager.updateUserRole(${user.id}, this.value)" class="text-sm border border-gray-300 rounded px-2 py-1 mr-2">
              <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button onclick="authManager.deleteUser(${user.id})" class="text-red-600 hover:text-red-900">
              <i class="fas fa-trash"></i>
            </button>
          ` : '<span class="text-gray-400">Current User</span>'}
        </td>
      </tr>
    `).join('');
    
    modal.classList.remove('hidden');
  }

  // Update user role
  async updateUserRole(userId, newRole) {
    try {
      const response = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ role: newRole })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('User role updated successfully');
        this.openAdminPanel(); // Refresh the panel
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      this.showError('Failed to update user role');
    }
  }

  // Delete user
  async deleteUser(userId) {
    const confirmed = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the user account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete user!',
      cancelButtonText: 'Cancel'
    });

    if (confirmed.isConfirmed) {
      try {
        const response = await fetch(`/api/auth/users/${userId}`, {
          method: 'DELETE',
          headers: this.getAuthHeader()
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.showSuccess('User deleted successfully');
          this.openAdminPanel(); // Refresh the panel
        } else {
          this.showError(result.message);
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        this.showError('Failed to delete user');
      }
    }
  }

  // Show modal
  showModal() {
    console.log('Showing modal...');
    const modal = document.getElementById('authModal');
    const modalContent = modal.querySelector('.bg-white');
    console.log('Modal element:', modal);
    
    if (modal && modalContent) {
      // Remove hidden class and add enter animation classes
      modal.classList.remove('hidden');
      modal.classList.add('auth-modal-bg-enter');
      modalContent.classList.add('auth-modal-enter');
      
      // Trigger animation
      requestAnimationFrame(() => {
        modal.classList.add('auth-modal-bg-enter-active');
        modalContent.classList.add('auth-modal-enter-active');
        modal.classList.remove('auth-modal-bg-enter');
        modalContent.classList.remove('auth-modal-enter');
      });
      
      console.log('Modal should now be sliding up');
      
      // Focus on first input after animation starts
      setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 150);
      
      // Clean up animation classes
      setTimeout(() => {
        modal.classList.remove('auth-modal-bg-enter-active');
        modalContent.classList.remove('auth-modal-enter-active');
      }, 400);
    } else {
      console.error('Modal element not found!');
    }
  }

  // Close modal
  closeModal() {
    const modal = document.getElementById('authModal');
    const modalContent = modal.querySelector('.bg-white');
    
    if (modal && modalContent) {
      // Add exit animation classes
      modal.classList.add('auth-modal-bg-exit');
      modalContent.classList.add('auth-modal-exit');
      
      // Trigger animation
      requestAnimationFrame(() => {
        modal.classList.add('auth-modal-bg-exit-active');
        modalContent.classList.add('auth-modal-exit-active');
        modal.classList.remove('auth-modal-bg-exit');
        modalContent.classList.remove('auth-modal-exit');
      });
      
      // Hide modal after animation completes
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('auth-modal-bg-exit-active');
        modalContent.classList.remove('auth-modal-exit-active');
      }, 300);
    }
  }

  // Close admin modal
  closeAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.add('hidden');
  }

  // Show success message
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

  // Show error message
  showError(message) {
    Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: message,
      confirmButtonColor: '#dc2626'
    });
  }
}

// AuthManager class is defined above
// Instance will be created in the main HTML file 