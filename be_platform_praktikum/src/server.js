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
const DeadlineScheduler = require('./services/deadline/DeadlineScheduler');
const { requireAuth, requireRoles } = require('./middlewares/auth');
const { mountRouteGuards, mountAppRoutes } = require('./startup');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

mountRouteGuards(app, { requireAuth, requireRoles });
mountAppRoutes({ app, server });

app.use('/api/internal', require('./api/internal/aiCallback'));
app.get('/', (req, res) => {
  res.send('API is running');
});
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  DeadlineScheduler.start();
});
