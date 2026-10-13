import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminRequest, getAdminToken, setAdminToken } from '../../helper/helper';
import '../../styles/Admin.css';

function blankQuestion() {
    return { question: '', options: ['', '', '', ''], answer: 0 };
}

function blankTest() {
    return {
        title: '',
        description: '',
        durationMinutes: 5,
        pointsPerQuestion: 10,
        passPercentage: 50,
        maxAttempts: 1,
        isPublished: true,
        questions: [blankQuestion()]
    };
}

export default function TestEditor() {
    const { testId } = useParams();
    const isNew = testId === 'new';
    const navigate = useNavigate();
    const [form, setForm] = useState(blankTest);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isNew) return undefined;
        let active = true;
        setLoading(true);
        adminRequest('get', `/api/admin/tests/${testId}`)
            .then((response) => {
                if (!active) return;
                const test = response.test;
                setForm({
                    title: test.title || '',
                    description: test.description || '',
                    durationMinutes: test.durationMinutes || 5,
                    pointsPerQuestion: test.pointsPerQuestion || 10,
                    passPercentage: test.passPercentage || 50,
                    maxAttempts: test.maxAttempts ?? 1,
                    isPublished: Boolean(test.isPublished),
                    questions: test.questions?.length ? test.questions : [blankQuestion()]
                });
                setError('');
            })
            .catch((loadError) => {
                if (!active) return;
                if (!getAdminToken()) {
                    navigate('/admin/login', { replace: true });
                    return;
                }
                setError(loadError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [isNew, navigate, testId]);

    function updateQuestion(index, patch) {
        setForm((current) => ({
            ...current,
            questions: current.questions.map((question, questionIndex) => (
                questionIndex === index ? { ...question, ...patch } : question
            ))
        }));
    }

    function updateOption(questionIndex, optionIndex, value) {
        setForm((current) => ({
            ...current,
            questions: current.questions.map((question, index) => {
                if (index !== questionIndex) return question;
                return {
                    ...question,
                    options: question.options.map((option, indexOption) => (
                        indexOption === optionIndex ? value : option
                    ))
                };
            })
        }));
    }

    function addOption(questionIndex) {
        setForm((current) => ({
            ...current,
            questions: current.questions.map((question, index) => (
                index === questionIndex && question.options.length < 6
                    ? { ...question, options: [...question.options, ''] }
                    : question
            ))
        }));
    }

    function removeOption(questionIndex, optionIndex) {
        setForm((current) => ({
            ...current,
            questions: current.questions.map((question, index) => {
                if (index !== questionIndex || question.options.length <= 2) return question;
                const options = question.options.filter((_, indexOption) => indexOption !== optionIndex);
                const answer = question.answer === optionIndex ? 0 : question.answer > optionIndex ? question.answer - 1 : question.answer;
                return { ...question, options, answer };
            })
        }));
    }

    async function onSave(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const path = isNew ? '/api/admin/tests' : `/api/admin/tests/${testId}`;
            const response = await adminRequest(isNew ? 'post' : 'put', path, form);
            setNotice('Test saved.');
            if (isNew) navigate(`/admin/tests/${response.test.id}`, { replace: true });
        } catch (saveError) {
            if (!getAdminToken()) {
                navigate('/admin/login', { replace: true });
                return;
            }
            setError(saveError.message);
        } finally {
            setSaving(false);
        }
    }

    async function onDelete() {
        const confirmed = window.confirm('Delete this test and its saved scores?');
        if (!confirmed) return;
        try {
            await adminRequest('delete', `/api/admin/tests/${testId}`);
            navigate('/admin', { replace: true });
        } catch (deleteError) {
            setError(deleteError.message);
        }
    }

    function logout() {
        setAdminToken('');
        navigate('/admin/login', { replace: true });
    }

    return (
        <div className="container wide">
            <div className="admin-bar">
                <Link to="/admin">All tests</Link>
                <button type="button" onClick={logout}>Log out</button>
            </div>
            <header className="hero">
                <p className="eyebrow">Admin</p>
                <h1 className="title compact text-light">{isNew ? 'New test' : 'Edit test'}</h1>
            </header>
            {loading && <h3 className="text-light">Loading test...</h3>}
            {!loading && (
                <form className="admin-form" onSubmit={onSave}>
                    <label htmlFor="title">Title</label>
                    <input id="title" type="text" value={form.title} maxLength={80} onChange={(event) => setForm({ ...form, title: event.target.value })} />

                    <label htmlFor="description">Description</label>
                    <textarea id="description" rows="3" value={form.description} maxLength={400} onChange={(event) => setForm({ ...form, description: event.target.value })} />

                    <div className="restriction-grid">
                        <div>
                            <label htmlFor="minutes">Time limit (minutes)</label>
                            <input id="minutes" type="number" min="1" max="180" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} />
                        </div>
                        <div>
                            <label htmlFor="points">Points per correct answer</label>
                            <input id="points" type="number" min="1" max="100" value={form.pointsPerQuestion} onChange={(event) => setForm({ ...form, pointsPerQuestion: Number(event.target.value) })} />
                        </div>
                        <div>
                            <label htmlFor="pass">Pass percentage</label>
                            <input id="pass" type="number" min="1" max="100" value={form.passPercentage} onChange={(event) => setForm({ ...form, passPercentage: Number(event.target.value) })} />
                        </div>
                        <div>
                            <label htmlFor="attempts">Max attempts (0 = unlimited)</label>
                            <input id="attempts" type="number" min="0" max="20" value={form.maxAttempts} onChange={(event) => setForm({ ...form, maxAttempts: Number(event.target.value) })} />
                        </div>
                    </div>

                    <label className="check-line" htmlFor="published">
                        <input
                            id="published"
                            type="checkbox"
                            checked={form.isPublished}
                            onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
                        />
                        Published — students can see and take this test
                    </label>

                    <h2 className="text-light">Questions</h2>
                    {form.questions.map((question, questionIndex) => (
                        <fieldset className="question-editor" key={`question-${questionIndex}`}>
                            <legend>Question {questionIndex + 1}</legend>
                            <label htmlFor={`q-${questionIndex}`}>Question text</label>
                            <textarea
                                id={`q-${questionIndex}`}
                                rows="2"
                                value={question.question}
                                onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })}
                            />
                            <p className="hint">Select the radio button next to the correct option.</p>
                            {question.options.map((option, optionIndex) => (
                                <div className="option-row" key={`option-${optionIndex}`}>
                                    <input
                                        type="radio"
                                        name={`correct-${questionIndex}`}
                                        checked={question.answer === optionIndex}
                                        aria-label={`Mark option ${optionIndex + 1} correct`}
                                        onChange={() => updateQuestion(questionIndex, { answer: optionIndex })}
                                    />
                                    <input
                                        type="text"
                                        value={option}
                                        placeholder={`Option ${optionIndex + 1}`}
                                        onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                                    />
                                    <button type="button" className="btn danger" onClick={() => removeOption(questionIndex, optionIndex)} disabled={question.options.length <= 2}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div className="row-actions">
                                <button type="button" className="btn prev" onClick={() => addOption(questionIndex)} disabled={question.options.length >= 6}>
                                    Add option
                                </button>
                                <button
                                    type="button"
                                    className="btn danger"
                                    disabled={form.questions.length <= 1}
                                    onClick={() => setForm((current) => ({
                                        ...current,
                                        questions: current.questions.filter((_, index) => index !== questionIndex)
                                    }))}
                                >
                                    Remove question
                                </button>
                            </div>
                        </fieldset>
                    ))}

                    <div className="row-actions">
                        <button type="button" className="btn prev" onClick={() => setForm((current) => ({ ...current, questions: [...current.questions, blankQuestion()] }))}>
                            Add question
                        </button>
                    </div>

                    {error && <p className="form-error" role="alert">{error}</p>}
                    {notice && <p className="notice">{notice}</p>}
                    <div className="row-actions">
                        <button className="btn next" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save test'}</button>
                        {!isNew && <button className="btn danger" type="button" onClick={onDelete}>Delete test</button>}
                    </div>
                </form>
            )}
        </div>
    );
}
