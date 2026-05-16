const { mongoose } = require('../config/db');
const { getNextSequence } = require('./counterModel');

const userSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    reset_token: {
      type: String,
      default: null,
      index: true,
    },
    reset_token_expiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    versionKey: false,
  },
);

userSchema.pre('save', async function assignNumericId(next) {
  if (!this.id) {
    this.id = await getNextSequence('users');
  }

  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

function mapUser(document, { includePassword = false } = {}) {
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    name: document.name,
    email: document.email,
    ...(includePassword ? { password: document.password } : {}),
    role: document.role,
    created_at: document.createdAt,
    reset_token: document.reset_token,
    reset_token_expiry: document.reset_token_expiry,
    has_password: document.password ? 1 : 0,
  };
}

async function createUser({ name, email, password, role = 'user' }) {
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
  });

  return findById(user.id);
}

async function findByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean(false);
  return mapUser(user, { includePassword: true });
}

async function findById(id) {
  const user = await User.findOne({ id: Number(id) }).lean(false);
  return mapUser(user);
}

async function findDocumentById(id) {
  return User.findOne({ id: Number(id) });
}

async function updatePasswordById(id, password) {
  const user = await User.findOneAndUpdate(
    { id: Number(id) },
    {
      $set: {
        password,
        reset_token: null,
        reset_token_expiry: null,
      },
    },
    { new: true },
  );

  return mapUser(user);
}

async function updatePasswordByEmail(email, password) {
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        password,
        reset_token: null,
        reset_token_expiry: null,
      },
    },
    { new: true },
  );

  return mapUser(user, { includePassword: true });
}

async function saveResetToken(userId, resetToken, resetTokenExpiry) {
  await User.updateOne(
    { id: Number(userId) },
    {
      $set: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
      },
    },
  );
}

async function clearResetToken(userId) {
  await User.updateOne(
    { id: Number(userId) },
    {
      $set: {
        reset_token: null,
        reset_token_expiry: null,
      },
    },
  );
}

async function findByResetToken(resetToken) {
  const user = await User.findOne({
    reset_token: resetToken,
    reset_token_expiry: { $gt: new Date() },
  });

  return mapUser(user, { includePassword: true });
}

module.exports = {
  User,
  createUser,
  findByEmail,
  findById,
  findDocumentById,
  updatePasswordById,
  updatePasswordByEmail,
  saveResetToken,
  clearResetToken,
  findByResetToken,
};
