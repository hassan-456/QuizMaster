import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminRequest, getAdminToken, setAdminToken } from '../../helper/helper';
import '../../styles/Admin.css';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (getAdminToken()) navigate('/admin', { replace: true });
    }, [navigate]);

    async function onSubmit(event) {
        event.preventDefault();
        setBusy(true);
        setError('');

        try {
            const response = await adminRequest('post', '/api/admin/login', {
                username: username.trim(),
                password
            });
            setAdminToken(response.token);
            navigate('/admin', { replace: true });
        } catch (loginError) {
            setError(loginError.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="container">
            <div className="top-link">
                <Link to="/">Back to tests</Link>
            </div>
            <header className="hero">
                <p className="eyebrow">Admin</p>
                <h1 className="title compact text-light">Sign in</h1>
                <p className="subtitle">Create tests, write the questions, and set the time limit, pass mark, and attempt limit.</p>
            </header>
            <form className="admin-form" onSubmit={onSubmit}>
                <label htmlFor="admin-username">Username</label>
                <input
                    id="admin-username"
                    type="text"
                    value={username}
                    autoComplete="username"
                    onChange={(event) => setUsername(event.target.value)}
                />
                <label htmlFor="admin-password">Password</label>
                <input
                    id="admin-password"
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                />
                {error && <p className="form-error" role="alert">{error}</p>}
                <p className="hint">Default login is admin / admin123. Change ADMIN_PASSWORD in the server environment before sharing this app.</p>
                <div className="start">
                    <button className="btn next" type="submit" disabled={busy}>
                        {busy ? 'Signing in...' : 'Sign in'}
                    </button>
                </div>
            </form>
        </div>
    );
}
