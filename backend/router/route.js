import { Router } from "express";
import * as controller from '../controllers/controller.js';

const router = Router();

router.get('/health', controller.health);

router.route('/questions')
    .get(controller.getQuestions);

router.route('/result')
    .get(controller.getResult)
    .post(controller.storeResult);

export default router;
