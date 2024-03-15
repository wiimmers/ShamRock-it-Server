const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('./ticket.db');
exports.db = db;

// Create a table with keys for tickets if one does not exist\
async function createTable(keys) {
    return new Promise((resolve, reject) => {
        db.run("CREATE TABLE IF NOT EXISTS tickets(" + keys + ");", (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
exports.createTable = createTable

// Insert rows into SQLite database based on their corresponding keys 
async function insertRows(keys, values) {
    await createTable(keys);
    
    let sql = "INSERT INTO tickets (" + keys + ") VALUES (" + "'" + values + "'" + ")";

    db.run(sql);
}
exports.insertRows = insertRows;

// Exports ticket ids as an array 
async function getTickets() {
    await db.run("CREATE TABLE IF NOT EXISTS tickets(ticketNo,pcId,subject,name,email,ext,status)");
    let select = "SELECT ticketNo FROM tickets";

    const rows = await new Promise((resolve, reject) => {
        db.all(select, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });

    return rows;

}
exports.getTickets = getTickets;
