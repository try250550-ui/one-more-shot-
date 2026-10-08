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
        tokenNumber INTEGER
    )
`);

try {
    db.exec(`ALTER TABLE orders ADD COLUMN tokenNumber INTEGER`);
} catch (e) {}

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
        INSERT INTO orders (id, status, createdAt, itemsJson, printedAt, tokenNumber)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            itemsJson = excluded.itemsJson,
            printedAt = excluded.printedAt,
            tokenNumber = COALESCE(excluded.tokenNumber, orders.tokenNumber)
    `);
    stmt.run(
        order.id || order.orderId,
        order.status,
        order.createdAt || order.timestamp || new Date().toISOString(),
        JSON.stringify(order.items || []),
        order.printedAt || null,
        order.tokenNumber || null
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
    getNextTokenNumber
};
