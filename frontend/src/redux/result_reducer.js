import { createSlice } from '@reduxjs/toolkit';

export const initialResultState = {
    userId: null,
    result: [],
    summary: null,
    submitted: false
};

export const resultReducer = createSlice({
    name: 'result',
    initialState: initialResultState,
    reducers: {
        setUserId: (state, action) => {
            state.userId = action.payload;
        },
        initResultAction: (state, action) => {
            const length = action.payload;
            if (Array.isArray(state.result) && state.result.length === length) return;
            state.result = Array(length).fill(null);
        },
        setAnswerAction: (state, action) => {
            const { trace, checked } = action.payload;
            if (!Number.isInteger(trace) || trace < 0 || trace >= state.result.length) return;
            if (!Number.isInteger(checked)) return;
            state.result[trace] = checked;
        },
        setSummaryAction: (state, action) => {
            state.summary = action.payload;
            state.submitted = true;
        },
        clearAttemptAction: (state) => {
            state.result = [];
            state.summary = null;
            state.submitted = false;
        },
        resetResultAction: () => initialResultState
    }
});

export const {
    setUserId,
    initResultAction,
    setAnswerAction,
    setSummaryAction,
    clearAttemptAction,
    resetResultAction
} = resultReducer.actions;

export default resultReducer.reducer;
