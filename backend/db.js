const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'student_management.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop and recreate tables for fresh start
      db.run("DROP TABLE IF EXISTS admin");
      db.run("DROP TABLE IF EXISTS students");
      db.run("DROP TABLE IF EXISTS marks");
      db.run("DROP TABLE IF EXISTS attendance");
      db.run("DROP TABLE IF EXISTS activity_log");
      db.run("DROP TABLE IF EXISTS otp_verification");
      db.run("DROP TABLE IF EXISTS email_verification");
      db.run("DROP TABLE IF EXISTS users");
      db.run("DROP TABLE IF EXISTS sessions");

      // Create admin table
      db.run(`CREATE TABLE admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        email_verified INTEGER DEFAULT 1,
        phone_verified INTEGER DEFAULT 0,
        auth_provider TEXT DEFAULT 'email',
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create students table
      db.run(`CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        register_number TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        year INTEGER NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        email_verified INTEGER DEFAULT 0,
        phone_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create marks table
      db.run(`CREATE TABLE marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        marks INTEGER NOT NULL,
        max_marks INTEGER DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`);

      // Create attendance table
      db.run(`CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Leave')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`);

      // Create activity_log table
      db.run(`CREATE TABLE activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create OTP verification table
      db.run(`CREATE TABLE otp_verification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at DATETIME,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create email verification tokens table
      db.run(`CREATE TABLE email_verification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create users table
      db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        email_verified INTEGER DEFAULT 0,
        phone TEXT,
        phone_verified INTEGER DEFAULT 0,
        display_name TEXT,
        photo_url TEXT,
        auth_provider TEXT DEFAULT 'email',
        provider_id TEXT,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create sessions table
      db.run(`CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_token TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Create default admin user
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run("INSERT INTO admin (username, password, email, auth_provider) VALUES (?, ?, ?, ?)", 
        ['admin', hashedPassword, 'admin@school.edu', 'email'], (err) => {
          if (!err) {
            console.log('✓ Default admin user created');
            console.log('  Username: admin');
            console.log('  Password: admin123');
          }
        });

      // Create sample users
      const sampleUsers = [
        { email: 'user@school.edu', name: 'Demo User', phone: '+919876543210', pass: 'user123' },
        { email: 'student@school.edu', name: 'Demo Student', phone: '+919876543211', pass: 'student123' }
      ];

      sampleUsers.forEach(u => {
        const hashed = bcrypt.hashSync(u.pass, 10);
        const uid = 'user_' + crypto.randomBytes(8).toString('hex');
        db.run("INSERT INTO users (uid, email, password_hash, display_name, phone, email_verified, auth_provider) VALUES (?, ?, ?, ?, ?, 1, 'email')",
          [uid, u.email, hashed, u.name, u.phone], (err) => {
            if (!err) {
              console.log(`✓ Sample user created: ${u.email} / ${u.pass}`);
            }
          });
      });

      // Create sample students
      const sampleStudents = [
        { name: 'John Doe', regno: 'CS21A001', dept: 'CSE', year: 1, email: 'john.cs21a001@school.edu', phone: '+919999999901' },
        { name: 'Jane Smith', regno: 'CS21A002', dept: 'CSE', year: 1, email: 'jane.cs21a002@school.edu', phone: '+919999999902' },
        { name: 'Mike Johnson', regno: 'EC21A001', dept: 'ECE', year: 2, email: 'mike.ec21a001@school.edu', phone: '+919999999903' },
        { name: 'Sarah Wilson', regno: 'ME21A001', dept: 'MECH', year: 2, email: 'sarah.me21a001@school.edu', phone: '+919999999904' },
        { name: 'Tom Brown', regno: 'IT21A001', dept: 'IT', year: 3, email: 'tom.it21a001@school.edu', phone: '+919999999905' }
      ];

      sampleStudents.forEach(s => {
        db.run("INSERT INTO students (name, register_number, department, year, email, phone, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)",
          [s.name, s.regno, s.dept, s.year, s.email, s.phone], (err) => {
            if (!err) {
              console.log(`✓ Sample student added: ${s.name} (${s.regno})`);
            }
          });
      });

      resolve();
    });
  });
};

module.exports = { db, initializeDatabase };
