const { validateWithSchema } = require('../utils');
const {
  ChangePasswordPayloadSchema,
  LoginPayloadSchema,
} = require('./schema');

const AuthValidator = {
  validateLoginPayload: (payload) => validateWithSchema(LoginPayloadSchema, payload),
  validateChangePasswordPayload: (payload) =>
    validateWithSchema(ChangePasswordPayloadSchema, payload),
};

module.exports = AuthValidator;
