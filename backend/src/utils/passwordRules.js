const strongPasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const strongPasswordMessage =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';

function isStrongPassword(password) {
  return strongPasswordPattern.test(password);
}

module.exports = {
  strongPasswordPattern,
  strongPasswordMessage,
  isStrongPassword,
};
