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

router.post('/ext-dapp/verify-protocol', async (req, res) => {
    try {
        const { address } = req.body;
        const verification = await extDappController.verifyProtocols([address]);
        res.json({
            success: true,
            data: verification[0] // Return first verification result
        });
    } catch (error:any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/ext-dapp/verify-protocols', async (req, res) => {
    try {
        const { addresses } = req.body;
        const verifications = await extDappController.verifyProtocols(addresses);
        res.json({
            success: true,
            data: verifications
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Optional: Route for getting protocol events and functions
router.get('/ext-dapp/protocol/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const verification = await extDappController.verifyProtocols([address]);
        res.json({
            success: true,
            data: {
                events: verification[0].events,
                functions: verification[0].functions
            }
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Optional: Health check route
// router.get('/ext-dapp/health', (req, res) => {
//     res.json({
//         success: true,
//         message: 'External DApp Automation service is healthy'
//     });
// });

export default router;