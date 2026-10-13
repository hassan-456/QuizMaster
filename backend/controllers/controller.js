import mongoose from 'mongoose';
import Test from '../models/testSchema.js';
import Results from '../models/resultSchema.js';
import { scoreAttempt } from '../utils/score.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9 _-]{2,20}$/;

function publicQuestion(item, index) {
    return {
        id: index + 1,
        question: item.question,
        options: [...item.options]
    };
}

function summarizeTest(test, attemptsUsed = 0) {
    const maxAttempts = test.maxAttempts || 0;
    const attemptsRemaining = maxAttempts === 0 ? null : Math.max(0, maxAttempts - attemptsUsed);

    return {
        id: test._id,
        title: test.title,
        description: test.description || '',
        pointsPerQuestion: test.pointsPerQuestion,
        passPercentage: test.passPercentage,
        durationSeconds: test.durationSeconds,
        durationMinutes: Math.round(test.durationSeconds / 60),
        maxAttempts,
        totalQuestions: test.questions.length,
        attemptsUsed,
        attemptsRemaining,
        canStart: maxAttempts === 0 || attemptsUsed < maxAttempts
    };
}

function presentResult(doc, test) {
    const storedAnswers = Array.isArray(doc.answers) ? doc.answers : [];
    const breakdown = test.questions.map((question, index) => {
        const selected = storedAnswers[index];
        const answered = Number.isInteger(selected) && selected >= 0;
        return {
            id: index + 1,
            question: question.question,
            options: [...question.options],
            selectedIndex: answered ? selected : null,
            correctIndex: question.answer,
            isCorrect: answered && selected === question.answer
        };
    });

    return {
        id: doc._id,
        testId: test._id,
        title: test.title,
        username: doc.username,
        attempts: doc.attempts || 0,
        points: doc.points || 0,
        totalPoints: doc.totalPoints || 0,
        totalQuestions: test.questions.length,
        percentage: doc.percentage || 0,
        passPercentage: test.passPercentage,
        maxAttempts: test.maxAttempts || 0,
        achieved: doc.achieved || doc.achived || 'Failed',
        createdAt: doc.createdAt,
        breakdown
    };
}

async function attemptCounts(username, testIds) {
    if (!username || testIds.length === 0) return new Map();
    const rows = await Results.aggregate([
        { $match: { username, test: { $in: testIds } } },
        { $group: { _id: '$test', count: { $sum: 1 } } }
    ]);
    return new Map(rows.map((row) => [String(row._id), row.count]));
}

function cleanUsername(value) {
    const username = String(value || '').trim();
    return USERNAME_PATTERN.test(username) ? username : '';
}

export async function health(req, res) {
    res.status(200).json({ success: true, message: 'QuizMaster API is running' });
}

export async function listTests(req, res) {
    try {
        const username = cleanUsername(req.query.username);
        const tests = await Test.find({ isPublished: true })
            .sort({ createdAt: -1 })
            .lean();
        const visible = tests.filter((test) => Array.isArray(test.questions) && test.questions.length > 0);
        const counts = await attemptCounts(username, visible.map((test) => test._id));

        return res.status(200).json({
            success: true,
            tests: visible.map((test) => summarizeTest(test, counts.get(String(test._id)) || 0))
        });
    } catch (error) {
        console.error('Failed to list tests:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to load tests' });
    }
}

export async function getTestQuestions(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Test not found.' });
        }

        const test = await Test.findById(req.params.id).lean();
        if (!test || !test.isPublished || !Array.isArray(test.questions) || test.questions.length === 0) {
            return res.status(404).json({ success: false, message: 'This test is not available.' });
        }

        const username = cleanUsername(req.query.username);
        const attemptsUsed = username
            ? await Results.countDocuments({ username, test: test._id })
            : 0;
        const summary = summarizeTest(test, attemptsUsed);

        if (!summary.canStart) {
            return res.status(403).json({
                success: false,
                message: 'You have used every attempt allowed for this test.'
            });
        }

        return res.status(200).json({
            success: true,
            ...summary,
            questions: test.questions.map(publicQuestion)
        });
    } catch (error) {
        console.error('Failed to fetch test:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to load this test' });
    }
}

export async function getResult(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.query.testId)) {
            return res.status(400).json({ success: false, message: 'Choose a test to see scores.' });
        }

        const results = await Results.find({ test: req.query.testId })
            .select('username attempts points totalPoints percentage achieved achived createdAt')
            .sort({ points: -1, percentage: -1, createdAt: 1 })
            .limit(20)
            .lean();

        return res.status(200).json({
            success: true,
            results: results.map((item) => ({
                id: item._id,
                username: item.username,
                attempts: item.attempts || 0,
                points: item.points || 0,
                totalPoints: item.totalPoints || 0,
                percentage: item.percentage || 0,
                achieved: item.achieved || item.achived || '',
                createdAt: item.createdAt
            }))
        });
    } catch (error) {
        console.error('Failed to fetch results:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch results' });
    }
}

export async function storeResult(req, res) {
    try {
        const username = cleanUsername(req.body?.username);
        const testId = req.body?.testId;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username must be 2–20 characters and use letters, numbers, spaces, _ or -.'
            });
        }
        if (!mongoose.isValidObjectId(testId)) {
            return res.status(404).json({ success: false, message: 'Test not found.' });
        }

        const test = await Test.findById(testId);
        if (!test || !test.isPublished) {
            return res.status(404).json({ success: false, message: 'This test is not available.' });
        }

        const scored = scoreAttempt(test.questions, req.body?.answers, {
            pointsPerQuestion: test.pointsPerQuestion,
            passPercentage: test.passPercentage
        });

        const recent = await Results.findOne({ username, test: test._id }).sort({ createdAt: -1 });
        const sameAttempt = recent
            && Array.isArray(recent.answers)
            && recent.answers.length === scored.answers.length
            && recent.answers.every((answer, index) => answer === scored.answers[index])
            && (Date.now() - new Date(recent.createdAt).getTime()) < 15000;

        if (!sameAttempt && test.maxAttempts > 0) {
            const used = await Results.countDocuments({ username, test: test._id });
            if (used >= test.maxAttempts) {
                return res.status(403).json({
                    success: false,
                    message: 'You have used every attempt allowed for this test.'
                });
            }
        }

        const saved = sameAttempt
            ? recent
            : await Results.create({
                username,
                test: test._id,
                answers: scored.answers,
                attempts: scored.attempts,
                points: scored.points,
                totalPoints: scored.totalPoints,
                percentage: scored.percentage,
                achieved: scored.achieved
            });

        return res.status(sameAttempt ? 200 : 201).json({
            success: true,
            message: sameAttempt ? 'Result already saved.' : 'Result saved.',
            result: presentResult(saved, test)
        });
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error('Failed to save result:', error.message);
        return res.status(status).json({
            success: false,
            message: status >= 500 ? 'Failed to save result' : error.message
        });
    }
}
