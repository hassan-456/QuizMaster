import mongoose from "mongoose";
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
    answer: { type: Number, required: true, min: 0 }
}, { _id: false });

const quizSchema = new Schema({
    version: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    pointsPerQuestion: { type: Number, default: 10 },
    passPercentage: { type: Number, default: 50 },
    durationSeconds: { type: Number, default: 300 },
    questions: {
        type: [questionItemSchema],
        required: true,
        validate: {
            validator: (questions) => Array.isArray(questions) && questions.length > 0,
            message: 'Quiz must include questions.'
        }
    }
}, { timestamps: true });

export default mongoose.model('Question', quizSchema);
