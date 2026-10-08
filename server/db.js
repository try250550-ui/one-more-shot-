const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'orders.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize orders table schema
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        itemsJson TEXT NOT NULL,
        printedAt TEXT,
        tokenNumber INTEGER,
        orderNumber INTEGER
    )
`);

try {
    db.exec(`ALTER TABLE orders ADD COLUMN tokenNumber INTEGER`);
} catch (e) {}

try {
    db.exec(`ALTER TABLE orders ADD COLUMN orderNumber INTEGER`);
} catch (e) {}

// Backfill any existing orders missing orderNumber in chronological order
(function backfillOrderNumbers() {
    try {
        const rows = db.prepare('SELECT id, orderNumber FROM orders ORDER BY createdAt ASC').all();
        let currentNum = 1;
        const updateStmt = db.prepare('UPDATE orders SET orderNumber = ? WHERE id = ?');
        for (const row of rows) {
            if (!row.orderNumber) {
                updateStmt.run(currentNum, row.id);
            }
            currentNum++;
        }
    } catch (e) {}
})();

/**
 * Gets next sequential order number (1, 2, 3...)
 */
function getNextOrderNumber() {
    const row = db.prepare('SELECT MAX(orderNumber) as maxOrder FROM orders').get();
    return (row && row.maxOrder) ? row.maxOrder + 1 : 1;
}

/**
 * Gets next sequential token number for order printing
 */
function getNextTokenNumber() {
    const row = db.prepare('SELECT MAX(tokenNumber) as maxToken FROM orders').get();
    return (row && row.maxToken) ? row.maxToken + 1 : 1;
}

/**
 * Loads all orders from SQLite database
 * @returns {Array} - Array of order objects
 */
function getAllOrders() {
    const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
    return rows.map(r => ({
        id: r.id,
        orderId: r.id,
        orderNumber: r.orderNumber || null,
        status: r.status,
        createdAt: r.createdAt,
        timestamp: r.createdAt,
        printedAt: r.printedAt || null,
        tokenNumber: r.tokenNumber || null,
        items: JSON.parse(r.itemsJson || '[]')
    }));
}

/**
 * Inserts or updates an order in SQLite
 * @param {Object} order
 */
function saveOrder(order) {
    const stmt = db.prepare(`
        INSERT INTO orders (id, status, createdAt, itemsJson, printedAt, tokenNumber, orderNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            itemsJson = excluded.itemsJson,
            printedAt = excluded.printedAt,
            tokenNumber = COALESCE(excluded.tokenNumber, orders.tokenNumber),
            orderNumber = COALESCE(excluded.orderNumber, orders.orderNumber)
    `);
    stmt.run(
        order.id || order.orderId,
        order.status,
        order.createdAt || order.timestamp || new Date().toISOString(),
        JSON.stringify(order.items || []),
        order.printedAt || null,
        order.tokenNumber || null,
        order.orderNumber || null
    );
}

/**
 * Updates status to 'ready' and sets printedAt timestamp in SQLite
 * @param {string} orderId
 * @param {string} printedAt
 */
function updateOrderPrintedAt(orderId, printedAt = new Date().toISOString()) {
    const stmt = db.prepare(`
        UPDATE orders
        SET status = 'ready', printedAt = ?
        WHERE id = ?
    `);
    stmt.run(printedAt, orderId);
}

module.exports = {
    db,
    getAllOrders,
    saveOrder,
    updateOrderPrintedAt,
    getNextTokenNumber,
    getNextOrderNumber
};
