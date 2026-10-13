import { combineReducers, configureStore } from '@reduxjs/toolkit';
import questionReducer, { initialQuestionState } from './question_reducer';
import resultReducer, { initialResultState } from './result_reducer';

const STORAGE_KEY = 'quizmaster-session';

function isQuestionList(list) {
    return Array.isArray(list) && list.length > 0 && list.every((item) => (
        item
        && typeof item.question === 'string'
        && Array.isArray(item.options)
        && item.options.length >= 2
    ));
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return undefined;
        const saved = JSON.parse(raw);
        const queue = saved?.questions?.queue;
        const answers = saved?.result?.result;
        const userId = saved?.result?.userId;

        if (typeof userId !== 'string' || !userId.trim() || !isQuestionList(queue)) return undefined;
        if (typeof saved.questions?.testId !== 'string' || !saved.questions.testId) return undefined;
        if (!Array.isArray(answers) || answers.length !== queue.length) return undefined;

        const lastIndex = queue.length - 1;
        const trace = Number.isInteger(saved.questions.trace)
            ? Math.min(Math.max(saved.questions.trace, 0), lastIndex)
            : 0;

        return {
            questions: {
                ...initialQuestionState,
                queue,
                trace,
                testId: saved.questions.testId,
                title: saved.questions.title || initialQuestionState.title,
                pointsPerQuestion: saved.questions.pointsPerQuestion || 10,
                passPercentage: saved.questions.passPercentage || 50,
                durationSeconds: saved.questions.durationSeconds || 300,
                maxAttempts: Number.isInteger(saved.questions.maxAttempts) ? saved.questions.maxAttempts : 1,
                endsAt: typeof saved.questions.endsAt === 'number' ? saved.questions.endsAt : null
            },
            result: {
                ...initialResultState,
                userId: userId.trim(),
                result: answers.map((answer) => (Number.isInteger(answer) ? answer : null)),
                summary: saved.result.summary || null,
                submitted: Boolean(saved.result.submitted && saved.result.summary)
            }
        };
    } catch (error) {
        return undefined;
    }
}

const rootReducer = combineReducers({
    questions: questionReducer,
    result: resultReducer
});

const store = configureStore({
    reducer: rootReducer,
    preloadedState: loadSession()
});

store.subscribe(() => {
    try {
        const state = store.getState();
        if (!state.result.userId) {
            sessionStorage.removeItem(STORAGE_KEY);
            return;
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        // Ignore storage failures so the quiz can still run in memory.
    }
});

export default store;
