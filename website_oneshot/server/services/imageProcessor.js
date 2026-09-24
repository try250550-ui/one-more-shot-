const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { downloadFromR2 } = require('./r2Storage');

/**
 * Exact Polaroid Specifications at 300 DPI:
 * - Mini Polaroid: Outer 531 × 688 px (45 × 58.3 mm) | Photo Window 449 × 531 px (38 × 45 mm)
 * - Wide Polaroid: Outer 945 × 766 px (80 × 64.8 mm) | Photo Window 892 × 559 px (75.5 × 47.3 mm)
 * - A4 Sheet: 2480 × 3508 px (210 × 297 mm) @ 300 DPI
 */

/**
 * Safely load any image (JPEG, PNG, WebP, HEIC, AVIF etc.) into a raw buffer
 * Downloads object from Cloudflare R2 if a key string is passed.
 */
async function safeLoadToBuffer(input) {
    try {
        let buffer;
        if (Buffer.isBuffer(input)) {
            buffer = input;
        } else if (typeof input === 'string') {
            if (fs.existsSync(input)) {
                buffer = fs.readFileSync(input);
            } else {
                buffer = await downloadFromR2(input);
            }
        } else {
            throw new Error('Invalid input');
        }

        const meta = await sharp(buffer, { failOn: 'none' }).metadata();
        if (!meta.width || !meta.height) throw new Error('No dimensions');

        return await sharp(buffer, { failOn: 'none' })
            .rotate()              // auto-rotate by EXIF orientation
            .jpeg({ quality: 95 })
            .toBuffer();
    } catch (err) {
        console.warn(`[safeLoad] Fallback for ${input}: ${err.message}`);
        // Return a solid grey placeholder so the card still renders
        return await sharp({
            create: { width: 800, height: 600, channels: 3, background: { r: 180, g: 170, b: 190 } }
        }).jpeg().toBuffer();
    }
}

async function processPhoto(inputPath, options = {}) {
    const { format = 'mini', zoom = 1, panX = 0, panY = 0 } = options;
    const targetW = format === 'mini' ? 449 : 892;
    const targetH = format === 'mini' ? 531 : 559;

    // Safe load — converts HEIC/iPhone photos, handles corrupt files
    const safeBuffer = await safeLoadToBuffer(inputPath);

    const metadata = await sharp(safeBuffer).metadata();
    const imgW = metadata.width || targetW;
    const imgH = metadata.height || targetH;

    const scale = Math.max(1, Math.min(3, parseFloat(zoom) || 1));

    // Calculate base cover dimensions
    const imgAspect = imgW / imgH;
    const targetAspect = targetW / targetH;
    let baseW, baseH;

    if (imgAspect > targetAspect) {
        baseH = targetH;
        baseW = Math.round(targetH * imgAspect);
    } else {
        baseW = targetW;
        baseH = Math.round(targetW / imgAspect);
    }

    // Apply zoom
    const scaledW = Math.round(baseW * scale);
    const scaledH = Math.round(baseH * scale);

    const resizedBuffer = await sharp(safeBuffer)
        .resize(scaledW, scaledH, { fit: 'fill' })
        .toBuffer();

    // Canva-style bound clamping
    const maxPanX = (scaledW - targetW) / 2;
    const maxPanY = (scaledH - targetH) / 2;

    const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, parseFloat(panX) || 0));
    const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, parseFloat(panY) || 0));

    const extractLeft = Math.max(0, Math.min(scaledW - targetW, Math.round(maxPanX - clampedPanX)));
    const extractTop = Math.max(0, Math.min(scaledH - targetH, Math.round(maxPanY - clampedPanY)));

    return await sharp(resizedBuffer)
        .extract({ left: extractLeft, top: extractTop, width: targetW, height: targetH })
        .toBuffer();
}

async function buildPolaroidCard(inputPath, options = {}) {
    const {
        format = 'mini',
        caption = '',
        tilt = -1.5,
        fontSize = 24,
        font = 'handwriting',
        zoom = 1,
        panX = 0,
        panY = 0
    } = options;

    const isMini = format === 'mini';
    const cardW = isMini ? 531 : 945;
    const cardH = isMini ? 688 : 766;
    const photoW = isMini ? 449 : 892;
    const photoH = isMini ? 531 : 559;
    const leftMargin = isMini ? 41 : 27;
    const topMargin = isMini ? 41 : 27;
    const bottomAreaH = cardH - photoH - topMargin; // Mini: 116px, Wide: 180px

    // 1. Process photo to exact window
    const photoBuffer = await processPhoto(inputPath, { format, zoom, panX, panY });

    // 2. Generate Caption SVG overlay
    const safeCaption = (caption || '').trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const hasCaption = safeCaption.length > 0;
    const fontFamily = font === 'modern' ? 'Plus Jakarta Sans, sans-serif' : 'Caveat, cursive, sans-serif';
    const captionFontSize = Math.max(16, Math.min(48, Math.round((fontSize || 24) * (isMini ? 1.4 : 1.6))));
    const captionY = Math.round(bottomAreaH * 0.48);
    const footerY = Math.round(bottomAreaH * 0.85);

    const captionSvg = `
        <svg width="${cardW}" height="${bottomAreaH}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .caption { font-family: ${fontFamily}; font-size: ${captionFontSize}px; font-weight: 700; fill: #261a38; text-anchor: middle; }
                .footer { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; fill: #7d38be; letter-spacing: 1px; }
            </style>
            ${hasCaption ? `
            <g transform="translate(${cardW / 2}, ${captionY}) rotate(${tilt || 0})">
                <text class="caption" x="0" y="0">${safeCaption}</text>
            </g>` : ''}
            <text class="footer" x="${leftMargin + 10}" y="${footerY}">ONE MORE SHOT</text>
            <text class="footer" x="${cardW - leftMargin - 10}" y="${footerY}" text-anchor="end">@_one.moreshot_</text>
        </svg>
    `;

    // 3. Composite onto white card
    const card = sharp({
        create: {
            width: cardW,
            height: cardH,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    });

    return await card
        .composite([
            { input: photoBuffer, left: leftMargin, top: topMargin },
            { input: Buffer.from(captionSvg), left: 0, top: topMargin + photoH }
        ])
        .png()
        .toBuffer();
}

/**
 * Builds Multi-Page 300 DPI A4 Sheets with high-contrast cutting guides
 * @param {Array} items - Array of { format, cardBuffer, copies }
 * @returns {Array<Buffer>} - Array of PNG buffers, one per A4 page
 */
async function buildA4Sheets(items) {
    const canvasWidth = 2480;
    const canvasHeight = 3508;

    // Flatten all cards by copies
    const allCards = [];
    for (const item of items) {
        const copies = parseInt(item.copies, 10) || 1;
        for (let i = 0; i < copies; i++) {
            allCards.push(item);
        }
    }

    if (allCards.length === 0) return [];

    // Sort cards by format so same-size cards group into their own rows
    allCards.sort((a, b) => (a.format || '').localeCompare(b.format || ''));

    const pages = [];
    let currentComposites = [];
    let guideSvgElements = [];

    let currentX = 80;
    let currentY = 80;
    let currentRowMaxH = 0;

    function finalizeCurrentPage() {
        if (currentComposites.length === 0) return;

        // Create overlay SVG with high-contrast cut guidelines across the sheet
        const guidesSvg = `
            <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
                <style>
                    .cut-dashed { stroke: #8a7a9e; stroke-width: 1.5; stroke-dasharray: 6 4; fill: none; }
                    .crop-solid { stroke: #3a225a; stroke-width: 2.5; fill: none; }
                    .page-header { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; fill: #7d38be; letter-spacing: 1px; }
                </style>
                <text class="page-header" x="80" y="50">ONE MORE SHOT • A4 PRINT SHEET (300 DPI ARCHIVAL) — PAGE ${pages.length + 1}</text>
                ${guideSvgElements.join('\n')}
            </svg>
        `;

        currentComposites.push({ input: Buffer.from(guidesSvg), left: 0, top: 0 });

        const pagePromise = sharp({
            create: {
                width: canvasWidth,
                height: canvasHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        }).composite(currentComposites).png().toBuffer();

        pages.push(pagePromise);

        // Reset for next page
        currentComposites = [];
        guideSvgElements = [];
        currentX = 80;
        currentY = 80;
        currentRowMaxH = 0;
    }

    let lastFormat = null;
    for (let index = 0; index < allCards.length; index++) {
        const card = allCards[index];
        const isMini = card.format === 'mini';
        const cardW = isMini ? 531 : 945;
        const cardH = isMini ? 688 : 766;

        // Force row break when format changes so Mini and Wide stay on dedicated rows
        if (lastFormat && card.format !== lastFormat && currentX > 80) {
            currentX = 80;
            currentY += currentRowMaxH + 50;
            currentRowMaxH = 0;
        }
        lastFormat = card.format;

        // Check if card fits horizontally in current row
        if (currentX + cardW + 60 > canvasWidth) {
            // Move to next row
            currentX = 80;
            currentY += currentRowMaxH + 50;
            currentRowMaxH = 0;
        }

        // Check if card fits vertically on current page
        if (currentY + cardH + 60 > canvasHeight) {
            // PAGE OVERFLOW: Finish this page and start Page N+1!
            finalizeCurrentPage();
        }

        // Add card to composites
        currentComposites.push({ input: card.cardBuffer, left: currentX, top: currentY });

        // Add High-Contrast Cutting Guides (Dashed perimeter + solid corner crop marks)
        const L = 16; // Crop mark arm length
        const x1 = currentX;
        const y1 = currentY;
        const x2 = currentX + cardW;
        const y2 = currentY + cardH;

        guideSvgElements.push(`
            <!-- Card Perimeter Dashed Cut Line -->
            <rect class="cut-dashed" x="${x1}" y="${y1}" width="${cardW}" height="${cardH}" />
            
            <!-- Corner Crop Marks (Standard Lab Guillotine Guides) -->
            <!-- Top-Left -->
            <line class="crop-solid" x1="${x1 - L}" y1="${y1}" x2="${x1 + L}" y2="${y1}" />
            <line class="crop-solid" x1="${x1}" y1="${y1 - L}" x2="${x1}" y2="${y1 + L}" />
            <!-- Top-Right -->
            <line class="crop-solid" x1="${x2 - L}" y1="${y1}" x2="${x2 + L}" y2="${y1}" />
            <line class="crop-solid" x1="${x2}" y1="${y1 - L}" x2="${x2}" y2="${y1 + L}" />
            <!-- Bottom-Left -->
            <line class="crop-solid" x1="${x1 - L}" y1="${y2}" x2="${x1 + L}" y2="${y2}" />
            <line class="crop-solid" x1="${x1}" y1="${y2 - L}" x2="${x1}" y2="${y2 + L}" />
            <!-- Bottom-Right -->
            <line class="crop-solid" x1="${x2 - L}" y1="${y2}" x2="${x2 + L}" y2="${y2}" />
            <line class="crop-solid" x1="${x2}" y1="${y2 - L}" x2="${x2}" y2="${y2 + L}" />
        `);

        currentX += cardW + 50;
        if (cardH > currentRowMaxH) {
            currentRowMaxH = cardH;
        }
    }

    // Finalize the last page
    finalizeCurrentPage();

    return await Promise.all(pages);
}

module.exports = {
    processPhoto,
    buildPolaroidCard,
    buildA4Sheets
};
