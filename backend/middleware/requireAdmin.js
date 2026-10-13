import { verifyAdminToken } from '../utils/token.js';

export default function requireAdmin(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
        return res.status(401).json({ success: false, message: 'Admin login required.' });
    }

    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Admin login required.' });
        }
        req.admin = payload;
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Admin session expired. Log in again.' });
    }
}
