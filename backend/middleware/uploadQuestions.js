import multer from 'multer';
import { MAX_IMPORT_FILE_BYTES } from '../utils/limits.js';

const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];

function hasAllowedExtension(filename = '') {
    const name = String(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMPORT_FILE_BYTES,
        files: 1
    },
    fileFilter(req, file, callback) {
        if (!hasAllowedExtension(file.originalname)) {
            const error = new Error('Upload an Excel .xlsx or .csv file.');
            error.status = 400;
            callback(error);
            return;
        }
        callback(null, true);
    }
});

export function uploadQuestionFile(req, res, next) {
    upload.single('file')(req, res, (error) => {
        if (!error) {
            next();
            return;
        }
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                success: false,
                message: `File must be ${Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024))} MB or smaller.`
            });
            return;
        }
        res.status(error.status || 400).json({
            success: false,
            message: error.message || 'Invalid upload.'
        });
    });
}
