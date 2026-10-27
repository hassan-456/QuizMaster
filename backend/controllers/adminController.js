import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Admin from '../models/adminSchema.js';
import Test from '../models/testSchema.js';
import Results from '../models/resultSchema.js';
import { signAdmin } from '../utils/token.js';
import { normalizeTest } from '../utils/testInput.js';

function summarize(test) {
    return {
        id: test._id,
        title: test.title,
        description: test.description || '',
        isPublished: Boolean(test.isPublished),
        totalQuestions: test.questions?.length || 0,
        pointsPerQuestion: test.pointsPerQuestion,
        passPercentage: test.passPercentage,
        durationSeconds: test.durationSeconds,
        durationMinutes: Math.round((test.durationSeconds || 0) / 60),
        maxAttempts: test.maxAttempts || 0,
        updatedAt: test.updatedAt
    };
}

export function presentTest(test) {
    const plain = typeof test.toObject === 'function' ? test.toObject() : test;
    return {
        ...summarize(plain),
        questions: (plain.questions || []).map((question) => ({
            question: question.question,
            options: [...question.options],
            answer: question.answer,
            category: question.category || '',
            difficulty: question.difficulty || ''
        }))
    };
}

export function sendError(res, error) {
    const status = error.status || (error.name === 'ValidationError' ? 400 : 500);
    if (status >= 500) console.error('Admin request failed:', error.message);
    return res.status(status).json({
        success: false,
        message: status >= 500 ? 'Admin request failed' : error.message
    });
}

export async function login(req, res) {
    try {
        const username = String(req.body?.username || '').trim();
        const password = String(req.body?.password || '');
        const admin = await Admin.findOne({ username });
        const matches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;

        if (!admin || !matches) {
            return res.status(401).json({ success: false, message: 'Incorrect admin username or password.' });
        }

        return res.status(200).json({
            success: true,
            token: signAdmin(admin),
            admin: { username: admin.username }
        });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function me(req, res) {
    res.status(200).json({ success: true, admin: { username: req.admin.username } });
}

export async function listTests(req, res) {
    try {
        const tests = await Test.find().sort({ updatedAt: -1 }).lean();
        return res.status(200).json({ success: true, tests: tests.map(summarize) });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function getTest(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Test not found.' });
        }
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });
        return res.status(200).json({ success: true, test: presentTest(test) });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function createTest(req, res) {
    try {
        const created = await Test.create(normalizeTest(req.body));
        return res.status(201).json({ success: true, test: presentTest(created) });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function updateTest(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Test not found.' });
        }
        const updated = await Test.findByIdAndUpdate(
            req.params.id,
            normalizeTest(req.body),
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Test not found.' });
        return res.status(200).json({ success: true, test: presentTest(updated) });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function deleteTest(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Test not found.' });
        }
        const deleted = await Test.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Test not found.' });
        await Results.deleteMany({ test: deleted._id });
        return res.status(200).json({ success: true, message: 'Test deleted.' });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function testResults(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Test not found.' });
        }
        const test = await Test.findById(req.params.id).lean();
        if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

        const results = await Results.find({ test: test._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            success: true,
            test: summarize(test),
            results: results.map((item) => ({
                id: item._id,
                username: item.username,
                attempts: item.attempts || 0,
                points: item.points || 0,
                totalPoints: item.totalPoints || 0,
                percentage: item.percentage || 0,
                achieved: item.achieved || '',
                createdAt: item.createdAt
            }))
        });
    } catch (error) {
        return sendError(res, error);
    }
}
