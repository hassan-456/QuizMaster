import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { resetAllAction } from '../redux/question_reducer';
import { resetResultAction, setUserId } from '../redux/result_reducer';
import { formatTime, getServerData } from '../helper/helper';
import '../styles/Main.css';

const USERNAME_PATTERN = /^[a-zA-Z0-9 _-]{2,20}$/;

function attemptText(test) {
    if (!test.maxAttempts) return 'Unlimited attempts';
    if (test.attemptsUsed) return `${Math.max(0, test.attemptsRemaining)} of ${test.maxAttempts} attempts left`;
    return `${test.maxAttempts} attempt${test.maxAttempts === 1 ? '' : 's'} allowed`;
}

export default function Main() {
    const savedName = useSelector(state => state.result.userId);
    const savedTestId = useSelector(state => state.questions.testId);
    const [username, setUsername] = useState(savedName || '');
    const [error, setError] = useState('');
    const [serverError, setServerError] = useState('');
    const [tests, setTests] = useState([]);
    const [status, setStatus] = useState('loading');
    const [reloadKey, setReloadKey] = useState(0);
    const savedQuestions = useSelector(state => state.questions.queue.length);
    const submitted = useSelector(state => state.result.submitted);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        const trimmed = username.trim();
        const query = USERNAME_PATTERN.test(trimmed) ? `?username=${encodeURIComponent(trimmed)}` : '';
        const timer = setTimeout(() => {
            setStatus('loading');
            setServerError('');
            getServerData(`/api/tests${query}`)
                .then((response) => {
                    if (!active) return;
                    setTests(Array.isArray(response?.tests) ? response.tests : []);
                    setStatus('ready');
                })
                .catch((loadError) => {
                    if (!active) return;
                    setServerError(loadError.message);
                    setStatus('error');
                });
        }, trimmed ? 300 : 0);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [reloadKey, username]);

    function startTest(test) {
        const name = username.trim();
        if (!USERNAME_PATTERN.test(name)) {
            setError('Enter a username with 2–20 letters, numbers, spaces, _ or -.');
            return;
        }
        if (!test.canStart) {
            setError('You have used every attempt allowed for this test.');
            return;
        }

        dispatch(resetAllAction());
        dispatch(resetResultAction());
        dispatch(setUserId(name));
        navigate(`/quiz/${test.id}`);
    }

    return (
        <div className="container wide">
            <div className="top-link">
                <Link to="/admin">Admin panel</Link>
            </div>
            <header className="hero">
                <p className="eyebrow">QuizMaster</p>
                <h1 className="title text-light">Choose a test</h1>
                <p className="subtitle">Pick a test published by the admin. The time limit, pass mark, and number of attempts are set for that test.</p>
            </header>

            <form id="form" onSubmit={(event) => event.preventDefault()}>
                <label className="input-label" htmlFor="username">Your name</label>
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
            </form>

            {serverError && (
                <div className="message-card" role="alert">
                    <p>{serverError}</p>
                    <button className="btn next" type="button" onClick={() => setReloadKey((value) => value + 1)}>
                        Retry connection
                    </button>
                </div>
            )}

            {savedName && savedTestId && savedQuestions > 0 && !submitted && (
                <p className="resume">
                    <Link to={`/quiz/${savedTestId}`}>Continue as {savedName}</Link>
                </p>
            )}
            {submitted && (
                <p className="resume">
                    <Link to="/result">View your latest result</Link>
                </p>
            )}

            {status === 'loading' && <h3 className="text-light loading-note">Loading tests...</h3>}

            {status === 'ready' && tests.length === 0 && (
                <p className="empty-note">No tests are published yet. An admin can add one from the admin panel.</p>
            )}

            <div className="test-grid">
                {tests.map((test) => (
                    <article className="test-card" key={test.id}>
                        <h2>{test.title}</h2>
                        {test.description && <p>{test.description}</p>}
                        <div className="chips">
                            <span>{test.totalQuestions} questions</span>
                            <span>{test.pointsPerQuestion} pts each</span>
                            <span>{formatTime(test.durationSeconds)} time limit</span>
                            <span>Pass at {test.passPercentage}%</span>
                            <span>{attemptText(test)}</span>
                        </div>
                        <button
                            className="btn next"
                            type="button"
                            disabled={!test.canStart}
                            onClick={() => startTest(test)}
                        >
                            {test.canStart ? 'Take test' : 'No attempts left'}
                        </button>
                    </article>
                ))}
            </div>
        </div>
    );
}
