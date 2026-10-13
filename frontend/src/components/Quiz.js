import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useParams } from 'react-router-dom';
import Questions from './Questions';
import { useFetchQuestion } from '../hooks/FetchQuestion';
import { moveNextAction, movePrevAction } from '../redux/question_reducer';
import { formatTime } from '../helper/helper';

export default function Quiz() {
    const [warning, setWarning] = useState('');
    const [done, setDone] = useState(false);
    const [now, setNow] = useState(Date.now());
    const dispatch = useDispatch();
    const { testId } = useParams();
    const { isLoading, serverError, retry } = useFetchQuestion(testId);
    const { queue, trace, title, endsAt, testId: storedTestId, pointsPerQuestion, passPercentage } = useSelector(state => state.questions);
    const { result, submitted } = useSelector(state => state.result);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const secondsLeft = typeof endsAt === 'number'
        ? Math.max(0, Math.ceil((endsAt - now) / 1000))
        : null;

    useEffect(() => {
        setDone(false);
    }, [testId]);

    useEffect(() => {
        if (secondsLeft === 0 && queue.length > 0 && storedTestId === testId) setDone(true);
    }, [secondsLeft, queue.length, storedTestId, testId]);

    useEffect(() => {
        setWarning('');
    }, [trace]);

    if (!testId) {
        return <Navigate to="/" replace />;
    }

    if ((submitted && storedTestId === testId) || done) {
        return <Navigate to="/result" replace />;
    }

    function onNext() {
        if (!Number.isInteger(result[trace])) {
            setWarning('Select an option before continuing.');
            return;
        }

        if (trace < queue.length - 1) {
            dispatch(moveNextAction());
            return;
        }

        setDone(true);
    }

    function onPrev() {
        if (trace > 0) dispatch(movePrevAction());
    }

    const answered = result.filter((answer) => Number.isInteger(answer)).length;
    const progress = queue.length ? ((trace + 1) / queue.length) * 100 : 0;
    const onLastQuestion = queue.length > 0 && trace === queue.length - 1;

    return (
        <div className="container">
            <header className="quiz-header">
                <div>
                    <p className="eyebrow">QuizMaster</p>
                    <h1 className="title compact text-light">{title || 'Quiz'}</h1>
                </div>
                {queue.length > 0 && storedTestId === testId && (
                    <div className="quiz-meta">
                        <span>Question {trace + 1} of {queue.length}</span>
                        <span>{pointsPerQuestion} pts · pass {passPercentage}%</span>
                        <span>{answered} answered</span>
                        <span className={secondsLeft !== null && secondsLeft <= 30 ? 'timer danger' : 'timer'} aria-live="polite">
                            {secondsLeft === null ? '--:--' : formatTime(secondsLeft)}
                        </span>
                    </div>
                )}
                {queue.length > 0 && storedTestId === testId && (
                    <div className="progress" aria-hidden="true">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </header>

            {isLoading && <h3 className="text-light">Loading questions...</h3>}

            {!isLoading && serverError && (
                <div className="message-card" role="alert">
                    <p>{serverError}</p>
                    <button className="btn next" type="button" onClick={retry}>Try again</button>
                </div>
            )}

            {!isLoading && !serverError && storedTestId === testId && queue.length > 0 && (
                <>
                    <Questions />
                    {warning && <p className="form-error" role="alert">{warning}</p>}
                    <div className="grid">
                        {trace > 0 ? (
                            <button className="btn prev" type="button" onClick={onPrev}>Prev</button>
                        ) : <div></div>}
                        <button className="btn next" type="button" onClick={onNext}>
                            {onLastQuestion ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
