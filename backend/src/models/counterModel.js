const { mongoose } = require('../config/db');

const counterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
  },
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return counter.value;
}

module.exports = {
  Counter,
  getNextSequence,
};
