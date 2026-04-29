require('dotenv').config();

const express = require('express');
const cors = require('cors');

const studentProgress = require('./api/studentProgress');
const submissions = require('./api/submissions');
const jobsheet = require('./api/jobsheets');
const judge0 = require('./api/judge0');
const users = require('./api/users');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// register routes
studentProgress(app)
submissions(app);
jobsheet(app);
judge0(app);
users(app);

// test route
app.get('/', (req, res) => {
  res.send('API is running');
});

// start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
