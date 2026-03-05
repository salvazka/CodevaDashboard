const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    if (line.includes('=')) {
        const [k, ...v] = line.split('=');
        env[k.trim()] = v.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://zpzrtvnjyllhexnjgxqx.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('Missing VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(__dirname, '../data-spreadsheets');
const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));

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
        return `${d[2]}-${d[1]}-${d[0]}T${t}+07:00`;
    }
    return null;
}

async function run() {
    const transactions = [];
    const items = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(csvDir, file), 'utf8');
        const lines = content.split('\n');
        let isHeader = true;

        for (const line of lines) {
            if (!line.trim()) continue;
            if (isHeader) {
                isHeader = false;
                continue;
            }

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

            if (cols.length < 10) continue;

            const aktivitas = cols[0];
            if (!aktivitas) continue;

            const tipeLaptop = cols[1] || '';
            const waktu = cols[3];
            const totalEstimasi = cols[9];
            let noTelp = cols[10];

            if (noTelp) {
                noTelp = noTelp.replace(/\D/g, '');
            }

            const date = parseDate(waktu);
            if (!date) continue;

            const total = parseRupiah(totalEstimasi);
            const txId = randomUUID();

            transactions.push({
                id: txId,
                type: 'service',
                guest_name: 'Guest',
                guest_phone: noTelp || null,
                total_amount: total,
                total: total,
                payment_method: 'cash',
                status: 'completed',
                created_at: date
            });

            items.push({
                transaction_id: txId,
                product_name: `${aktivitas.trim()} (${tipeLaptop.trim()})`,
                quantity: 1,
                price: total,
                price_at_sale: total
            });
        }
    }

    console.log(`Prepared ${transactions.length} transactions and ${items.length} items`);

    // Insert in batches of 50 to avoid any limits
    for (let i = 0; i < transactions.length; i += 50) {
        const batchTxs = transactions.slice(i, i + 50);
        const { error: txError } = await supabase.from('transactions').insert(batchTxs);
        if (txError) {
            console.error('Error inserting transactions:', txError);
            return;
        }

        const batchItems = items.slice(i, i + 50);
        const { error: itemsError } = await supabase.from('transaction_items').insert(batchItems);
        if (itemsError) {
            console.error('Error inserting transaction items:', itemsError);
            return;
        }
        console.log(`Inserted batch ${i / 50 + 1}`);
    }

    console.log('Import completed successfully!');
}

run();
