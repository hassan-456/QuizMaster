/** Score a submitted attempt on the server so the client cannot invent a result. */
export function scoreAttempt(questions, rawAnswers, { pointsPerQuestion = 10, passPercentage = 50 } = {}) {
    if (!Array.isArray(questions) || questions.length === 0) {
        const error = new Error('Quiz has no questions.');
        error.status = 500;
        throw error;
    }

    if (!Array.isArray(rawAnswers) || rawAnswers.length !== questions.length) {
        const error = new Error('Submit one answer slot for every question.');
        error.status = 400;
        throw error;
    }

    const answers = rawAnswers.map((choice, index) => {
        if (choice === null || choice === undefined || choice === '') return -1;
        const numeric = Number(choice);
        const optionCount = questions[index].options.length;
        if (!Number.isInteger(numeric) || numeric < 0 || numeric >= optionCount) return -1;
        return numeric;
    });

    let attempts = 0;
    let points = 0;

    const breakdown = questions.map((question, index) => {
        const selectedIndex = answers[index];
        const answered = selectedIndex >= 0;
        const isCorrect = answered && selectedIndex === question.answer;
        if (answered) attempts += 1;
        if (isCorrect) points += pointsPerQuestion;

        return {
            id: index + 1,
            question: question.question,
            options: question.options,
            selectedIndex: answered ? selectedIndex : null,
            correctIndex: question.answer,
            isCorrect
        };
    });

    const totalPoints = questions.length * pointsPerQuestion;
    const percentage = totalPoints === 0 ? 0 : Math.round((points / totalPoints) * 100);
    const passed = percentage >= passPercentage;

    return {
        answers,
        attempts,
        points,
        totalPoints,
        totalQuestions: questions.length,
        percentage,
        achieved: passed ? 'Passed' : 'Failed',
        passed,
        breakdown
    };
}
