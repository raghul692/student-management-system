const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(session({
  secret: 'student-management-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate verification token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to log activities
function logActivity(action, description) {
  db.run("INSERT INTO activity_log (action, description) VALUES (?, ?)", [action, description], (err) => {
    if (err) console.error('Log error:', err);
  });
}

// ==================== AUTH ROUTES ====================

// Login with Email/Password
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // First check admin table
  db.get("SELECT * FROM admin WHERE username = ? OR email = ?", [username, username], (err, admin) => {
    if (admin && bcrypt.compareSync(password, admin.password)) {
      req.session.userId = admin.id;
      req.session.username = admin.username;
      req.session.role = admin.role;
      req.session.authProvider = 'email';
      
      logActivity('LOGIN', `Admin ${admin.username} logged in via email`);
      
      res.json({ 
        success: true, 
        message: 'Login successful',
        user: { id: admin.id, username: admin.username, role: admin.role, authProvider: 'email' }
      });
    } else {
      // Check users table
      db.get("SELECT * FROM users WHERE email = ?", [username], (err, user) => {
        if (user && user.password_hash && bcrypt.compareSync(password, user.password_hash)) {
          req.session.userId = user.id;
          req.session.username = user.email;
          req.session.role = 'user';
          req.session.authProvider = user.auth_provider;
          
          // Update last login
          db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
          logActivity('LOGIN', `User ${user.email} logged in via ${user.auth_provider}`);
          
          res.json({ 
            success: true, 
            message: 'Login successful',
            user: { id: user.id, email: user.email, displayName: user.display_name, authProvider: user.auth_provider }
          });
        } else {
          res.status(401).json({ error: 'Invalid username or password' });
        }
      });
    }
  });
});

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName, phone } = req.body;
  
  // Check if user exists
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const uid = 'user_' + crypto.randomBytes(8).toString('hex');
    
    db.run(`INSERT INTO users (uid, email, password_hash, display_name, phone, auth_provider) 
            VALUES (?, ?, ?, ?, ?, 'email')`,
      [uid, email, hashedPassword, displayName, phone],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Registration failed' });
        }
        logActivity('REGISTER', `New user ${email} registered`);
        res.json({ success: true, message: 'Registration successful', userId: this.lastID });
      }
    );
  });
});

// Send OTP for phone verification
app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  // Delete existing OTPs for this phone
  db.run("DELETE FROM otp_verification WHERE phone = ?", [phone]);
  
  // Store new OTP
  db.run("INSERT INTO otp_verification (phone, otp, expires_at) VALUES (?, ?, ?)",
    [phone, otp, expiresAt],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to send OTP' });
      }
      
      // In production, send via SMS service (Twilio, etc.)
      // For demo, we'll log it
      console.log(`[DEMO] OTP for ${phone}: ${otp}`);
      
      logActivity('OTP_SENT', `OTP sent to ${phone}`);
      res.json({ 
        success: true, 
        message: 'OTP sent successfully',
        // Include OTP in demo mode only
        demo: true,
        otp: otp 
      });
    }
  );
});

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  
  db.get("SELECT * FROM otp_verification WHERE phone = ? AND otp = ?", [phone, otp], (err, record) => {
    if (!record) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'OTP expired' });
    }
    
    // Mark OTP as verified
    db.run("UPDATE otp_verification SET verified = 1 WHERE id = ?", [record.id]);
    
    logActivity('OTP_VERIFIED', `Phone ${phone} verified`);
    res.json({ success: true, message: 'Phone verified successfully' });
  });
});

// Login with Phone/OTP
app.post('/api/auth/login-phone', (req, res) => {
  const { phone, otp } = req.body;
  
  db.get("SELECT * FROM otp_verification WHERE phone = ? AND otp = ? AND verified = 1", [phone, otp], (err, record) => {
    if (!record) {
      return res.status(401).json({ error: 'Invalid or unverified OTP' });
    }
    
    // Check if user exists with this phone
    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, user) => {
      if (!user) {
        // Create new user with phone auth
        const uid = 'phone_' + crypto.randomBytes(8).toString('hex');
        db.run(`INSERT INTO users (uid, phone, phone_verified, auth_provider) VALUES (?, ?, 1, 'phone')`,
          [uid, phone],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'User creation failed' });
            }
            createSession(res, this.lastID, phone, 'phone');
          }
        );
      } else {
        // Update verification status
        db.run("UPDATE users SET phone_verified = 1, last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
        createSession(res, user.id, user.email || phone, 'phone');
      }
    });
  });
});

function createSession(res, userId, username, provider) {
  const sessionToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  db.run("INSERT INTO sessions (session_token, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionToken, userId, expiresAt],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      logActivity('SESSION', `Session created for user ${username}`);
      res.json({
        success: true,
        message: 'Login successful',
        user: { id: userId, username, authProvider: provider },
        sessionToken
      });
    }
  );
}

// Send email verification
app.post('/api/auth/send-email-verification', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  db.run("DELETE FROM email_verification WHERE email = ?", [email]);
  db.run("INSERT INTO email_verification (email, token, expires_at) VALUES (?, ?, ?)",
    [email, token, expiresAt],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to send verification email' });
      }
      
      // In production, send via email service
      console.log(`[DEMO] Email verification link for ${email}: /verify-email?token=${token}`);
      
      logActivity('EMAIL_SENT', `Verification email sent to ${email}`);
      res.json({
        success: true,
        message: 'Verification email sent',
        demo: true,
        verificationLink: `/verify-email?token=${token}`
      });
    }
  );
});

// Verify email with token
app.post('/api/auth/verify-email', (req, res) => {
  const { email, token } = req.body;
  
  db.get("SELECT * FROM email_verification WHERE email = ? AND token = ?", [email, token], (err, record) => {
    if (!record) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'Token expired' });
    }
    
    db.run("UPDATE email_verification SET verified = 1 WHERE id = ?", [record.id]);
    db.run("UPDATE users SET email_verified = 1 WHERE email = ?", [email]);
    
    logActivity('EMAIL_VERIFIED', `Email ${email} verified`);
    res.json({ success: true, message: 'Email verified successfully' });
  });
});

// Simulate Google Sign-In
app.post('/api/auth/google', (req, res) => {
  const { idToken, email, displayName, photoUrl } = req.body;
  
  // In production, verify the idToken with Google
  // For demo, we accept the provided info
  
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (user) {
      // User exists, log them in
      db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
      createSession(res, user.id, user.email, 'google');
    } else {
      // Create new Google user
      const uid = 'google_' + crypto.randomBytes(8).toString('hex');
      db.run(`INSERT INTO users (uid, email, display_name, photo_url, email_verified, auth_provider, provider_id) 
              VALUES (?, ?, ?, ?, 1, 'google', ?)`,
        [uid, email, displayName, photoUrl, idToken],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Google login failed' });
          }
          createSession(res, this.lastID, email, 'google');
        }
      );
    }
  });
});

// Simulate Facebook Sign-In
app.post('/api/auth/facebook', (req, res) => {
  const { accessToken, email, displayName, photoUrl } = req.body;
  
  // In production, verify the accessToken with Facebook
  // For demo, we accept the provided info
  
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (user) {
      db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
      createSession(res, user.id, user.email, 'facebook');
    } else {
      const uid = 'fb_' + crypto.randomBytes(8).toString('hex');
      db.run(`INSERT INTO users (uid, email, display_name, photo_url, email_verified, auth_provider, provider_id) 
              VALUES (?, ?, ?, ?, 1, 'facebook', ?)`,
        [uid, email, displayName, photoUrl, accessToken],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Facebook login failed' });
          }
          createSession(res, this.lastID, email, 'facebook');
        }
      );
    }
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  if (req.session.sessionToken) {
    db.run("DELETE FROM sessions WHERE session_token = ?", [req.session.sessionToken]);
  }
  if (req.session.username) {
    logActivity('LOGOUT', `User ${req.session.username} logged out`);
  }
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true, 
      user: { 
        id: req.session.userId, 
        username: req.session.username, 
        role: req.session.role || 'user',
        authProvider: req.session.authProvider 
      } 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Change password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  db.get("SELECT * FROM admin WHERE id = ?", [req.session.userId], (err, admin) => {
    if (admin && bcrypt.compareSync(currentPassword, admin.password)) {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.run("UPDATE admin SET password = ? WHERE id = ?", [hashedPassword, req.session.userId]);
      logActivity('PASSWORD_CHANGE', `Password changed for admin ${admin.username}`);
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      db.get("SELECT * FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (user && user.password_hash && bcrypt.compareSync(currentPassword, user.password_hash)) {
          const hashedPassword = bcrypt.hashSync(newPassword, 10);
          db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, req.session.userId]);
          logActivity('PASSWORD_CHANGE', `Password changed for user ${user.email}`);
          res.json({ success: true, message: 'Password changed successfully' });
        } else {
          res.status(400).json({ error: 'Current password is incorrect' });
        }
      });
    }
  });
});

// ==================== STUDENT ROUTES ====================

app.get('/api/students', requireAuth, (req, res) => {
  const { search, department, year } = req.query;
  let query = "SELECT * FROM students WHERE 1=1";
  const params = [];
  
  if (search) {
    query += " AND (name LIKE ? OR register_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (department) {
    query += " AND department = ?";
    params.push(department);
  }
  if (year) {
    query += " AND year = ?";
    params.push(year);
  }
  
  query += " ORDER BY created_at DESC";
  
  db.all(query, params, (err, students) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
    res.json(students);
  });
});

app.get('/api/students/:id', requireAuth, (req, res) => {
  db.get("SELECT * FROM students WHERE id = ?", [req.params.id], (err, student) => {
    if (err || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  });
});

app.post('/api/students', requireAuth, (req, res) => {
  const { name, register_number, department, year, email, phone } = req.body;
  
  db.run(`INSERT INTO students (name, register_number, department, year, email, phone) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [name, register_number, department, year, email, phone], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Register number or email already exists' });
        }
        return res.status(500).json({ error: 'Failed to add student' });
      }
      logActivity('ADD_STUDENT', `Added student ${name} (${register_number})`);
      res.json({ success: true, message: 'Student added successfully', id: this.lastID });
    }
  );
});

app.put('/api/students/:id', requireAuth, (req, res) => {
  const { name, department, year, email, phone } = req.body;
  
  db.run(`UPDATE students SET name = ?, department = ?, year = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?`, 
    [name, department, year, email, phone, req.params.id], 
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update student' });
      }
      logActivity('UPDATE_STUDENT', `Updated student ID ${req.params.id}`);
      res.json({ success: true, message: 'Student updated successfully' });
    }
  );
});

app.delete('/api/students/:id', requireAuth, (req, res) => {
  db.get("SELECT name, register_number FROM students WHERE id = ?", [req.params.id], (err, student) => {
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    db.run("DELETE FROM students WHERE id = ?", [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete student' });
      }
      logActivity('DELETE_STUDENT', `Deleted student ${student.name} (${student.register_number})`);
      res.json({ success: true, message: 'Student deleted successfully' });
    });
  });
});

// ==================== MARKS ROUTES ====================

app.get('/api/marks/:studentId', requireAuth, (req, res) => {
  db.all("SELECT * FROM marks WHERE student_id = ? ORDER BY created_at DESC", [req.params.studentId], (err, marks) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch marks' });
    }
    
    const total = marks.reduce((sum, m) => sum + m.marks, 0);
    const average = marks.length > 0 ? (total / marks.length).toFixed(2) : 0;
    const maxTotal = marks.reduce((sum, m) => sum + m.max_marks, 0);
    const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : 0;
    
    res.json({ marks, total, average, percentage, subjectCount: marks.length, maxTotal });
  });
});

app.post('/api/marks', requireAuth, (req, res) => {
  const { student_id, subject, marks, max_marks = 100 } = req.body;
  
  db.run(`INSERT INTO marks (student_id, subject, marks, max_marks) VALUES (?, ?, ?, ?)`,
    [student_id, subject, marks, max_marks],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add marks' });
      }
      db.get("SELECT name FROM students WHERE id = ?", [student_id], (err, student) => {
        logActivity('ADD_MARKS', `Added marks for ${student?.name} in ${subject}`);
      });
      res.json({ success: true, message: 'Marks added successfully', id: this.lastID });
    }
  );
});

app.put('/api/marks/:id', requireAuth, (req, res) => {
  const { subject, marks, max_marks } = req.body;
  
  db.run(`UPDATE marks SET subject = ?, marks = ?, max_marks = ? WHERE id = ?`,
    [subject, marks, max_marks, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update marks' });
      }
      res.json({ success: true, message: 'Marks updated successfully' });
    }
  );
});

app.delete('/api/marks/:id', requireAuth, (req, res) => {
  db.run("DELETE FROM marks WHERE id = ?", [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete marks' });
    }
    res.json({ success: true, message: 'Marks deleted successfully' });
  });
});

app.get('/api/marks-summary', requireAuth, (req, res) => {
  db.all(`
    SELECT s.id, s.name, s.register_number, s.department,
           (SELECT COUNT(*) FROM marks WHERE student_id = s.id) as subject_count,
           (SELECT SUM(marks) FROM marks WHERE student_id = s.id) as total_marks,
           (SELECT SUM(max_marks) FROM marks WHERE student_id = s.id) as max_marks,
           (SELECT AVG(marks) FROM marks WHERE student_id = s.id) as average
    FROM students s
    ORDER BY average DESC
  `, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch marks summary' });
    }
    res.json(data);
  });
});

// ==================== ATTENDANCE ROUTES ====================

app.get('/api/attendance/:studentId', requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;
  let query = "SELECT * FROM attendance WHERE student_id = ?";
  const params = [req.params.studentId];
  
  if (startDate) {
    query += " AND date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND date <= ?";
    params.push(endDate);
  }
  
  query += " ORDER BY date DESC";
  
  db.all(query, params, (err, records) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch attendance' });
    }
    
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;
    const total = records.length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;
    
    res.json({ records, present, absent, leave, total, percentage });
  });
});

app.post('/api/attendance', requireAuth, (req, res) => {
  const { student_id, date, status } = req.body;
  
  db.get("SELECT * FROM attendance WHERE student_id = ? AND date = ?", [student_id, date], (err, existing) => {
    if (existing) {
      db.run("UPDATE attendance SET status = ? WHERE id = ?", [status, existing.id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update attendance' });
        }
        res.json({ success: true, message: 'Attendance updated successfully' });
      });
    } else {
      db.run(`INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)`,
        [student_id, date, status],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to add attendance' });
          }
          db.get("SELECT name FROM students WHERE id = ?", [student_id], (err, student) => {
            logActivity('ATTENDANCE', `Marked ${student?.name} as ${status} on ${date}`);
          });
          res.json({ success: true, message: 'Attendance added successfully', id: this.lastID });
        }
      );
    }
  });
});

app.get('/api/attendance-summary', requireAuth, (req, res) => {
  db.all(`
    SELECT s.id, s.name, s.register_number, s.department,
           COUNT(a.id) as total_days,
           SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days,
           SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
           SUM(CASE WHEN a.status = 'Leave' THEN 1 ELSE 0 END) as leave_days,
           CASE WHEN COUNT(a.id) > 0 
                THEN ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 2)
                ELSE 0 END as percentage
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id
    GROUP BY s.id
    ORDER BY percentage DESC
  `, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
    res.json(data);
  });
});

// ==================== DASHBOARD ROUTES ====================

app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  db.get("SELECT COUNT(*) as total FROM students", (err, studentCount) => {
    if (err) studentCount = { total: 0 };
    
    db.get("SELECT COUNT(DISTINCT department) as depts FROM students", (err, deptCount) => {
      if (err) deptCount = { depts: 0 };
      
      db.get(`SELECT COUNT(DISTINCT student_id) as present_today,
                    (SELECT COUNT(*) FROM students) as total_students
              FROM attendance WHERE date = date('now', 'localtime') AND status = 'Present'`,
        (err, todayAttendance) => {
          if (err) todayAttendance = { present_today: 0, total_students: 0 };
          
          db.get(`SELECT ROUND(AVG(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) * 100, 2) as avg_attendance
                  FROM attendance`,
            (err, avgAttendance) => {
              if (err) avgAttendance = { avg_attendance: 0 };
              
              db.get("SELECT COUNT(*) as total FROM users", (err, userCount) => {
                if (err) userCount = { total: 0 };
                
                db.get("SELECT COUNT(*) as total FROM marks", (err, marksCount) => {
                  if (err) marksCount = { total: 0 };
                  
                  db.get("SELECT COUNT(*) as total FROM attendance", (err, attendanceCount) => {
                    if (err) attendanceCount = { total: 0 };
                    
                    res.json({
                      totalStudents: studentCount.total,
                      totalUsers: userCount.total,
                      totalMarks: marksCount.total,
                      totalAttendance: attendanceCount.total,
                      totalDepartments: deptCount.depts,
                      todayAttendance: `${todayAttendance.present_today}/${todayAttendance.total_students}`,
                      averageAttendance: avgAttendance.avg_attendance
                    });
                  });
                });
              });
            }
          );
        }
      );
    });
  });
});

app.get('/api/dashboard/department-chart', requireAuth, (req, res) => {
  db.all("SELECT department, COUNT(*) as count FROM students GROUP BY department ORDER BY count DESC", (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch department data' });
    }
    res.json(data);
  });
});

app.get('/api/dashboard/year-chart', requireAuth, (req, res) => {
  db.all("SELECT year, COUNT(*) as count FROM students GROUP BY year ORDER BY year ASC", (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch year data' });
    }
    res.json(data);
  });
});

app.get('/api/dashboard/recent-activities', requireAuth, (req, res) => {
  db.all("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 15", (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch activities' });
    }
    res.json(data);
  });
});

// ==================== ADMIN PANEL ROUTES ====================

// Get all users
app.get('/api/admin/users', requireAuth, (req, res) => {
  db.all("SELECT id, email, display_name, phone, auth_provider, email_verified, created_at FROM users ORDER BY id DESC", (err, users) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch users' });
    res.json(users || []);
  });
});

// Get all students
app.get('/api/admin/all-students', requireAuth, (req, res) => {
  db.all("SELECT * FROM students ORDER BY id DESC", (err, students) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch students' });
    res.json(students || []);
  });
});

// Get all marks
app.get('/api/admin/all-marks', requireAuth, (req, res) => {
  db.all("SELECT * FROM marks ORDER BY id DESC", (err, marks) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch marks' });
    res.json(marks || []);
  });
});

// Get all attendance
app.get('/api/admin/all-attendance', requireAuth, (req, res) => {
  db.all("SELECT * FROM attendance ORDER BY id DESC", (err, attendance) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch attendance' });
    res.json(attendance || []);
  });
});

// ==================== SERVE FRONTEND ====================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════════════════╗`);
    console.log(`║                                                          ║`);
    console.log(`║   🎓 Student Management System                           ║`);
    console.log(`║   Server running on http://localhost:${PORT}               ║`);
    console.log(`║                                                          ║`);
    console.log(`║   📧 Login: admin / admin123                             ║`);
    console.log(`║   🔐 Multiple auth methods supported                     ║`);
    console.log(`║                                                          ║`);
    console.log(`╚══════════════════════════════════════════════════════════╝\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
