import express from 'express';
import handleGenerate from '../controller/handleGenerate';

const router = express.Router();

router.post('/',handleGenerate );

export default router;