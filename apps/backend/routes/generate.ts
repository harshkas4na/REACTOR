import express from 'express';
import handleGenerateSC from '../controller/handleGenerateSC';
import handleCompile from '../controller/handleCompile';
import handleAutomation from '../controller/handleAutomation';
import handleGenerateDA from '../controller/handleGenerateDA';

const router = express.Router();

router.post('/recompile', handleCompile);

//To generate template for Personal Smart contracts
router.post('/generateSC',handleGenerateSC );

//To generate template for Dapps Automation
router.post('/DappAutomation', handleAutomation);
router.post('/generateDA',handleGenerateDA );

export default router;