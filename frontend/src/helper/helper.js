import axios from 'axios';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const api = axios.create({
    baseURL: process.env.REACT_APP_SERVER_HOSTNAME || 'http://localhost:8080',
    timeout: 15000
});

function messageFrom(error) {
    return error?.response?.data?.message || error?.message || 'Something went wrong. Check that the server is running.';
}

export function formatTime(totalSeconds) {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatWhen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
}

export function CheckUserExist({ children }) {
    const auth = useSelector(state => state.result.userId);
    return auth ? children : <Navigate to="/" replace />;
}

export async function getServerData(path) {
    try {
        const { data } = await api.get(path);
        return data;
    } catch (error) {
        throw new Error(messageFrom(error));
    }
}

export async function postServerData(path, body) {
    try {
        const { data } = await api.post(path, body);
        return data;
    } catch (error) {
        throw new Error(messageFrom(error));
    }
}

const ADMIN_TOKEN_KEY = 'quizmaster-admin-token';

export function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token) {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminRequest(method, path, body) {
    try {
        const token = getAdminToken();
        const { data } = await api.request({
            method,
            url: path,
            data: body,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return data;
    } catch (error) {
        if (error?.response?.status === 401) setAdminToken('');
        throw new Error(messageFrom(error));
    }
}
