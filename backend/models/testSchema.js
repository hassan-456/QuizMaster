import mongoose from 'mongoose';
const { Schema } = mongoose;

const questionItemSchema = new Schema({
    question: { type: String, required: true, trim: true },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: (options) => Array.isArray(options) && options.length >= 2,
            message: 'Each question needs at least two options.'
        }
    },
    answer: { type: Number, required: true, min: 0 },
    category: { type: String, default: '', trim: true },
    difficulty: { type: String, default: '', trim: true }
}, { _id: false });

const testSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    pointsPerQuestion: { type: Number, required: true, min: 1 },
    passPercentage: { type: Number, required: true, min: 1, max: 100 },
    durationSeconds: { type: Number, required: true, min: 60 },
    maxAttempts: { type: Number, required: true, min: 0, default: 1 },
    isPublished: { type: Boolean, default: false },
    questions: {
        type: [questionItemSchema],
        required: true,
        validate: {
            validator: (questions) => Array.isArray(questions) && questions.length > 0,
            message: 'A test needs at least one question.'
        }
    }
}, { timestamps: true });

export default mongoose.model('Test', testSchema);
