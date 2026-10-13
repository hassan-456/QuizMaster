import Quiz from "../models/questionSchema.js";
import Results from "../models/resultSchema.js";
import { scoreAttempt } from "../utils/score.js";

const USERNAME_PATTERN = /^[a-zA-Z0-9 _-]{2,20}$/;

function publicQuiz(quiz) {
    return {
        title: quiz.title,
        pointsPerQuestion: quiz.pointsPerQuestion,
        passPercentage: quiz.passPercentage,
        durationSeconds: quiz.durationSeconds,
        totalQuestions: quiz.questions.length,
        questions: quiz.questions.map((item, index) => ({
            id: index + 1,
            question: item.question,
            options: [...item.options]
        }))
    };
}

function presentResult(doc, quiz) {
    const achieved = doc.achieved || doc.achived || 'Failed';
    const storedAnswers = Array.isArray(doc.answers) ? doc.answers : [];
    const breakdown = Array.isArray(quiz?.questions)
        ? quiz.questions.map((question, index) => {
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
        })
        : [];

    return {
        id: doc._id,
        username: doc.username,
        attempts: doc.attempts || 0,
        points: doc.points || 0,
        totalPoints: doc.totalPoints || 0,
        totalQuestions: quiz?.questions?.length || 0,
percentage: doc.percentage || 0,
            passPercentage: quiz?.passPercentage ?? 50,
            achieved,
            createdAt: doc.createdAt,
        breakdown
    };
}

export async function health(req, res) {
    res.status(200).json({ success: true, message: 'QuizMaster API is running' });
}

/** Questions only. Correct answers stay on the server until an attempt is submitted. */
export async function getQuestions(req, res) {
    try {
        const quiz = await Quiz.findOne().sort({ createdAt: -1 });

        if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No questions found. Restart the server so the quiz can be seeded.'
            });
        }

        return res.status(200).json({ success: true, ...publicQuiz(quiz.toObject()) });
    } catch (error) {
        console.error('Failed to fetch questions:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch questions' });
    }
}

export async function getResult(req, res) {
    try {
        const results = await Results.find()
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
        const username = String(req.body?.username || '').trim();
        const submittedAnswers = req.body?.answers;

        if (!USERNAME_PATTERN.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username must be 2–20 characters and use letters, numbers, spaces, _ or -.'
            });
        }

        const quizDoc = await Quiz.findOne().sort({ createdAt: -1 });
        if (!quizDoc) {
            return res.status(404).json({ success: false, message: 'Quiz is not available.' });
        }

        const quiz = quizDoc.toObject();
        const scored = scoreAttempt(quiz.questions, submittedAnswers, {
            pointsPerQuestion: quiz.pointsPerQuestion,
            passPercentage: quiz.passPercentage
        });

        const recent = await Results.findOne({ username }).sort({ createdAt: -1 });
        const sameAttempt = recent
            && Array.isArray(recent.answers)
            && recent.answers.length === scored.answers.length
            && recent.answers.every((answer, index) => answer === scored.answers[index])
            && (Date.now() - new Date(recent.createdAt).getTime()) < 15000;

        const saved = sameAttempt
            ? recent
            : await Results.create({
                username,
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
            result: presentResult(saved, quiz)
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
