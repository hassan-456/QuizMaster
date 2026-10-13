import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import router from './router/route.js';
import connect from './database/conn.js';
import ensureQuiz from './database/seed.js';

const app = express();
const port = process.env.PORT || 8080;
const allowedOrigins = [
    process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
];

app.use(morgan('tiny'));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed'));
    }
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'QuizMaster API',
        health: '/api/health'
    });
});

app.use('/api', router);

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((error, req, res, next) => {
    console.error(error.message);
    const status = error.status || 500;
    res.status(status).json({
        success: false,
        message: status >= 500 ? 'Server error' : error.message
    });
});

connect()
    .then(() => ensureQuiz())
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch(() => {
        console.error('Server did not start. Check ATLAS_URI, database access, and your network.');
        process.exit(1);
    });
