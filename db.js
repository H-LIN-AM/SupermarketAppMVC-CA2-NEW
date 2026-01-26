// ========================================
// Database Connection Configuration File
// Uses MySQL2 library to connect to MySQL database
// Configuration info read from .env environment variables file
// ========================================

const mysql = require('mysql2');  // Import MySQL2 module
require('dotenv').config();  // Load environment variables from .env file

// ========================================
// Create Database Connection
// ========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST,          // Database host address (read from environment variable)
    user: process.env.DB_USER,          // Database username
    password: process.env.DB_PASSWORD,  // Database password
    database: process.env.DB_NAME       // Database name
});

// ========================================
// Connect to Database
// ========================================
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Export database connection object for use by other modules
module.exports = db;
