const autoBind = require('auto-bind');
const { NotFoundError } = require('../../../exceptions');

class CoursesHandler {
  constructor(service) {
    this._service = service;

    autoBind(this);
  }

  async getAllCoursesHandler(req, res, next) {
    try {
      const courses = await this._service.getAllCourses();

      return res.status(200).json({
        status: 'success',
        data: {
          courses,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getCoursesByStudentIdHandler(req, res, next) {
    try {
      const { studentId } = req.params;
      const { scope } = req.query;

      const courses = await this._service.getCoursesByStudentId(studentId, { scope });

      return res.status(200).json({
        status: 'success',
        data: {
          courses,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getCourseByIdHandler(req, res, next) {
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
        return next(new NotFoundError('Course tidak ditemukan'));
      }

      return next(error);
    }
  }
}

module.exports = CoursesHandler;
