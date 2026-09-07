function buildFullName(first, second) {
  if (!second || !second.trim()) return first || '';
  return `${first} ${second}`.trim();
}

module.exports = { buildFullName };
