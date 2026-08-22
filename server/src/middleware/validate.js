/**
 * middleware/validate.js
 * Joi-based request body/query/params validation.
 * Usage: validate(schema) where schema is a Joi object schema.
 */
const ApiError = require('../utils/ApiError');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => d.message);
      return next(ApiError.badRequest('Validation failed', errors));
    }

    req[source] = value; // replace with sanitized/coerced value
    next();
  };
};

module.exports = validate;
