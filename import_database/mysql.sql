-- MySQL Database Setup for Book Management System

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  published_year INT,
  genre VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data for books
INSERT INTO books (title, author, published_year, genre) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 1925, 'Fiction'),
('To Kill a Mockingbird', 'Harper Lee', 1960, 'Fiction'),
('1984', 'George Orwell', 1949, 'Dystopian Fiction'),
('Pride and Prejudice', 'Jane Austen', 1813, 'Romance'),
('The Catcher in the Rye', 'J.D. Salinger', 1951, 'Fiction');

-- Insert sample admin user (password: 1234567890)
-- Password hash generated with bcrypt for '1234567890'
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@bookmanagement.com', '$2b$12$OntHJTfKdc0Wb3DOHU9Uo.nvh3Mkqa5fUOP297D4.8AysvEVTrWDa', 'admin');