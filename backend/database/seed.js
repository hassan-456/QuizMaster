import bcrypt from 'bcryptjs';
import Admin from '../models/adminSchema.js';
import Test from '../models/testSchema.js';
import quiz from './data.js';

async function ensureAdmin() {
    const username = String(process.env.ADMIN_USERNAME || 'admin').trim();
    const password = String(process.env.ADMIN_PASSWORD || 'admin123');
    const existing = await Admin.findOne({ username });

    if (existing) {
        console.log(`Admin ready (${username})`);
        return existing;
    }

    const created = await Admin.create({
        username,
        passwordHash: await bcrypt.hash(password, 10)
    });
    console.log(`Admin account created (${username})`);
    return created;
}

async function ensureSampleTest() {
    const count = await Test.countDocuments();
    if (count > 0) {
        console.log(`${count} test${count === 1 ? '' : 's'} ready`);
        return;
    }

    quiz.questions.forEach((item) => {
        if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length) {
            throw new Error(`Invalid answer index for: ${item.question}`);
        }
    });

    await Test.create({
        title: quiz.title,
        description: 'Starter JavaScript test. Change the questions and rules from the admin panel.',
        pointsPerQuestion: quiz.pointsPerQuestion,
        passPercentage: quiz.passPercentage,
        durationSeconds: quiz.durationSeconds,
        maxAttempts: 3,
        isPublished: true,
        questions: quiz.questions
    });
    console.log('Sample test created');
}

export default async function ensureQuiz() {
    await ensureAdmin();
    await ensureSampleTest();
}
