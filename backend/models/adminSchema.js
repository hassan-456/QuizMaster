import mongoose from 'mongoose';
const { Schema } = mongoose;

const adminSchema = new Schema({
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);
