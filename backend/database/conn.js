import mongoose from "mongoose";

export default async function connect() {
    const uri = process.env.ATLAS_URI;

    if (!uri) {
        throw new Error('ATLAS_URI is not set.');
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
        dbName: process.env.DB_NAME || 'quizmaster',
        serverSelectionTimeoutMS: 10000
    });

    console.log('Database connected');
}
