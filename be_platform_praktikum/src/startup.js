const student = require('./api/student');
const execution = require('./api/execution');
const users = require('./api/users');
const admin = require('./api/admin');
const lecturer = require('./api/lecturer');
const departments = require('./api/departments');

function mountRouteGuards(app, { requireAuth, requireRoles }) {
  app.use('/admin', requireAuth);
  app.use('/lecturer', requireAuth);
  app.use('/students', requireAuth, requireRoles('MAHASISWA', 'ADMIN'));
  app.use('/student', requireAuth, requireRoles('MAHASISWA'));
  app.use('/student-progress', requireAuth, requireRoles('MAHASISWA'));
  app.use('/courses', requireAuth, requireRoles('MAHASISWA', 'DOSEN', 'ADMIN'));
  app.use('/users', requireAuth);
  app.use('/departments', requireAuth, requireRoles('ADMIN', 'DOSEN'));
  app.use('/tahun-semester', requireAuth);
  app.use('/kurikulum', requireAuth);
  app.use('/semester', requireAuth);
  app.use('/kelas', requireAuth);
  app.use('/mata-kuliah', requireAuth);
  app.use('/kelas-mahasiswa', requireAuth);
  app.use('/kelas-praktikum', requireAuth);
  app.use('/pengampu', requireAuth);
}

function mountAppRoutes({ app, server }) {
  student(app);
  users(app);
  admin(app);
  lecturer(app);
  departments(app);
  execution(server);
}

module.exports = {
  mountRouteGuards,
  mountAppRoutes,
};
