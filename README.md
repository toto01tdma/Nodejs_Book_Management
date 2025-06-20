# 📚 Book Management System

A full-featured Book Management System built with Node.js, Express, PostgreSQL, and a modern web interface. This system provides complete CRUD (Create, Read, Update, Delete) functionality for managing a book collection.

![Book Management System](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🌟 Features

### Core Functionality
- ✅ **Full CRUD Operations**: Create, Read, Update, and Delete books
- 🔍 **Advanced Search & Filtering**: Search by title, author, genre, and publication year
- 📄 **Pagination**: Efficient handling of large book collections
- 📊 **Dashboard Statistics**: Real-time stats showing total books, authors, genres, and recent additions
- 🎨 **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- 📱 **Mobile Responsive**: Works perfectly on all device sizes

### Technical Features
- 🛡️ **Input Validation**: Server-side validation using express-validator
- 🔒 **SQL Injection Protection**: Parameterized queries for security
- ⚡ **Performance Optimized**: Efficient database queries with indexing
- 🔄 **Auto-updated Timestamps**: Automatic tracking of creation and modification times
- 📝 **TypeScript Support**: Full type safety throughout the application
- 🎯 **RESTful API**: Clean, well-structured API endpoints

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

### Database Schema
```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  published_year INTEGER,
  genre VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
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

3. **Set up PostgreSQL database**
   - Create a new PostgreSQL database named `book_management`
   - Note your database credentials

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the database configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=book_management
   DB_USER=your_username
   DB_PASSWORD=your_password
   PORT=3000
   NODE_ENV=development
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

### Dashboard
- View overall statistics of your book collection
- See total books, authors, genres, and recent additions
- Quick access to add new books

### Managing Books
- **Add Books**: Click the "Add New Book" button to add a new book
- **Search Books**: Use the search bar to find books by title or author
- **Filter Books**: Filter by genre, author, or publication year
- **Edit Books**: Click the edit icon to modify book details
- **Delete Books**: Click the delete icon to remove books (with confirmation)

### Advanced Features
- **Pagination**: Navigate through large collections efficiently
- **Sorting**: Books are sorted by creation date (newest first)
- **Responsive Grid**: Adjusts to different screen sizes
- **Real-time Updates**: Statistics update automatically after operations

## 🛠️ API Endpoints

### Books
- `GET /api/books` - Get all books with filtering and pagination
- `GET /api/books/:id` - Get a specific book
- `POST /api/books` - Create a new book
- `PUT /api/books/:id` - Update a book
- `DELETE /api/books/:id` - Delete a book

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

## 🗂️ Project Structure

```
├── config/
│   └── database.ts          # Database configuration and connection
├── models/
│   ├── Book.ts              # Book interfaces and types
│   └── BookService.ts       # Book service layer with business logic
├── routes/
│   └── bookRoutes.ts        # API routes for book operations
├── views/
│   └── index.ejs            # Main frontend template
├── public/
│   ├── css/
│   │   └── style.css        # Compiled Tailwind CSS
│   └── js/
│       └── app.js           # Frontend JavaScript
├── src/
│   └── input.css            # Tailwind CSS source
├── server.ts                # Main server file
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 🔧 Configuration

### Database Configuration
The application uses PostgreSQL with connection pooling. Configure your database in the `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=book_management
DB_USER=your_username
DB_PASSWORD=your_password
```

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DB_*` - Database configuration
- `DATABASE_URL` - Alternative database URL format

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