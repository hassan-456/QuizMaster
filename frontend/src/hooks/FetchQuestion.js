import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getServerData } from '../helper/helper';
import { startExamAction } from '../redux/question_reducer';
import { clearAttemptAction, initResultAction } from '../redux/result_reducer';

export const useFetchQuestion = (testId) => {
    const dispatch = useDispatch();
    const queueLength = useSelector(state => state.questions.queue.length);
    const storedTestId = useSelector(state => state.questions.testId);
    const userId = useSelector(state => state.result.userId);
    const ready = queueLength > 0 && storedTestId === testId;
    const [reloadKey, setReloadKey] = useState(0);
    const [state, setState] = useState({
        isLoading: !ready,
        serverError: null
    });

    useEffect(() => {
        if (!testId) return undefined;
        if (ready) {
            setState({ isLoading: false, serverError: null });
            return undefined;
        }

        let active = true;

        const load = async () => {
            setState({ isLoading: true, serverError: null });

            try {
                const username = encodeURIComponent(userId || '');
                const response = await getServerData(`/api/tests/${testId}?username=${username}`);
                const questions = Array.isArray(response?.questions) ? response.questions : [];
                const validQuestions = questions.filter((question) => (
                    question
                    && typeof question.question === 'string'
                    && Array.isArray(question.options)
                    && question.options.length >= 2
                ));

                if (!response?.success || validQuestions.length === 0) {
                    throw new Error(response?.message || 'This test is not available.');
                }

                if (!active) return;

                if (storedTestId && storedTestId !== testId) {
                    dispatch(clearAttemptAction());
                }

                dispatch(startExamAction({
                    question: validQuestions,
                    testId,
                    title: response.title,
                    pointsPerQuestion: response.pointsPerQuestion,
                    passPercentage: response.passPercentage,
                    durationSeconds: response.durationSeconds,
                    maxAttempts: response.maxAttempts
                }));
                dispatch(initResultAction(validQuestions.length));
                setState({ isLoading: false, serverError: null });
            } catch (error) {
                if (!active) return;
                setState({
                    isLoading: false,
                    serverError: error.message || 'Unable to load this test.'
                });
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [dispatch, queueLength, ready, reloadKey, storedTestId, testId, userId]);

    return {
        isLoading: state.isLoading,
        serverError: state.serverError,
        retry: () => setReloadKey((key) => key + 1)
    };
};
