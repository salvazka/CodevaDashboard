const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const csvDir = path.join(__dirname, '../data-spreadsheets');
const sqlFile = path.join(__dirname, 'insert_history.sql');

const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));

let sql = '';

// Assuming we don't have uuidv4 easily accessible in native PG without extensions, we can let PG generate it via gen_random_uuid() for transactions.
// But we need to link transaction_items to transactions.
// Using explicit UUIDs generated in JS is better.

function parseRupiah(str) {
    if (!str) return 0;
    let s = str.replace(/Rp/g, '').replace(/\./g, '').trim();
    if (!s) return 0;
    return parseInt(s, 10);
}

function parseDate(str) {
    if (!str) return null;
    const parts = str.split(' ');
    if (parts.length < 2) return null;
    let d = parts[0].split('/'); // DD/MM/YYYY
    let t = parts[1];
    if (d.length === 3) {
        // format ISO
        return `${d[2]}-${d[1]}-${d[0]} ${t}+07:00`;
    }
    return null;
}

files.forEach(file => {
    const content = fs.readFileSync(path.join(csvDir, file), 'utf8');
    const lines = content.split('\n');
    let isHeader = true;

    lines.forEach(line => {
        if (!line.trim()) return;
        if (isHeader) {
            isHeader = false;
            return;
        }

        // Use a simple split by comma, works as long as there are no commas in quotes (except if there are)
        // A better approach handles quotes
        const cols = [];
        let inQuotes = false;
        let curr = '';
        for (let i = 0; i < line.length; i++) {
            let char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(curr);
                curr = '';
            } else {
                curr += char;
            }
        }
        cols.push(curr);

        if (cols.length < 10) return;

        const aktivitas = cols[0];
        if (!aktivitas) return;

        const tipeLaptop = cols[1] || '';
        const waktu = cols[3];
        const totalEstimasi = cols[9];
        let noTelp = cols[10];

        // Clean noTelp
        if (noTelp) {
            noTelp = noTelp.replace(/\D/g, '');
        }

        const date = parseDate(waktu);
        if (!date) return;

        const total = parseRupiah(totalEstimasi);
        const txId = randomUUID();
        const guestName = 'Guest';

        const escapedPhone = noTelp ? `'${noTelp}'` : 'NULL';
        const productName = `${aktivitas} (${tipeLaptop})`.replace(/'/g, "''");

        sql += `INSERT INTO transactions (id, type, guest_name, guest_phone, total_amount, total, payment_method, status, created_at) VALUES ('${txId}', 'service', '${guestName}', ${escapedPhone}, ${total}, ${total}, 'cash', 'completed', '${date}');\n`;
        sql += `INSERT INTO transaction_items (transaction_id, product_name, quantity, price, price_at_sale) VALUES ('${txId}', '${productName}', 1, ${total}, ${total});\n`;
    });
});

fs.writeFileSync(sqlFile, sql);
console.log('SQL generated successfully.');
