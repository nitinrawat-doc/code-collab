const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema(
  {
    input: String,
    output: String,
    explanation: String,
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, default: '' }, // empty string is a valid expected output
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const starterCodeSchema = new mongoose.Schema(
  {
    javascript: { type: String, default: '// Write your solution here\n' },
    python: { type: String, default: '# Write your solution here\n' },
    cpp: { type: String, default: '// Write your solution here\n' },
    java: { type: String, default: '// Write your solution here\n' },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true }, // Markdown
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    tags: [{ type: String, lowercase: true }],
    constraints: String,
    examples: [exampleSchema],
    starterCode: { type: starterCodeSchema, default: () => ({}) },
    testCases: [testCaseSchema],
  },
  { timestamps: true }
);

problemSchema.index({ difficulty: 1 });
problemSchema.index({ tags: 1 });

module.exports = mongoose.model('Problem', problemSchema);
