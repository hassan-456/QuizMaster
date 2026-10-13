import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getServerData } from '../helper/helper';
import { startExamAction } from '../redux/question_reducer';
import { initResultAction } from '../redux/result_reducer';

export const useFetchQuestion = () => {
    const dispatch = useDispatch();
    const queueLength = useSelector(state => state.questions.queue.length);
    const [reloadKey, setReloadKey] = useState(0);
    const [state, setState] = useState({
        isLoading: queueLength === 0,
        serverError: null
    });

    useEffect(() => {
        if (queueLength > 0) {
            setState({ isLoading: false, serverError: null });
            return undefined;
        }

        let active = true;

        const load = async () => {
            setState({ isLoading: true, serverError: null });

            try {
                const response = await getServerData('/api/questions');
                const questions = Array.isArray(response?.questions) ? response.questions : [];
                const validQuestions = questions.filter((question) => (
                    question
                    && typeof question.question === 'string'
                    && Array.isArray(question.options)
                    && question.options.length >= 2
                ));

                if (!response?.success || validQuestions.length === 0) {
                    throw new Error(response?.message || 'No questions are available.');
                }

                if (!active) return;

                dispatch(startExamAction({
                    question: validQuestions,
                    title: response.title,
                    pointsPerQuestion: response.pointsPerQuestion,
                    passPercentage: response.passPercentage,
                    durationSeconds: response.durationSeconds
                }));
                dispatch(initResultAction(validQuestions.length));
                setState({ isLoading: false, serverError: null });
            } catch (error) {
                if (!active) return;
                setState({
                    isLoading: false,
                    serverError: error.message || 'Unable to load questions.'
                });
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [dispatch, queueLength, reloadKey]);

    return {
        isLoading: state.isLoading,
        serverError: state.serverError,
        retry: () => setReloadKey((key) => key + 1)
    };
};
