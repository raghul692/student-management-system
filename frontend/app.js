// ==================== API Helper ====================
const API_BASE = '/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result;
  } catch (error) { throw error; }
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
  const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
  toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-lg text-white ${colors[type]} shadow-lg`;
  toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

// ==================== Authentication ====================
let currentAuthProvider = 'email';

async function checkAuth() {
  try {
    const result = await apiRequest('/auth/status');
    if (result.authenticated) {
      document.getElementById('login-page').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      updateUserInfo(result.user);
      loadDashboard();
      loadStudents();
    } else {
      document.getElementById('login-page').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
    }
  } catch (error) {
    showToast('Authentication check failed', 'error');
  }
}

function updateUserInfo(user) {
  document.getElementById('current-user').textContent = user.username || user.email || 'User';
  const providerIcon = { email: 'fa-envelope', google: 'fa-google', facebook: 'fa-facebook', phone: 'fa-phone' };
  const providerName = { email: 'Email', google: 'Google', facebook: 'Facebook', phone: 'Phone' };
  document.getElementById('auth-provider').innerHTML = `<i class="fas ${providerIcon[user.authProvider] || 'fa-user'}"></i> ${providerName[user.authProvider] || 'Email'}`;
}

// Admin Panel Functions
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-admin-"]').forEach(t => t.classList.remove('tab-active'));
  document.getElementById(`admin-${tab}-content`).classList.remove('hidden');
  document.getElementById(`tab-admin-${tab}`).classList.add('tab-active');
}

async function loadAdminPanel() {
  try {
    const stats = await apiRequest('/dashboard/stats');
    document.getElementById('admin-total-students').textContent = stats.totalStudents || 0;
    document.getElementById('admin-total-users').textContent = stats.totalUsers || 0;
    document.getElementById('admin-total-marks').textContent = stats.totalMarks || 0;
    document.getElementById('admin-total-attendance').textContent = stats.totalAttendance || 0;
    
    const [users, students, marks, attendance] = await Promise.all([
      apiRequest('/admin/users'),
      apiRequest('/admin/all-students'),
      apiRequest('/admin/all-marks'),
      apiRequest('/admin/all-attendance')
    ]);
    
    renderAdminUsers(users);
    renderAdminStudents(students);
    renderAdminMarks(marks);
    renderAdminAttendance(attendance);
  } catch (error) {
    console.error('Failed to load admin data:', error);
  }
}

function renderAdminUsers(users) {
  const tbody = document.getElementById('admin-users-table');
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-text-secondary">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${u.id}</td>
      <td class="px-6 py-4">${u.email}</td>
      <td class="px-6 py-4">${u.display_name || '-'}</td>
      <td class="px-6 py-4"><span class="px-2 py-1 bg-blue-100 text-primary rounded text-sm">${u.auth_provider}</span></td>
      <td class="px-6 py-4 text-text-secondary">${new Date(u.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function renderAdminStudents(students) {
  const tbody = document.getElementById('admin-students-table');
  if (!students || students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-text-secondary">No students found</td></tr>';
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${s.id}</td>
      <td class="px-6 py-4">${s.register_number}</td>
      <td class="px-6 py-4">${s.name}</td>
      <td class="px-6 py-4"><span class="px-2 py-1 bg-blue-100 text-primary rounded text-sm">${s.department}</span></td>
      <td class="px-6 py-4">${s.year} Year</td>
      <td class="px-6 py-4 text-text-secondary">${s.email}</td>
    </tr>
  `).join('');
}

function renderAdminMarks(marks) {
  const tbody = document.getElementById('admin-marks-table');
  if (!marks || marks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-text-secondary">No marks found</td></tr>';
    return;
  }
  tbody.innerHTML = marks.map(m => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${m.id}</td>
      <td class="px-6 py-4">${m.student_id}</td>
      <td class="px-6 py-4">${m.subject}</td>
      <td class="px-6 py-4"><span class="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">${m.marks}/${m.max_marks}</span></td>
      <td class="px-6 py-4 text-text-secondary">${new Date(m.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function renderAdminAttendance(attendance) {
  const tbody = document.getElementById('admin-attendance-table');
  if (!attendance || attendance.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-text-secondary">No attendance records found</td></tr>';
    return;
  }
  tbody.innerHTML = attendance.map(a => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${a.id}</td>
      <td class="px-6 py-4">${a.student_id}</td>
      <td class="px-6 py-4">${new Date(a.date).toLocaleDateString()}</td>
      <td class="px-6 py-4"><span class="px-2 py-1 ${getAttendanceClass(a.status)} rounded text-sm">${a.status}</span></td>
      <td class="px-6 py-4 text-text-secondary">${new Date(a.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

// Tab switching for auth
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.remove('tab-active'));
  
  if (tab === 'email') {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('tab-email').classList.add('tab-active');
  } else if (tab === 'phone') {
    document.getElementById('phone-form').classList.remove('hidden');
    document.getElementById('tab-phone').classList.add('tab-active');
  } else if (tab === 'register') {
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('tab-register').classList.add('tab-active');
  }
}

// Email Login
async function login(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  if (!username || !password) { showToast('Please enter username and password', 'warning'); return; }
  try {
    showLoading();
    const result = await apiRequest('/auth/login', 'POST', { username, password });
    showToast('Login successful!', 'success');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateUserInfo(result.user);
    loadDashboard();
    loadStudents();
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// Google Sign In (Simulated)
async function loginWithGoogle() {
  try {
    showLoading();
    // Simulate Google OAuth flow
    const demoUser = {
      idToken: 'google_demo_token_' + Date.now(),
      email: 'demo.user@gmail.com',
      displayName: 'Demo User',
      photoUrl: 'https://via.placeholder.com/100'
    };
    const result = await apiRequest('/auth/google', 'POST', demoUser);
    showToast('Google login successful!', 'success');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateUserInfo(result.user);
    loadDashboard();
    loadStudents();
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// Facebook Sign In (Simulated)
async function loginWithFacebook() {
  try {
    showLoading();
    // Simulate Facebook OAuth flow
    const demoUser = {
      accessToken: 'fb_demo_token_' + Date.now(),
      email: 'demo.user@facebook.com',
      displayName: 'Demo Facebook User',
      photoUrl: 'https://via.placeholder.com/100'
    };
    const result = await apiRequest('/auth/facebook', 'POST', demoUser);
    showToast('Facebook login successful!', 'success');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateUserInfo(result.user);
    loadDashboard();
    loadStudents();
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// Phone OTP - Send
async function sendOTP() {
  const phone = document.getElementById('phone-number').value;
  if (!phone || phone.length < 10) { showToast('Please enter a valid phone number', 'warning'); return; }
  try {
    showLoading();
    const result = await apiRequest('/auth/send-otp', 'POST', { phone });
    document.getElementById('phone-form').classList.add('hidden');
    document.getElementById('otp-form').classList.remove('hidden');
    document.getElementById('otp-sent-to').textContent = phone;
    showToast('OTP sent successfully! Check console', 'success');
    if (result.demo) { console.log('📱 [DEMO] OTP for', phone, ':', result.otp); }
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// Phone OTP - Verify
async function verifyOTP() {
  const phone = document.getElementById('phone-number').value;
  const otp = document.getElementById('otp-input').value;
  if (!otp || otp.length !== 6) { showToast('Please enter the 6-digit OTP', 'warning'); return; }
  try {
    showLoading();
    const result = await apiRequest('/auth/verify-otp', 'POST', { phone, otp });
    const loginResult = await apiRequest('/auth/login-phone', 'POST', { phone, otp });
    showToast('Phone verified! Login successful!', 'success');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateUserInfo(loginResult.user);
    loadDashboard();
    loadStudents();
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

function resetPhoneAuth() {
  document.getElementById('otp-form').classList.add('hidden');
  document.getElementById('phone-form').classList.remove('hidden');
  document.getElementById('otp-input').value = '';
}

// Registration
async function registerUser() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  
  if (!name || !email || !password) { showToast('Please fill in all required fields', 'warning'); return; }
  if (password !== confirmPassword) { showToast('Passwords do not match', 'warning'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'warning'); return; }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { showToast('Please enter a valid email address', 'warning'); return; }
  
  try {
    showLoading();
    const result = await apiRequest('/auth/register', 'POST', { displayName: name, email, phone, password });
    showToast('Registration successful! Please verify your email.', 'success');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('verify-email-section').classList.remove('hidden');
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// Email Verification
async function sendVerificationEmail() {
  const email = document.getElementById('reg-email').value;
  if (!email) { showToast('Please enter your email', 'warning'); return; }
  try {
    showLoading();
    const result = await apiRequest('/auth/send-email-verification', 'POST', { email });
    showToast('Verification email sent! Check console for demo link', 'success');
    if (result.demo) { console.log('📧 [DEMO] Verification link:', window.location.origin + result.verificationLink); }
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// Logout
async function logout() {
  try {
    await apiRequest('/auth/logout', 'POST');
    showToast('Logged out successfully', 'success');
    setTimeout(() => { window.location.reload(); }, 500);
  } catch (error) { showToast('Logout failed', 'error'); }
}

// ==================== Page Navigation ====================
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
  document.getElementById(`page-${pageName}`).classList.remove('hidden');
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  document.getElementById(`nav-${pageName}`).classList.add('active');
  if (pageName === 'dashboard') loadDashboard();
  else if (pageName === 'students') loadStudents();
  else if (pageName === 'marks') loadMarksPage();
  else if (pageName === 'attendance') loadAttendancePage();
  else if (pageName === 'admin') loadAdminPanel();
}

// ==================== Dashboard ====================
async function loadDashboard() {
  try {
    const [stats, deptData, yearData, activities] = await Promise.all([
      apiRequest('/dashboard/stats'),
      apiRequest('/dashboard/department-chart'),
      apiRequest('/dashboard/year-chart'),
      apiRequest('/dashboard/recent-activities')
    ]);
    document.getElementById('stat-total-students').textContent = stats.totalStudents || 0;
    document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-today-attendance').textContent = stats.todayAttendance || '0/0';
    document.getElementById('stat-avg-attendance').textContent = `${stats.averageAttendance}%`;
    renderDeptChart(deptData);
    renderYearChart(yearData);
    renderActivities(activities);
  } catch (error) { showToast('Failed to load dashboard data', 'error'); }
}

function renderDeptChart(data) {
  const ctx = document.getElementById('dept-chart');
  if (!ctx) return;
  if (window.deptChartInstance) window.deptChartInstance.destroy();
  window.deptChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.department),
      datasets: [{ data: data.map(d => d.count), backgroundColor: ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'], borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderYearChart(data) {
  const ctx = document.getElementById('year-chart');
  if (!ctx) return;
  if (window.yearChartInstance) window.yearChartInstance.destroy();
  window.yearChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => `${d.year} Year`),
      datasets: [{ label: 'Students', data: data.map(d => d.count), backgroundColor: '#2563EB', borderRadius: 8 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function renderActivities(activities) {
  const container = document.getElementById('recent-activities');
  if (!activities || activities.length === 0) { container.innerHTML = '<p class="text-text-secondary text-center py-4">No recent activities</p>'; return; }
  container.innerHTML = activities.map(activity => {
    const time = new Date(activity.created_at).toLocaleString();
    const iconColors = { LOGIN: 'bg-blue-100', LOGOUT: 'bg-red-100', ADD_STUDENT: 'bg-green-100', DELETE_STUDENT: 'bg-red-100', ATTENDANCE: 'bg-yellow-100', MARKS: 'bg-purple-100' };
    return `<div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconColors[activity.action] || 'bg-gray-100'}">
        <i class="fas fa-info text-gray-600 text-sm"></i>
      </div>
      <div class="flex-1"><p class="font-medium">${activity.action}</p><p class="text-sm text-text-secondary">${activity.description || ''}</p></div>
      <span class="text-xs text-text-secondary">${time}</span>
    </div>`;
  }).join('');
}

// ==================== Students ====================
let allStudents = [];

async function loadStudents() {
  try {
    allStudents = await apiRequest('/students');
    renderStudents(allStudents);
    populateStudentSelects();
  } catch (error) { showToast('Failed to load students', 'error'); }
}

function renderStudents(students) {
  const tbody = document.getElementById('students-table');
  if (!students || students.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-text-secondary">No students found</td></tr>'; return; }
  tbody.innerHTML = students.map(student => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${student.register_number}</td>
      <td class="px-6 py-4">${student.name}</td>
      <td class="px-6 py-4"><span class="px-3 py-1 bg-blue-100 text-primary rounded-full text-sm">${student.department}</span></td>
      <td class="px-6 py-4">${student.year}${getOrdinalSuffix(student.year)} Year</td>
      <td class="px-6 py-4 text-text-secondary">${student.email}</td>
      <td class="px-6 py-4">
        <div class="flex gap-2">
          <button onclick="editStudent(${student.id})" class="p-2 text-primary hover:bg-blue-50 rounded-lg transition" title="Edit"><i class="fas fa-edit"></i></button>
          <button onclick="deleteStudent(${student.id})" class="p-2 text-danger hover:bg-red-50 rounded-lg transition" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getOrdinalSuffix(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }

function filterStudents() {
  const search = document.getElementById('student-search').value.toLowerCase();
  const department = document.getElementById('filter-department').value;
  const year = document.getElementById('filter-year').value;
  const filtered = allStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(search) || student.register_number.toLowerCase().includes(search);
    const matchesDept = !department || student.department === department;
    const matchesYear = !year || student.year.toString() === year;
    return matchesSearch && matchesDept && matchesYear;
  });
  renderStudents(filtered);
}

async function addStudent(event) {
  event.preventDefault();
  const studentData = {
    name: document.getElementById('student-name').value.trim(),
    register_number: document.getElementById('student-regno').value.trim().toUpperCase(),
    department: document.getElementById('student-department').value,
    year: parseInt(document.getElementById('student-year').value),
    email: document.getElementById('student-email').value.trim(),
    phone: document.getElementById('student-phone').value.trim()
  };
  if (!studentData.name || !studentData.register_number || !studentData.department || !studentData.year || !studentData.email) {
    showToast('Please fill in all required fields', 'warning'); return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(studentData.email)) { showToast('Please enter a valid email address', 'warning'); return; }
  try {
    showLoading();
    await apiRequest('/students', 'POST', studentData);
    showToast('Student added successfully!', 'success');
    closeModal('student-modal');
    document.getElementById('student-form').reset();
    loadStudents();
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

async function editStudent(id) {
  try {
    const student = await apiRequest(`/students/${id}`);
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-regno').value = student.register_number;
    document.getElementById('student-department').value = student.department;
    document.getElementById('student-year').value = student.year;
    document.getElementById('student-email').value = student.email;
    document.getElementById('student-phone').value = student.phone || '';
    document.getElementById('student-regno').readOnly = true;
    document.getElementById('student-modal-title').textContent = 'Edit Student';
    openModal('student-modal');
  } catch (error) { showToast('Failed to load student details', 'error'); }
}

async function updateStudent(event) {
  event.preventDefault();
  const id = document.getElementById('student-id').value;
  if (!id) { await addStudent(event); return; }
  const studentData = {
    name: document.getElementById('student-name').value.trim(),
    department: document.getElementById('student-department').value,
    year: parseInt(document.getElementById('student-year').value),
    email: document.getElementById('student-email').value.trim(),
    phone: document.getElementById('student-phone').value.trim()
  };
  try {
    showLoading();
    await apiRequest(`/students/${id}`, 'PUT', studentData);
    showToast('Student updated successfully!', 'success');
    closeModal('student-modal');
    document.getElementById('student-form').reset();
    document.getElementById('student-id').value = '';
    document.getElementById('student-regno').readOnly = false;
    document.getElementById('student-modal-title').textContent = 'Add Student';
    loadStudents();
  } catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

async function deleteStudent(id) {
  if (!confirm('Are you sure you want to delete this student?')) return;
  try { showLoading(); await apiRequest(`/students/${id}`, 'DELETE'); showToast('Student deleted successfully!', 'success'); loadStudents(); }
  catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

function populateStudentSelects() {
  ['marks-student-select', 'marks-form-student', 'attendance-student-select'].forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Choose a student...</option>' + 
      allStudents.map(s => `<option value="${s.id}">${s.register_number} - ${s.name}</option>`).join('');
    select.value = currentValue;
  });
}

// ==================== Marks ====================
async function loadMarksPage() { if (allStudents.length === 0) await loadStudents(); }

async function loadStudentMarks() {
  const studentId = document.getElementById('marks-student-select').value;
  if (!studentId) {
    document.getElementById('marks-summary').classList.add('hidden');
    document.getElementById('marks-table').innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-text-secondary">Select a student to view marks</td></tr>';
    return;
  }
  try {
    const result = await apiRequest(`/marks/${studentId}`);
    document.getElementById('marks-summary').classList.remove('hidden');
    document.getElementById('marks-subject-count').textContent = result.subjectCount;
    document.getElementById('marks-total').textContent = result.total;
    document.getElementById('marks-average').textContent = result.average;
    document.getElementById('marks-percentage').textContent = `${result.percentage}%`;
    renderMarksTable(result.marks);
  } catch (error) { showToast('Failed to load marks', 'error'); }
}

function renderMarksTable(marks) {
  const tbody = document.getElementById('marks-table');
  if (!marks || marks.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-text-secondary">No marks recorded yet</td></tr>'; return; }
  tbody.innerHTML = marks.map(mark => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${mark.subject}</td>
      <td class="px-6 py-4"><span class="px-3 py-1 ${getMarksClass(mark.marks, mark.max_marks)} rounded-full text-sm font-medium">${mark.marks}/${mark.max_marks}</span></td>
      <td class="px-6 py-4 text-text-secondary">${mark.max_marks}</td>
      <td class="px-6 py-4"><button onclick="deleteMarks(${mark.id})" class="p-2 text-danger hover:bg-red-50 rounded-lg transition" title="Delete"><i class="fas fa-trash"></i></button></td>
    </tr>
  `).join('');
}

function getMarksClass(marks, max) { const percentage = (marks / max) * 100; if (percentage >= 80) return 'bg-green-100 text-green-700'; if (percentage >= 60) return 'bg-blue-100 text-blue-700'; if (percentage >= 40) return 'bg-yellow-100 text-yellow-700'; return 'bg-red-100 text-red-700'; }

async function addMarks(event) {
  event.preventDefault();
  const marksData = { student_id: document.getElementById('marks-form-student').value, subject: document.getElementById('marks-subject').value.trim(), marks: parseInt(document.getElementById('marks-score').value), max_marks: parseInt(document.getElementById('marks-max').value) || 100 };
  if (!marksData.student_id || !marksData.subject || isNaN(marksData.marks)) { showToast('Please fill in all required fields', 'warning'); return; }
  if (marksData.marks > marksData.max_marks) { showToast('Marks cannot exceed max marks', 'warning'); return; }
  try { showLoading(); await apiRequest('/marks', 'POST', marksData); showToast('Marks added successfully!', 'success'); closeModal('marks-modal'); document.getElementById('marks-form').reset(); loadStudentMarks(); }
  catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

async function deleteMarks(id) { if (!confirm('Delete these marks?')) return; try { showLoading(); await apiRequest(`/marks/${id}`, 'DELETE'); showToast('Marks deleted!', 'success'); loadStudentMarks(); } catch (error) { showToast(error.message, 'error'); } finally { hideLoading(); } }

// ==================== Attendance ====================
async function loadAttendancePage() {
  if (allStudents.length === 0) await loadStudents();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('attendance-start-date').value = thirtyDaysAgo;
  document.getElementById('attendance-end-date').value = today;
}

async function loadStudentAttendance() {
  const studentId = document.getElementById('attendance-student-select').value;
  const startDate = document.getElementById('attendance-start-date').value;
  const endDate = document.getElementById('attendance-end-date').value;
  if (!studentId) { document.getElementById('attendance-summary').classList.add('hidden'); document.getElementById('attendance-table').innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-text-secondary">Select a student</td></tr>'; return; }
  try {
    let url = `/attendance/${studentId}`;
    const params = new URLSearchParams(); if (startDate) params.append('startDate', startDate); if (endDate) params.append('endDate', endDate); if (params.toString()) url += `?${params.toString()}`;
    const result = await apiRequest(url);
    document.getElementById('attendance-summary').classList.remove('hidden');
    document.getElementById('attendance-total').textContent = result.total;
    document.getElementById('attendance-present').textContent = result.present;
    document.getElementById('attendance-absent').textContent = result.absent;
    document.getElementById('attendance-leave').textContent = result.leave;
    document.getElementById('attendance-percentage').textContent = `${result.percentage}%`;
    renderAttendanceTable(result.records);
  } catch (error) { showToast('Failed to load attendance', 'error'); }
}

function renderAttendanceTable(records) {
  const tbody = document.getElementById('attendance-table');
  if (!records || records.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-text-secondary">No records</td></tr>'; return; }
  tbody.innerHTML = records.map(record => `
    <tr class="table-row border-b border-gray-100">
      <td class="px-6 py-4 font-medium">${new Date(record.date).toLocaleDateString()}</td>
      <td class="px-6 py-4"><span class="px-3 py-1 ${getAttendanceClass(record.status)} rounded-full text-sm font-medium">${record.status}</span></td>
      <td class="px-6 py-4"><button onclick="openEditAttendance(${record.id}, ${record.student_id}, '${record.date}', '${record.status}')" class="p-2 text-primary hover:bg-blue-50 rounded-lg transition"><i class="fas fa-edit"></i></button></td>
    </tr>
  `).join('');
}

function getAttendanceClass(status) { switch (status) { case 'Present': return 'bg-green-100 text-green-700'; case 'Absent': return 'bg-red-100 text-red-700'; case 'Leave': return 'bg-yellow-100 text-yellow-700'; default: return 'bg-gray-100 text-gray-700'; } }

function openEditAttendance(id, studentId, date, status) {
  document.getElementById('attendance-id').value = id;
  document.getElementById('attendance-student-id').value = studentId;
  document.getElementById('attendance-date').value = date;
  document.getElementById('attendance-status').value = status;
  openModal('attendance-modal');
}

async function updateAttendance(event) {
  event.preventDefault();
  const data = { student_id: document.getElementById('attendance-student-id').value, date: document.getElementById('attendance-date').value, status: document.getElementById('attendance-status').value };
  try { showLoading(); await apiRequest('/attendance', 'POST', data); showToast('Attendance updated!', 'success'); closeModal('attendance-modal'); loadStudentAttendance(); }
  catch (error) { showToast(error.message, 'error'); }
  finally { hideLoading(); }
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  document.getElementById('login-form').addEventListener('submit', login);
  document.getElementById('student-form').addEventListener('submit', (e) => { const id = document.getElementById('student-id').value; if (id) updateStudent(e); else addStudent(e); });
  document.getElementById('student-modal').addEventListener('transitionend', () => { if (document.getElementById('student-modal').classList.contains('hidden')) { document.getElementById('student-form').reset(); document.getElementById('student-id').value = ''; document.getElementById('student-regno').readOnly = false; document.getElementById('student-modal-title').textContent = 'Add Student'; } });
  document.getElementById('marks-form').addEventListener('submit', addMarks);
  document.getElementById('attendance-form').addEventListener('submit', updateAttendance);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('[id$="-modal"]').forEach(modal => modal.classList.add('hidden')); });
});
