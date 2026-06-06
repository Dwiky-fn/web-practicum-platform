require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const student = require('./api/student');
const execution = require('./api/execution');
const users = require('./api/users');
const admin = require('./api/admin');
const lecturer = require('./api/lecturer');

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// register routes
student(app);
users(app);
admin(app);
lecturer(app);
execution(server);

// test route
app.get('/', (req, res) => {
  res.send('API is running');
});

// start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
