import Quiz from '../models/questionSchema.js';
import quiz from './data.js';

function isValidQuiz(doc) {
    return doc
        && doc.version === quiz.version
        && Array.isArray(doc.questions)
        && doc.questions.length === quiz.questions.length
        && doc.questions.every((item, index) => (
            typeof item.question === 'string'
            && Array.isArray(item.options)
            && item.options.length >= 2
            && item.answer === quiz.questions[index].answer
        ));
}

/** Replace a missing or outdated quiz with the bundled question set. */
export default async function ensureQuiz() {
    quiz.questions.forEach((item) => {
        if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length) {
            throw new Error(`Invalid answer index for: ${item.question}`);
        }
    });

    const existing = await Quiz.findOne().sort({ createdAt: -1 });

    if (isValidQuiz(existing)) {
        console.log(`Quiz ready (${existing.questions.length} questions)`);
        return existing;
    }

    await Quiz.deleteMany();
    const created = await Quiz.create(quiz);
    console.log(`Quiz seeded (${created.questions.length} questions)`);
    return created;
}
