# 📚 Book Management System

A full-featured Book Management System built with Node.js, Express, PostgreSQL, and a modern web interface. This system provides complete CRUD (Create, Read, Update, Delete) functionality for managing a book collection.

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with connection pooling
- **Validation**: express-validator for input validation
- **Architecture**: Modular design with separate layers (routes, services, models)

### Frontend
- **Template Engine**: EJS for server-side rendering
- **Styling**: Tailwind CSS for modern, responsive design
- **JavaScript**: Vanilla JS with ES6+ features
- **UI Components**: Custom components with Font Awesome icons
- **Notifications**: SweetAlert2 for beautiful alerts and confirmations

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- **Database**: PostgreSQL (v12 or higher) **OR** MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/toto01tdma/Nodejs_Book_Management.git
   cd Nodejs_Book_Management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your database**
   
   **For PostgreSQL:**
   - Create a new PostgreSQL database named `book_management`
   - Optionally, run the setup queries from `import_database/postgresql.sql`
   - Note your database credentials
   
   **For MySQL:**
   - Create a new MySQL database named `book_management`
   - Optionally, run the setup queries from `import_database/mysql.sql`
   - Note your database credentials

4. **Configure environment variables**
   - Create a `.env` file in your project root
   - Update the database configuration:
   
   **For PostgreSQL (default):**
   ```env
   DB_TYPE=postgresql
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=book_management
   DB_USER=your_username
   DB_PASSWORD=your_password
   PORT=3000
   NODE_ENV=development
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   ```
   
   **For MySQL:**
   ```env
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=book_management
   DB_USER=root
   DB_PASSWORD=your_password
   PORT=3000
   NODE_ENV=development
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   ```

5. **Build CSS assets**
   ```bash
   npm run build:css:prod
   ```

6. **Start the application**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

7. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The database tables will be created automatically on first run

## 📖 Usage

### Authentication
- **Registration**: Click "Register" to create a new account with username, email, and password
- **Login**: Click "Login" to access your account
- **User Roles**: 
  - **User**: Can view all books but cannot add, edit, or delete
  - **Admin**: Full access to all features including user management
- **Default Admin**: Use the sample admin account (email: `admin@bookmanagement.com`, password: `Admin123!`)

### Dashboard
- View overall statistics of your book collection
- See total books, authors, genres, and recent additions
- Quick access to add new books (requires authentication)

### Managing Books
- **Add Books**: Click the "Add New Book" button to add a new book (requires login)
- **Search Books**: Use the search bar to find books by title or author (available to all)
- **Filter Books**: Filter by genre, author, or publication year (available to all)
- **Edit Books**: Click the edit icon to modify book details (requires login)
- **Delete Books**: Click the delete icon to remove books (requires login)

### User Management (Admin Only)
- **View Users**: Access the admin panel to see all registered users
- **Change Roles**: Promote users to admin or demote admins to users
- **Delete Users**: Remove user accounts (cannot delete your own account)

### Advanced Features
- **Pagination**: Navigate through large collections efficiently
- **Sorting**: Books are sorted by creation date (newest first)
- **Responsive Grid**: Adjusts to different screen sizes
- **Real-time Updates**: Statistics update automatically after operations
- **Secure Authentication**: JWT-based authentication with role-based access control

## 🛠️ API Endpoints

### Books
- `GET /api/books` - Get all books with filtering and pagination
- `GET /api/books/:id` - Get a specific book
- `POST /api/books` - Create a new book
- `PUT /api/books/:id` - Update a book
- `DELETE /api/books/:id` - Delete a book

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/users` - Get all users (admin only)
- `DELETE /api/auth/users/:id` - Delete user (admin only)
- `PUT /api/auth/users/:id/role` - Update user role (admin only)

### Filters & Statistics
- `GET /api/books/filters/genres` - Get all unique genres
- `GET /api/books/filters/authors` - Get all unique authors
- `GET /api/books/stats` - Get collection statistics

### Query Parameters (for GET /api/books)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `search` - Search in title and author
- `genre` - Filter by genre
- `author` - Filter by author
- `year` - Filter by publication year

### Authentication Headers
For protected routes, include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 🗂️ Project Structure

```
├── config/
│   └── database.ts          # Database configuration and connection
├── import_database/         # Database setup queries
│   ├── postgresql.sql       # PostgreSQL database setup
│   └── mysql.sql            # MySQL database setup
├── middleware/
│   ├── authMiddleware.ts    # JWT authentication middleware
│   └── dbMiddleware.ts      # Database middleware for API protection
├── models/
│   ├── Book.ts              # Book interfaces and types
│   ├── BookService.ts       # Book service layer with business logic
│   ├── User.ts              # User interfaces and types
│   └── UserService.ts       # User service layer with authentication logic
├── routes/
│   ├── authRoutes.ts        # Authentication routes (login, register, user management)
│   ├── bookRoutes.ts        # API routes for book operations
│   └── dbStatus.ts          # Database status and reconnection routes
├── views/
│   └── index.ejs            # Main frontend template
├── public/
│   ├── css/
│   │   └── style.css        # Compiled Tailwind CSS
│   └── js/
│       ├── app.js           # Main frontend JavaScript
│       └── auth.js          # Authentication frontend JavaScript
├── src/
│   └── input.css            # Tailwind CSS source
├── server.ts                # Main server file
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 🔧 Configuration

### Database Setup Queries
The `import_database/` folder contains pre-written SQL queries for database setup:

- **`postgresql.sql`** - PostgreSQL-specific setup queries and sample data
- **`mysql.sql`** - MySQL-specific setup queries and sample data

You can run these files to quickly set up your database with the required tables and optionally populate it with sample data.

**To import the queries:**

For PostgreSQL:
```bash
psql -U your_username -d book_management -f import_database/postgresql.sql
```

For MySQL:
```bash
mysql -u your_username -p book_management < import_database/mysql.sql
```

> **Note:** The application will automatically create the `books` table if it doesn't exist, so running these import files is optional but recommended for testing with sample data.

### Database Configuration
The application supports both PostgreSQL and MySQL with connection pooling. Configure your database in the `.env` file:

**PostgreSQL Configuration:**
```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=book_management
DB_USER=your_username
DB_PASSWORD=your_password
```

**MySQL Configuration:**
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=book_management
DB_USER=root
DB_PASSWORD=your_password
```

### Environment Variables
- `DB_TYPE` - Database type (postgresql or mysql, default: postgresql)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DB_*` - Database configuration
- `DATABASE_URL` - Alternative database URL format (PostgreSQL only)

## 🧪 Development

### Scripts
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run build:css` - Build CSS in watch mode
- `npm run build:css:prod` - Build CSS for production

### Database Management
The application automatically:
- Creates the books table if it doesn't exist
- Sets up triggers for updated_at timestamps
- Handles database connection pooling
- Provides graceful error handling

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **CSS Not Loading**
   - Run `npm run build:css:prod` to generate CSS
   - Check that `/public/css/style.css` exists

3. **TypeScript Errors**
   - Run `npm run build` to check for compilation errors
   - Ensure all dependencies are installed

4. **Port Already in Use**
   - Change the PORT in `.env` file
   - Or stop the process using the port

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support or questions, please open an issue on GitHub.

---

**Built with ❤️ using Node.js, Express, PostgreSQL, and modern web technologies.**