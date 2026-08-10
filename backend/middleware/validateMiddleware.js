const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => `${e.param || e.path || 'field'}: ${e.msg}`).join(', ');
    return res.status(400).json({
      success: false,
      message: errorMessages || 'Invalid payload input fields',
      errors: errors.array()
    });
  }
  next();
};

module.exports = validateRequest;
