require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const student = require('./api/student');
const execution = require('./api/execution');
const users = require('./api/users');
const admin = require('./api/admin');
const lecturer = require('./api/lecturer');
const departments = require('./api/departments');
const errorHandler = require('./middlewares/errorHandler');
const {
  requireAuth,
  requireRoles,
} = require('./middlewares/auth');

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// register routes
app.use('/admin', requireAuth);
app.use('/lecturer', requireAuth);
app.use('/students', requireAuth, requireRoles('MAHASISWA', 'ADMIN'));
app.use('/student-progress', requireAuth, requireRoles('MAHASISWA'));
app.use('/courses', requireAuth, requireRoles('MAHASISWA', 'DOSEN', 'ADMIN'));
app.use('/users', requireAuth);
app.use('/departments', requireAuth);

student(app);
users(app);
admin(app);
lecturer(app);
departments(app);
execution(server);

// test route
app.get('/', (req, res) => {
  res.send('API is running');
});

app.use(errorHandler);

// start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
