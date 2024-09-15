import express from 'express';
import handleGenerate from '../controller/handleGenerate';
import handleCompile from '../controller/handleCompile';

const router = express.Router();

router.post('/generate',handleGenerate );

router.post('/recompile', handleCompile);

export default router;