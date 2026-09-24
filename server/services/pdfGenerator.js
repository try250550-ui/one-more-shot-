const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Generates Multi-Page A4 PDF from an array of 300 DPI sheet buffers
 * @param {Array<Buffer>|Buffer} a4SheetBuffers - Single buffer or array of page buffers
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>}
 */
async function generatePDF(a4SheetBuffers, outputPath) {
    const buffers = Array.isArray(a4SheetBuffers) ? a4SheetBuffers : [a4SheetBuffers];

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            for (const buf of buffers) {
                doc.addPage({ size: 'A4', margin: 0 });
                // A4 dimensions in points: 595.28 x 841.89
                doc.image(buf, 0, 0, { width: 595.28, height: 841.89 });
            }

            doc.end();

            stream.on('finish', () => resolve(outputPath));
            stream.on('error', reject);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePDF };
