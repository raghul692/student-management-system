# Student Management System

A comprehensive full-stack student management system with advanced authentication features and an Admin Panel to view all backend data.

## 🎯 Features

### Authentication Methods
- ✅ **Email/Password** - Traditional login
- ✅ **Google Sign-In** - OAuth simulation (demo mode)
- ✅ **Facebook Sign-In** - OAuth simulation (demo mode)
- ✅ **Phone/OTP** - SMS OTP verification simulation
- ✅ **Email Verification** - Token-based verification
- ✅ **User Registration** - New user sign-up

### Core Features
- ✅ Admin Login/Logout with session management
- ✅ Student CRUD (Add, View, Edit, Delete)
- ✅ Search by name/register number
- ✅ Filter by department/year
- ✅ Marks Management (Subject-wise with auto-calculation)
- ✅ Attendance Tracking (Present/Absent/Leave with percentage)
- ✅ Dashboard with statistics and charts
- ✅ Department-wise and year-wise distribution charts
- ✅ Real-time validation and toast notifications
- ✅ Activity logging
- ✅ **Admin Panel** - View all database data
- ✅ **Admin Panel** - View all database data

## 🚀 Getting Started

### Installation

```bash
cd c:/Users/raghu/OneDrive/Desktop/student_management
npm install
npm start
```

Open: `http://localhost:3000`

### Login Options

| Method | Credentials |
|--------|-------------|
| **Admin** | admin@school.edu / admin123 |
| **Demo Google** | Click "Continue with Google" |
| **Demo Facebook** | Click "Continue with Facebook" |
| **Demo Phone** | Enter any phone → check console for OTP |
| **Demo Email** | Register new account |

## 📁 Project Structure

```
student_management/
├── backend/
│   ├── db.js           # Database schema & tables
│   └── server.js       # Express API + Auth routes
├── frontend/
│   ├── index.html      # UI with all pages
│   └── app.js          # Frontend logic
├── package.json
└── README.md
```

## 🔐 Authentication Demo

### OTP Flow
1. Enter phone number
2. Click "Send OTP" - Check **console** for OTP
3. Enter OTP and verify
4. Login successful!

### Email Verification Flow
1. Register with email
2. Click "Send Verification Email"
3. Check **console** for verification link
4. Token auto-verified in demo mode

## 📊 Admin Panel

A new **Admin Panel** page is now available to view all backend data:

### Access Admin Panel
1. Login to the system
2. Click "Admin Panel" in the sidebar

### What You Can View
| Tab | Data Shown |
|-----|------------|
| **Users** | All registered users, email, auth provider, created date |
| **Students** | All students with details (name, reg no, dept, year, email) |
| **Marks** | All marks entries (student ID, subject, marks, date) |
| **Attendance** | All attendance records (student ID, date, status) |

### Quick Stats
- Total Students count
- Total Users count
- Total Marks count
- Total Attendance records

## 📊 API Endpoints

### Auth
- `POST /api/auth/login` - Email/Password login
- `POST /api/auth/google` - Google OAuth (simulated)
- `POST /api/auth/facebook` - Facebook OAuth (simulated)
- `POST /api/auth/send-otp` - Send phone OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login-phone` - Login with phone OTP
- `POST /api/auth/send-email-verification` - Send verification email
- `POST /api/auth/register` - Register new user

### Students
- `GET /api/students` - List with search/filter
- `POST /api/students` - Add student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Marks
- `GET /api/marks/:studentId` - Get marks with totals
- `POST /api/marks` - Add marks
- `DELETE /api/marks/:id` - Delete marks

### Attendance
- `GET /api/attendance/:studentId` - Get records
- `POST /api/attendance` - Add/update attendance
- Auto-calculates percentage

### Dashboard
- `GET /api/dashboard/stats` - Statistics
- `GET /api/dashboard/department-chart` - Pie chart data
- `GET /api/dashboard/year-chart` - Bar chart data
- `GET /api/dashboard/recent-activities` - Activity log

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | SQLite |
| Frontend | HTML5 + Tailwind CSS |
| JS | Vanilla JS |
| Charts | Chart.js |
| Icons | Font Awesome |
| Fonts | Inter |

## 💡 Key Features

### Dashboard
- Total Students & Users count
- Today's Attendance
- Average Attendance %
- Department Distribution (Pie)
- Year-wise Distribution (Bar)
- Recent Activity Log

### Student Management
- Full CRUD operations
- Search by Name/Register No
- Filter by Department/Year
- Validation & Toast messages

### Marks Management
- Subject-wise marks entry
- Auto-calculate Total, Average, Percentage
- Visual grade indicators (Green/Blue/Yellow/Red)

### Attendance
- Date-wise tracking
- Present/Absent/Leave status
- Auto-calculate Attendance %

## 🔒 Demo Mode Notes

This project runs in **demo mode** for OAuth and SMS/Email services:

- **Google/Facebook**: Simulates OAuth flow (no actual Google/Facebook account needed)
- **OTP**: OTP displayed in browser console
- **Email Verification**: Link displayed in browser console

For production, integrate:
- Firebase Auth for real Google/Facebook/Phone auth
- SendGrid/Mailgun for real emails
- Twilio for real SMS

## 🎯 Faculty Impression Points

✅ Clean, modern UI with Tailwind CSS  
✅ Multiple authentication methods (bonus!)  
✅ Interactive charts (Chart.js)  
✅ Real-time validation  
✅ Toast notifications  
✅ Responsive design  
✅ Activity logging  
✅ Professional folder structure  
✅ Comprehensive README  

---

Built with ❤️ for academic excellence!
"# student-management-system" 
