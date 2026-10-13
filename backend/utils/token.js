import jwt from 'jsonwebtoken';

function secret() {
    return process.env.JWT_SECRET || 'quizmaster-dev-secret-change-me';
}

export function signAdmin(admin) {
    return jwt.sign(
        { id: String(admin._id), username: admin.username, role: 'admin' },
        secret(),
        { expiresIn: '12h' }
    );
}

export function verifyAdminToken(token) {
    return jwt.verify(token, secret());
}
