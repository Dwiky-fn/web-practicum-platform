const InvariantError = require('../exceptions/InvariantError');

function validateWithSchema(schema, payload, options = {}) {
  const validationResult = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
    ...options,
  });

  if (validationResult.error) {
    throw new InvariantError(
      validationResult.error.details.map((detail) => detail.message).join(', '),
    );
  }

  return validationResult.value;
}

module.exports = {
  validateWithSchema,
};
