import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ResultTable from './ResultTable';
import { resetAllAction } from '../redux/question_reducer';
import { resetResultAction, setSummaryAction } from '../redux/result_reducer';
import { publishResult } from '../hooks/setResult';
import '../styles/Result.css';

export default function Result() {
    const dispatch = useDispatch();
    const { result, userId, summary, submitted } = useSelector(state => state.result);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(!submitted);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (submitted || !userId || !Array.isArray(result) || result.length === 0) return undefined;

        let active = true;
        setSaving(true);
        setError('');

        publishResult({ username: userId, answers: result })
            .then((response) => {
                if (!active) return;
                if (!response?.success || !response.result) {
                    throw new Error(response?.message || 'Could not save your result.');
                }
                dispatch(setSummaryAction(response.result));
            })
            .catch((saveError) => {
                if (!active) return;
                setError(saveError.message);
            })
            .finally(() => {
                if (active) setSaving(false);
            });

        return () => {
            active = false;
        };
    }, [submitted, userId, result, dispatch, attempt]);

    if (!submitted && result.length === 0) {
        return <Navigate to="/quiz" replace />;
    }

    function onRestart() {
        dispatch(resetAllAction());
        dispatch(resetResultAction());
    }

    const passed = summary?.achieved === 'Passed';

    return (
        <div className="container">
            <header className="hero">
                <p className="eyebrow">QuizMaster</p>
                <h1 className="title compact text-light">Your Result</h1>
            </header>

            {saving && !summary && <h3 className="text-light">Saving your result...</h3>}

            {!summary && error && (
                <div className="message-card" role="alert">
                    <p>{error}</p>
                    <button className="btn next" type="button" onClick={() => setAttempt((value) => value + 1)}>
                        Retry save
                    </button>
                </div>
            )}

            {summary && (
                <div className="result flex-center">
                    <div className="flex">
                        <span>Username</span>
                        <span className="bold">{summary.username}</span>
                    </div>
                    <div className="flex">
                        <span>Total questions</span>
                        <span className="bold">{summary.totalQuestions || 0}</span>
                    </div>
                    <div className="flex">
                        <span>Answered</span>
                        <span className="bold">{summary.attempts || 0}</span>
                    </div>
                    <div className="flex">
                        <span>Score</span>
                        <span className="bold">{summary.points || 0} / {summary.totalPoints || 0}</span>
                    </div>
                    <div className="flex">
                        <span>Percentage</span>
                        <span className="bold">{summary.percentage || 0}%</span>
                    </div>
                    <div className="flex">
                        <span>Pass mark</span>
                        <span className="bold">{summary.passPercentage || 50}%</span>
                    </div>
                    <div className="flex">
                        <span>Quiz result</span>
                        <span className={passed ? 'badge pass' : 'badge fail'}>{summary.achieved}</span>
                    </div>
                </div>
            )}

            {summary?.breakdown?.length > 0 && (
                <details className="review">
                    <summary>Review answers</summary>
                    <ol>
                        {summary.breakdown.map((item) => (
                            <li key={item.id} className={item.isCorrect ? 'correct' : 'wrong'}>
                                <p className="review-question">{item.id}. {item.question}</p>
                                <p>Your answer: {item.selectedIndex === null ? 'Not answered' : item.options[item.selectedIndex]}</p>
                                {!item.isCorrect && <p>Correct answer: {item.options[item.correctIndex]}</p>}
                            </li>
                        ))}
                    </ol>
                </details>
            )}

            <div className="start">
                <Link className="btn" to="/" onClick={onRestart}>Restart</Link>
            </div>

            <ResultTable refreshKey={summary?.id || attempt} highlightName={userId} />
        </div>
    );
}
