function required(body, fields) {
  const errors = [];
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`El campo '${field}' es obligatorio`);
    }
  }
  return errors;
}

function oneOf(value, allowed, field) {
  if (value !== undefined && value !== null && !allowed.includes(value)) {
    return `El campo '${field}' debe ser uno de: ${allowed.join(', ')}`;
  }
  return null;
}

module.exports = { required, oneOf };
