import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { resetAllAction } from '../redux/question_reducer';
import { resetResultAction, setUserId } from '../redux/result_reducer';
import { getServerData, formatTime } from '../helper/helper';
import '../styles/Main.css';

const USERNAME_PATTERN = /^[a-zA-Z0-9 _-]{2,20}$/;

export default function Main() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [serverError, setServerError] = useState('');
    const [quiz, setQuiz] = useState(null);
    const [status, setStatus] = useState('loading');
    const [reloadKey, setReloadKey] = useState(0);
    const savedName = useSelector(state => state.result.userId);
    const savedQuestions = useSelector(state => state.questions.queue.length);
    const submitted = useSelector(state => state.result.submitted);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        setStatus('loading');
        setServerError('');

        getServerData('/api/questions')
            .then((response) => {
                if (!active) return;
                if (!response?.success || !Array.isArray(response.questions) || response.questions.length === 0) {
                    throw new Error(response?.message || 'Quiz is unavailable.');
                }
                setQuiz(response);
                setStatus('ready');
            })
            .catch((loadError) => {
                if (!active) return;
                setServerError(loadError.message);
                setStatus('error');
            });

        return () => {
            active = false;
        };
    }, [reloadKey]);

    function startQuiz(event) {
        event.preventDefault();
        const name = username.trim();

        if (!USERNAME_PATTERN.test(name)) {
            setError('Enter a username with 2–20 letters, numbers, spaces, _ or -.');
            return;
        }

        if (status !== 'ready') {
            setError('The quiz is not ready yet. Make sure the server is running.');
            return;
        }

        dispatch(resetAllAction());
        dispatch(resetResultAction());
        dispatch(setUserId(name));
        navigate('/quiz');
    }

    const minutes = quiz ? Math.max(1, Math.round(quiz.durationSeconds / 60)) : 5;
    const optionCount = quiz?.questions?.[0]?.options?.length || 4;

    return (
        <div className="container">
            <header className="hero">
                <p className="eyebrow">QuizMaster</p>
                <h1 className="title text-light">{quiz?.title || 'JavaScript Quiz'}</h1>
                <p className="subtitle">Answer each question, review your choices, and see your score at the end.</p>
            </header>

            <ol className="rules">
                <li>You will be asked {quiz?.totalQuestions || 10} questions, one at a time.</li>
                <li>{quiz?.pointsPerQuestion || 10} points are awarded for every correct answer.</li>
                <li>Each question has {optionCount} options. Choose one.</li>
                <li>You can go back and change answers before the timer ends.</li>
                <li>You have {quiz ? formatTime(quiz.durationSeconds) : `${minutes}:00`} ({minutes} minutes). A score of {quiz?.passPercentage || 50}% or higher passes.</li>
            </ol>

            <form id="form" onSubmit={startQuiz}>
                <label className="input-label" htmlFor="username">Username</label>
                <input
                    id="username"
                    className="userid"
                    type="text"
                    placeholder="Enter your name"
                    value={username}
                    autoFocus
                    autoComplete="off"
                    maxLength={20}
                    onChange={(event) => {
                        setUsername(event.target.value);
                        setError('');
                    }}
                />
                {error && <p className="form-error" role="alert">{error}</p>}
                {serverError && (
                    <div className="message-card" role="alert">
                        <p>{serverError}</p>
                        <button className="btn next" type="button" onClick={() => setReloadKey((value) => value + 1)}>
                            Retry connection
                        </button>
                    </div>
                )}
                {savedName && savedQuestions > 0 && !submitted && (
                    <p className="resume">
                        <Link to="/quiz">Continue as {savedName}</Link>
                    </p>
                )}
                {submitted && (
                    <p className="resume">
                        <Link to="/result">View your latest result</Link>
                    </p>
                )}
                <div className="start">
                    <button className="btn" type="submit" disabled={status !== 'ready'}>
                        {status === 'loading' ? 'Loading quiz...' : 'Start Quiz'}
                    </button>
                </div>
            </form>
        </div>
    );
}
