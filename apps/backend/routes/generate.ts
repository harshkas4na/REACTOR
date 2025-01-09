// src/routes/route.ts

import express from 'express';
import handleGenerateSC from '../controller/handleGenerateSC';
import handleCompile from '../controller/handleCompile';
import handleAutomation from '../controller/handleAutomation';
import handleGenerateDA from '../controller/handleGenerateDA';
import handleLiveDataAutomation from '../controller/handleLiveDataAutomation';
import { ExtDAppAutomationController } from '../controller/ExtDAppAutomationController';

const router = express.Router();

// Initialize External DApp Automation Controller
const extDappController = new ExtDAppAutomationController();

// Existing routes
router.post('/compile', handleCompile);
router.post('/generateSC', handleGenerateSC);
router.post('/DappAutomation', handleAutomation);
router.post('/generateDA', handleGenerateDA);
router.post('/live-data-automation', handleLiveDataAutomation);

// External DApp Automation routes
router.post('/ext-dapp/generate', async (req, res) => {
    try {
        const contracts = await extDappController.generateContracts(req.body);
        res.json({
            success: true,
            data: contracts
        });
    } catch (error:any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});





export default router;