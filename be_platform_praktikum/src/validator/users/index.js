const { validateWithSchema } = require('../utils');
const {
  GoogleLoginPayloadSchema,
  LoginPayloadSchema,
  PasswordResetRequestPayloadSchema,
  ResetForgottenPasswordPayloadSchema,
  UpdateEmailRequestPayloadSchema,
  UpdatePasswordPayloadSchema,
  UpdateUserPayloadSchema,
  UploadAvatarPayloadSchema,
  VerifyCurrentPasswordPayloadSchema,
  VerifyEmailOtpPayloadSchema,
  VerifyPasswordResetOtpPayloadSchema,
} = require('./schema');

const UsersValidator = {
  validateLoginPayload: (payload) => validateWithSchema(LoginPayloadSchema, payload),
  validateGoogleLoginPayload: (payload) => validateWithSchema(GoogleLoginPayloadSchema, payload),
  validatePasswordResetRequestPayload: (payload) =>
    validateWithSchema(PasswordResetRequestPayloadSchema, payload),
  validateVerifyPasswordResetOtpPayload: (payload) =>
    validateWithSchema(VerifyPasswordResetOtpPayloadSchema, payload),
  validateResetForgottenPasswordPayload: (payload) =>
    validateWithSchema(ResetForgottenPasswordPayloadSchema, payload),
  validateUpdateUserPayload: (payload) => validateWithSchema(UpdateUserPayloadSchema, payload),
  validateVerifyCurrentPasswordPayload: (payload) =>
    validateWithSchema(VerifyCurrentPasswordPayloadSchema, payload),
  validateUpdateEmailRequestPayload: (payload) =>
    validateWithSchema(UpdateEmailRequestPayloadSchema, payload),
  validateVerifyEmailOtpPayload: (payload) =>
    validateWithSchema(VerifyEmailOtpPayloadSchema, payload),
  validateUpdatePasswordPayload: (payload) =>
    validateWithSchema(UpdatePasswordPayloadSchema, payload),
  validateUploadAvatarPayload: (payload) =>
    validateWithSchema(UploadAvatarPayloadSchema, payload),
};

module.exports = UsersValidator;
