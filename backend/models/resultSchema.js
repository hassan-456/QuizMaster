import mongoose from "mongoose";
const { Schema } = mongoose;

const resultSchema = new Schema({
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 20 },
    answers: { type: [Number], default: [] },
    attempts: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    achieved: { type: String, enum: ['Passed', 'Failed'], default: 'Failed' }
}, { timestamps: true });

resultSchema.index({ points: -1, percentage: -1, createdAt: 1 });

export default mongoose.model('result', resultSchema);
