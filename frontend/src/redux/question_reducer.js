import { createSlice } from '@reduxjs/toolkit';

export const initialQuestionState = {
    queue: [],
    trace: 0,
    testId: null,
    title: 'Quiz',
    pointsPerQuestion: 10,
    passPercentage: 50,
    durationSeconds: 300,
    maxAttempts: 1,
    endsAt: null
};

export const questionReducer = createSlice({
    name: 'questions',
    initialState: initialQuestionState,
    reducers: {
        startExamAction: (state, action) => {
            const {
                question,
                testId,
                title,
                pointsPerQuestion,
                passPercentage,
                durationSeconds,
                maxAttempts
            } = action.payload;
            const duration = Number(durationSeconds) || 300;

            return {
                ...state,
                queue: Array.isArray(question) ? question : [],
                testId: testId || null,
                title: title || 'Quiz',
                pointsPerQuestion: pointsPerQuestion || 10,
                passPercentage: passPercentage || 50,
                durationSeconds: duration,
                maxAttempts: Number.isInteger(maxAttempts) ? maxAttempts : 1,
                trace: 0,
                endsAt: Date.now() + duration * 1000
            };
        },
        moveNextAction: (state) => {
            if (state.trace < state.queue.length - 1) {
                state.trace += 1;
            }
        },
        movePrevAction: (state) => {
            if (state.trace > 0) {
                state.trace -= 1;
            }
        },
        resetAllAction: () => initialQuestionState
    }
});

export const {
    startExamAction,
    moveNextAction,
    movePrevAction,
    resetAllAction
} = questionReducer.actions;

export default questionReducer.reducer;
