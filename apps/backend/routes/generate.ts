import express from 'express';
import handleGenerate from '../controller/handleGenerate';
import handleCompile from '../controller/handleCompile';
import handleAutomation from '../controller/handleAutomation';
import handleRecGen from '../controller/handleRecGen';

const router = express.Router();

router.post('/generate',handleGenerate );
router.post('/user/generate',handleRecGen );

router.post('/recompile', handleCompile);

router.post('/DappAutomation', handleAutomation);

export default router;