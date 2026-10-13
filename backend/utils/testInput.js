function fail(message) {
    const error = new Error(message);
    error.status = 400;
    throw error;
}

function normalizeQuestion(item, index) {
    const question = String(item?.question || '').trim();
    const rawOptions = Array.isArray(item?.options) ? item.options : [];
    const selectedAnswer = Number(item?.answer);
    const options = [];
    let answer = -1;

    rawOptions.forEach((option, optionIndex) => {
        const text = String(option || '').trim();
        if (!text) return;
        if (optionIndex === selectedAnswer) answer = options.length;
        options.push(text);
    });

    if (question.length < 3 || question.length > 500) {
        fail(`Question ${index + 1} must be 3–500 characters.`);
    }
    if (options.length < 2 || options.length > 6) {
        fail(`Question ${index + 1} needs 2–6 options.`);
    }
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
        fail(`Question ${index + 1} has duplicate options.`);
    }
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        fail(`Question ${index + 1} needs a correct option selected.`);
    }

    return { question, options, answer };
}

/** Turn an admin form into a test document. Restrictions are stored with the test. */
export function normalizeTest(body) {
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const pointsPerQuestion = Number(body?.pointsPerQuestion);
    const passPercentage = Number(body?.passPercentage);
    const durationMinutes = Number(body?.durationMinutes);
    const maxAttempts = Number(body?.maxAttempts);
    const questions = Array.isArray(body?.questions) ? body.questions : [];

    if (title.length < 3 || title.length > 80) fail('Title must be 3–80 characters.');
    if (description.length > 400) fail('Description must be 400 characters or less.');
    if (!Number.isInteger(pointsPerQuestion) || pointsPerQuestion < 1 || pointsPerQuestion > 100) {
        fail('Points per correct answer must be a whole number from 1 to 100.');
    }
    if (!Number.isInteger(passPercentage) || passPercentage < 1 || passPercentage > 100) {
        fail('Pass percentage must be a whole number from 1 to 100.');
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
        fail('Time limit must be 1–180 minutes.');
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 20) {
        fail('Max attempts must be 0 (unlimited) or a whole number from 1 to 20.');
    }
    if (questions.length < 1 || questions.length > 40) {
        fail('Add between 1 and 40 questions.');
    }

    return {
        title,
        description,
        pointsPerQuestion,
        passPercentage,
        durationSeconds: durationMinutes * 60,
        maxAttempts,
        isPublished: Boolean(body?.isPublished),
        questions: questions.map(normalizeQuestion)
    };
}
