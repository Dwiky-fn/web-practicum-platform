require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const studentProgress = require('./api/studentProgress');
const submissions = require('./api/submissions');
const jobsheet = require('./api/jobsheets');
const courses = require('./api/courses');
const execution = require('./api/execution');
const users = require('./api/users');

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json());

// register routes
studentProgress(app);
submissions(app);
jobsheet(app);
courses(app);
users(app);
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
