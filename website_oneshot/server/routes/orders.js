const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processPhoto, buildPolaroidCard, buildA4Sheets } = require('../services/imageProcessor');
const { generatePDF } = require('../services/pdfGenerator');

const { getAllOrders, saveOrder, updateOrderPrintedAt } = require('../db');

const basicAuth = require('express-basic-auth');

const router = express.Router();

const adminAuth = (req, res, next) => {
    return basicAuth({
        users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
        challenge: true
    })(req, res, next);
};

const { uploadToR2, downloadFromR2 } = require('../services/r2Storage');

const storage = multer.memoryStorage();

const fileFilter = function (req, file, cb) {
    const isJpegMime = file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/pjpeg';
    const isJpegExt = /\.(jpg|jpeg)$/i.test(file.originalname || '');

    if (isJpegMime && isJpegExt) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG/JPEG image files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024,
        files: 20
    },
    fileFilter: fileFilter
});

// Load orders from SQLite database on startup
let orders = getAllOrders();

const prepareUpload = (req, res, next) => {
    req.orderId = uuidv4();
    next();
};

const handleUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message, code: err.code });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

router.post('/', prepareUpload, handleUpload, async (req, res) => {
    try {
        const orderId = req.orderId;
        let items = [];
        try {
            items = JSON.parse(req.body.items || '[]');
        } catch (e) {
            items = [];
        }

        const itemsWithPhotos = await Promise.all(items.map(async (item, index) => {
            const file = (req.files || []).find(f => f.fieldname === `photo_${item.id}` || f.fieldname === `photo_${index}`);
            let photoKey = null;
            let photoUrl = item.image || null;

            if (file && file.buffer) {
                const safeName = (file.originalname || `photo_${item.id || index}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
                photoKey = `${orderId}/${safeName}`;
                await uploadToR2(photoKey, file.buffer, file.mimetype || 'image/jpeg');
                photoUrl = `/api/orders/r2-photo?key=${encodeURIComponent(photoKey)}`;
            }

            return {
                id: String(item.id || Date.now() + index),
                type: item.format || item.type || 'mini',
                format: item.format || item.type || 'mini',
                caption: item.caption || '',
                tilt: parseFloat(item.tilt) || 0,
                size: parseInt(item.size, 10) || 24,
                font: item.font || 'handwriting',
                copies: parseInt(item.copies, 10) || 1,
                zoom: parseFloat(item.zoom) || 1,
                panX: parseFloat(item.panX) || 0,
                panY: parseFloat(item.panY) || 0,
                status: 'pending',
                photoKey: photoKey,
                photoUrl: photoUrl,
                photoPath: photoKey
            };
        }));

        const newOrder = {
            id: orderId,
            orderId: orderId,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            items: itemsWithPhotos
        };

        orders.unshift(newOrder);
        saveOrder(newOrder);

        const broadcastWS = req.app.get('broadcastWS');
        if (broadcastWS) {
            broadcastWS({ event: 'new_order', order: newOrder });
        }

        console.log(`[Order Intake] New R2 order ${orderId} with ${itemsWithPhotos.length} polaroids.`);
        res.json({ success: true, orderId, order: newOrder });
    } catch (err) {
        console.error('[Order Error]', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Stream photo from R2 for Admin / UI previews
router.get('/r2-photo', async (req, res) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).send('Missing key');
        const buffer = await downloadFromR2(key);
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(buffer);
    } catch (err) {
        res.status(404).send('Photo not found');
    }
});

// All routes below require Admin Basic Auth
router.use(adminAuth);

router.get('/', (req, res) => {
    res.json(orders);
});

// Approve All Items in an Order with 1 click
router.post('/:orderId/approve-all', (req, res) => {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId || o.orderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.items.forEach(i => {
        if (i.status !== 'rejected') {
            i.status = 'approved';
        }
    });
    order.status = 'approved';
    saveOrder(order);

    const broadcastWS = req.app.get('broadcastWS');
    if (broadcastWS) {
        broadcastWS({ event: 'order_approved_all', orderId, order });
    }

    res.json({ success: true, order });
});

router.patch('/:orderId/items/:itemId', (req, res) => {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = orders.find(o => o.id === orderId || o.orderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const item = order.items.find(i => String(i.id) === String(itemId));
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.status = status;

    const allApproved = order.items.every(i => i.status === 'approved');
    const allReviewed = order.items.every(i => i.status === 'approved' || i.status === 'rejected');
    if (order.status !== 'ready') {
        if (allApproved) order.status = 'approved';
        else if (allReviewed) order.status = 'reviewed';
        else order.status = 'partial';
    }

    saveOrder(order);

    const broadcastWS = req.app.get('broadcastWS');
    if (broadcastWS) {
        broadcastWS({ event: 'item_updated', orderId, itemId, status, order });
    }

    res.json({ success: true, item, order });
});

function resolvePhotoPath(item) {
    if (item.photoKey) return item.photoKey;
    if (item.photoPath) return item.photoPath;
    if (item.photoUrl) return item.photoUrl;
    if (item.image) return item.image;
    return null;
}

// Generate print sheet for single order
router.post('/:orderId/generate', async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = orders.find(o => o.id === orderId || o.orderId === orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const forceReprint = req.body && req.body.forceReprint;
        if ((order.status === 'ready' || order.status === 'fulfilled') && !forceReprint) {
            return res.status(400).json({ error: 'Order has already been printed. Set forceReprint=true to reprint.' });
        }

        const approvedItems = order.items.filter(i => i.status === 'approved');
        if (approvedItems.length === 0) {
            return res.status(400).json({ error: 'No approved items to print' });
        }

        const polaroidCards = [];
        for (const item of approvedItems) {
            const inputPath = resolvePhotoPath(item);
            if (!inputPath) continue;

            const cardBuffer = await buildPolaroidCard(inputPath, {
                format: item.format || item.type,
                caption: item.caption,
                tilt: item.tilt,
                fontSize: item.size,
                font: item.font,
                zoom: item.zoom || 1,
                panX: item.panX || 0,
                panY: item.panY || 0
            });

            polaroidCards.push({
                format: item.format || item.type,
                cardBuffer,
                copies: item.copies || 1
            });
        }

        if (polaroidCards.length === 0) {
            return res.status(400).json({ error: 'Failed to process images for printing' });
        }

        // Multi-page A4 sheets with cutting guidelines
        const a4Buffers = await buildA4Sheets(polaroidCards);
        const orderDir = path.join(__dirname, '..', 'uploads', orderId);
        if (!fs.existsSync(orderDir)) fs.mkdirSync(orderDir, { recursive: true });

        const outputPath = path.join(orderDir, `sheet_${orderId}.pdf`);
        await generatePDF(a4Buffers, outputPath);

        const printedAt = new Date().toISOString();
        order.status = 'ready';
        order.printedAt = printedAt;
        saveOrder(order);

        const broadcastWS = req.app.get('broadcastWS');
        if (broadcastWS) {
            broadcastWS({ event: 'pdf_ready', orderId, pdfUrl: `/api/orders/${orderId}/download`, pages: a4Buffers.length });
        }

        res.json({
            success: true,
            orderId,
            pages: a4Buffers.length,
            pdfUrl: `/api/orders/${orderId}/download`
        });
    } catch (err) {
        console.error('[Generation Error]', err);
        res.status(500).json({ error: 'Failed to generate print sheet', details: err.message });
    }
});

// Batch multiple customer orders together into one print run
router.post('/batch-generate', async (req, res) => {
    try {
        const { orderIds = [], forceReprint = false } = req.body;
        const targetOrders = orderIds.length > 0 
            ? orders.filter(o => orderIds.includes(o.id) || orderIds.includes(o.orderId))
            : orders.filter(o => o.items.some(i => i.status === 'approved') && (forceReprint || (o.status !== 'ready' && o.status !== 'printed')));

        if (targetOrders.length === 0) {
            return res.status(400).json({ error: 'No orders with approved items found.' });
        }

        const polaroidCards = [];
        for (const order of targetOrders) {
            const approved = order.items.filter(i => i.status === 'approved');
            for (const item of approved) {
                const inputPath = resolvePhotoPath(item);
                if (!inputPath) continue;

                const cardBuffer = await buildPolaroidCard(inputPath, {
                    format: item.format || item.type,
                    caption: item.caption,
                    tilt: item.tilt,
                    fontSize: item.size,
                    font: item.font,
                    zoom: item.zoom || 1,
                    panX: item.panX || 0,
                    panY: item.panY || 0
                });

                polaroidCards.push({
                    format: item.format || item.type,
                    cardBuffer,
                    copies: item.copies || 1
                });
            }
        }

        if (polaroidCards.length === 0) {
            return res.status(400).json({ error: 'No approved polaroid cards to batch' });
        }

        const a4Buffers = await buildA4Sheets(polaroidCards);
        const batchId = 'batch_' + Date.now();
        const batchDir = path.join(__dirname, '..', 'uploads', 'batches');
        if (!fs.existsSync(batchDir)) fs.mkdirSync(batchDir, { recursive: true });

        const outputPath = path.join(batchDir, `${batchId}.pdf`);
        await generatePDF(a4Buffers, outputPath);

        const printedAt = new Date().toISOString();
        targetOrders.forEach(o => {
            o.status = 'printed';
            o.printedAt = printedAt;
            saveOrder(o);
        });

        res.json({
            success: true,
            batchId,
            pages: a4Buffers.length,
            totalPrints: polaroidCards.reduce((s, c) => s + c.copies, 0),
            pdfUrl: `/api/orders/batch/download/${batchId}`
        });
    } catch (err) {
        console.error('[Batch Generation Error]', err);
        res.status(500).json({ error: 'Failed to batch generate sheets', details: err.message });
    }
});

router.get('/batch/download/:batchId', (req, res) => {
    const { batchId } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', 'batches', `${batchId}.pdf`);
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="OneMoreShot_MultiOrder_${batchId}.pdf"`);
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.status(404).json({ error: 'Batch PDF not found' });
    }
});

router.get('/:orderId/download', (req, res) => {
    const { orderId } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', orderId, `sheet_${orderId}.pdf`);
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="OneMoreShot_A4_${orderId.substring(0, 8)}.pdf"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).json({ error: 'Print PDF not found. Generate it first in the Admin dashboard.' });
// Mark order as printed (moves to previous orders)
router.post('/:orderId/mark-printed', (req, res) => {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId || o.orderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = 'printed';
    order.printedAt = new Date().toISOString();
    saveOrder(order);

    const broadcastWS = req.app.get('broadcastWS');
    if (broadcastWS) {
        broadcastWS({ event: 'order_printed', orderId, order });
    }

    res.json({ success: true, order });
});

// Restore order back to active
router.post('/:orderId/unmark-printed', (req, res) => {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId || o.orderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = 'ready';
    saveOrder(order);

    const broadcastWS = req.app.get('broadcastWS');
    if (broadcastWS) {
        broadcastWS({ event: 'order_unmarked', orderId, order });
    }

    res.json({ success: true, order });
});

// Batch mark multiple orders as printed
router.post('/mark-printed-batch', (req, res) => {
    const { orderIds = [] } = req.body;
    const printedAt = new Date().toISOString();
    const updated = [];

    orders.forEach(o => {
        if (orderIds.includes(o.id) || orderIds.includes(o.orderId)) {
            o.status = 'printed';
            o.printedAt = printedAt;
            saveOrder(o);
            updated.push(o.id);
        }
    });

    const broadcastWS = req.app.get('broadcastWS');
    if (broadcastWS) {
        broadcastWS({ event: 'orders_printed_batch', orderIds: updated });
    }

    res.json({ success: true, count: updated.length, orderIds: updated });
});

module.exports = router;
