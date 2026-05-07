const autoBind = require('auto-bind');

class CoursesHandler {
  constructor(service) {
    this._service = service;

    autoBind(this);
  }

  async getAllCoursesHandler(req, res) {
    try {
      const courses = await this._service.getAllCourses();

      return res.status(200).json({
        status: 'success',
        data: {
          courses,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }

  async getCourseByIdHandler(req, res) {
    try {
      const { id } = req.params;

      const course = await this._service.getCourseById(id);

      return res.status(200).json({
        status: 'success',
        data: {
          course,
        },
      });
    } catch (error) {
      if (error.message === 'COURSE_NOT_FOUND') {
        return res.status(404).json({
          status: 'fail',
          message: 'Course tidak ditemukan',
        });
      }

      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }
}

module.exports = CoursesHandler;
