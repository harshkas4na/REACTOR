// src/routes/route.ts

import express from 'express';
import handleGenerateSC from '../controller/handleGenerateSC';
import handleCompile from '../controller/handleCompile';
import handleAutomation from '../controller/handleAutomation';
import handleGenerateDA from '../controller/handleGenerateDA';
import handleLiveDataAutomation from '../controller/handleLiveDataAutomation';

const router = express.Router();

// Existing routes
router.post('/compile', handleCompile);
router.post('/generateSC', handleGenerateSC);
router.post('/DappAutomation', handleAutomation);
router.post('/generateDA', handleGenerateDA);
router.post('/live-data-automation', handleLiveDataAutomation);

export default router;