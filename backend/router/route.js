import { Router } from 'express';
import * as controller from '../controllers/controller.js';
import * as admin from '../controllers/adminController.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = Router();

router.get('/health', controller.health);

router.post('/admin/login', admin.login);
router.get('/admin/me', requireAdmin, admin.me);
router.get('/admin/tests', requireAdmin, admin.listTests);
router.post('/admin/tests', requireAdmin, admin.createTest);
router.get('/admin/tests/:id', requireAdmin, admin.getTest);
router.put('/admin/tests/:id', requireAdmin, admin.updateTest);
router.delete('/admin/tests/:id', requireAdmin, admin.deleteTest);
router.get('/admin/tests/:id/results', requireAdmin, admin.testResults);

router.get('/tests', controller.listTests);
router.get('/tests/:id', controller.getTestQuestions);
router.get('/result', controller.getResult);
router.post('/result', controller.storeResult);

export default router;
