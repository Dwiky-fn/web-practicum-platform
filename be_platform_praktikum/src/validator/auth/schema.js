const {
  LoginPayloadSchema,
  UpdatePasswordPayloadSchema,
} = require('../users/schema');

module.exports = {
  ChangePasswordPayloadSchema: UpdatePasswordPayloadSchema,
  LoginPayloadSchema,
};
