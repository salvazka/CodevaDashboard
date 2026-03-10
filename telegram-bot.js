import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import PDFDocument from 'pdfkit';

dotenv.config();

// 1. Setup Environment
const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const zhipuApiKey = process.env.VITE_ZHIPU_API_KEY;

if (!token || !supabaseUrl || !supabaseKey || !zhipuApiKey) {
    console.error("Missing required environment variables. Please check .env file.");
    process.exit(1);
}

// 2. Initialize Clients
const bot = new TelegramBot(token, { polling: true });
const supabase = createClient(supabaseUrl, supabaseKey);
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 3. Define Tools
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_inventory',
            description: 'Fetch the current inventory items, including their stock, price, and category. Use this to answer questions about available items.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_inventory',
            description: 'Add a new product to the inventory database.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the product' },
                    price: { type: 'number', description: 'Price in numeric format (e.g. 150000)' },
                    stock: { type: 'number', description: 'Initial stock quantity' },
                    category: { type: 'string', enum: ['Product', 'Service', 'Part', 'Accessory', 'Thermal Paste/Putty/Pad/Liquid'], description: 'Product category' },
                    sku: { type: 'string', description: 'Unique identifier or code (optional)' }
                },
                required: ['name', 'price', 'stock', 'category']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_expenses',
            description: 'Fetch the recent recorded expenses.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_expense',
            description: 'Record a new expense to the database.',
            parameters: {
                type: 'object',
                properties: {
                    description: { type: 'string', description: 'What the expense was for' },
                    amount: { type: 'number', description: 'Total expense amount' },
                    category: { type: 'string', enum: ['operasional', 'stock_purchase'], description: 'Expense category' }
                },
                required: ['description', 'amount', 'category']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_schedule',
            description: 'Create a new service repair or maintenance ticket/schedule.',
            parameters: {
                type: 'object',
                properties: {
                    guest_name: { type: 'string', description: 'Name of the customer. Defaults to "Guest" if not provided.' },
                    guest_phone: { type: 'string', description: 'Phone number of the customer (optional)' },
                    device_model: { type: 'string', description: 'Device/laptop model being repaired' },
                    activity_name: { type: 'string', description: 'What is the service issue, e.g. "Ganti LCD"' },
                    service_type: { type: 'string', enum: ['In-Store', 'On-Site'], description: 'Service location type. If a specific external location is mentioned, it should be On-Site.' },
                    estimated_total: { type: 'number', description: 'Total estimated price' },
                    location: { type: 'string', description: 'Address or specific location for the service (e.g. Kopi Kenangan Stasiun Juanda, Rumah, etc). Do not put this in activity_name.' },
                    scheduled_at: { type: 'string', description: 'Date and time of the schedule in ISO 8601 format (YYYY-MM-DDTHH:mm:ss). Take the date and time from the prompt and convert it to this format.' }
                },
                required: ['device_model', 'activity_name', 'estimated_total']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_transaction',
            description: 'Process a new Point of Sale transaction for a quick sale or simple purchase.',
            parameters: {
                type: 'object',
                properties: {
                    guest_name: { type: 'string', description: 'Name of the customer. Defaults to "Guest" if not provided.' },
                    product_name: { type: 'string', description: 'What is being sold (manual input item name)' },
                    total_amount: { type: 'number', description: 'Total sale amount' },
                    payment_method: { type: 'string', enum: ['cash', 'transfer'], description: 'How they paid' }
                },
                required: ['product_name', 'total_amount', 'payment_method']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_schedules',
            description: 'Fetch existing service schedules/tickets. Can be filtered by status.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Filter by ticket status (e.g., "Scheduled", "In Progress", "Ready", "Completed", "Cancelled"). If not provided, fetches all recent active tickets.' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_schedule_status',
            description: 'Update the status of an existing service schedule/ticket.',
            parameters: {
                type: 'object',
                properties: {
                    guest_name: { type: 'string', description: 'Name of the customer on the ticket' },
                    new_status: { type: 'string', enum: ['Scheduled', 'In Progress', 'Ready', 'Completed', 'Cancelled'], description: 'The new status to set for the schedule' }
                },
                required: ['guest_name', 'new_status']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_schedule_details',
            description: 'Update the date/time or technician assigned to an existing service schedule.',
            parameters: {
                type: 'object',
                properties: {
                    guest_name: { type: 'string', description: 'Name of the customer on the ticket' },
                    scheduled_at: { type: 'string', description: 'The new scheduled date and time in ISO8601 format with local timezone offset, e.g., 2026-03-12T14:00:00+07:00' },
                    technician_name: { type: 'string', description: 'The new technician (PIC) name assigned to handle the service ticket' }
                },
                required: ['guest_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_invoice',
            description: 'Fetch an invoice for a specific customer based on their name or phone number. Searches both POS transactions and completed service schedules.',
            parameters: {
                type: 'object',
                properties: {
                    search_query: { type: 'string', description: 'Customer name or phone number to search for (e.g. "Budi", "08123456789")' },
                    type: { type: 'string', enum: ['pos', 'schedule', 'any'], description: 'Whether looking for pos transactions, schedules, or any' }
                },
                required: ['search_query']
            }
        }
    }
];

// Helper to generate Invoice
const generateInvoicePDF = (tx) => {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `Invoice_${tx.id.substring(0, 8).toUpperCase()}.pdf`;
            const doc = new PDFDocument({ margin: 50, size: 'A5' }); // Or standard size
            const stream = fs.createWriteStream(fileName);

            doc.pipe(stream);

            // Logo
            const logoPath = 'logo.png';
            if (fs.existsSync(logoPath)) {
                // Center the logo. For A5 width is ~420. For Letter it's ~612.
                // Default PDF size is Letter. Let's stick to default if not specified, 
                // but setting a smaller doc or margin is fine. Let's omit size or assume default.
            }
            // Actually, let's keep it clean
            const pageWidth = doc.page.width;

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, (pageWidth - 60) / 2, 40, { width: 60 });
                doc.moveDown(4);
            } else {
                doc.moveDown(2);
            }

            // Header Text
            doc.font('Helvetica-Bold')
                .fontSize(18)
                .fillColor('#001538')
                .text('CODEVATECH', { align: 'center', characterSpacing: 1 });

            doc.moveDown(0.2);

            doc.font('Helvetica')
                .fontSize(10)
                .fillColor('#475569')
                .text('Computer Service Management', { align: 'center' });

            doc.moveDown(0.1);
            doc.text('Tel: +62 851-8351-9490', { align: 'center' });

            doc.moveDown(1.5);

            // Dashed Line
            doc.strokeColor('#cbd5e1').lineWidth(1).dash(2, { space: 2 });
            doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
            doc.moveDown(1.5);
            doc.undash();

            // Layout Customer & Invoice Info
            const currentY = doc.y;
            doc.fillColor('#334155').font('Helvetica').fontSize(10);

            const invoiceStr = `INV-${tx.id.substring(0, 8).toUpperCase()}`;
            doc.text(`Invoice #: `, 50, currentY);
            doc.fillColor('#0f172a').font('Helvetica-Bold').text(invoiceStr, 100, currentY);

            const reqDate = new Date(tx.created_at);
            const dateStr = `${reqDate.getMonth() + 1}/${reqDate.getDate()}/${reqDate.getFullYear()}`;
            doc.fillColor('#334155').font('Helvetica').text(`Date: `, 50, currentY + 15);
            doc.fillColor('#0f172a').text(dateStr, 80, currentY + 15);

            const customerName = tx.members?.name || tx.guest_name || 'Guest';

            doc.fillColor('#334155').font('Helvetica').text(`Customer: `, 280, currentY);
            doc.fillColor('#0f172a').font('Helvetica-Bold').text(customerName, 330, currentY, { width: 150, align: 'left' });

            if (tx.members?.name) {
                // If member exists, position it under customer name
                doc.font('Helvetica').fillColor('#334155').text('MEMBER', 330, currentY + 15);
            }

            doc.y = currentY + 45; // move below the info block

            // Items List
            tx.transaction_items.forEach(item => {
                const itemY = doc.y;
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(item.product_name, 50, itemY, { width: parseInt(pageWidth / 2) });
                doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(`${item.quantity} x Rp ${item.price.toLocaleString('id-ID')}`, 50, itemY + 16);

                doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`Rp ${(item.quantity * item.price).toLocaleString('id-ID')}`, 50, itemY, { align: 'right' });
                doc.moveDown(2);
            });

            doc.moveDown(0.5);

            // Solid Line
            doc.strokeColor('#e2e8f0').lineWidth(1).undash();
            doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
            doc.moveDown(1.5);

            // Total
            const totalY = doc.y;
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text('Total', 50, totalY);
            doc.fillColor('#0000ff').text(`Rp ${tx.total.toLocaleString('id-ID')}`, 50, totalY, { align: 'right' });

            doc.moveDown(4);

            // Footer
            doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Thank you for choosing CodevaTech!', 50, doc.y, { align: 'center' });
            doc.text('Please keep this receipt for warranty.', { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(fileName));
            stream.on('error', reject);
        } catch (e) {
            reject(e);
        }
    });
};

// 4. Execute Tool function
async function executeTool(functionName, args, chatId) {
    console.log(`Executing tool: ${functionName}`, args);
    try {
        if (functionName === 'get_inventory') {
            const { data, error } = await supabase.from('products').select('*').order('name');
            if (error) throw error;
            const formatted = data.map(i => `${i.name} (Stok: ${i.stock}, Harga: ${i.price})`).join('\n');
            return formatted || "Data inventory kosong.";
        }

        else if (functionName === 'add_inventory') {
            const { error } = await supabase.from('products').insert([{
                name: args.name,
                sku: args.sku || null,
                category: args.category || 'Product',
                price: args.price || 0,
                stock: args.stock || 1,
                status: 'active'
            }]);
            if (error) throw error;
            return `Berhasil menambahkan ${args.name} dengan stok ${args.stock} ke database.`;
        }

        else if (functionName === 'get_expenses') {
            const { data, error } = await supabase.from('expenses').select('description, amount, date, category').order('date', { ascending: false }).limit(10);
            if (error) throw error;
            const formatted = data.map(e => `${new Date(e.date).toLocaleDateString()}: ${e.description} - Rp ${e.amount}`).join('\n');
            return formatted || "Belum ada data pengeluaran.";
        }

        else if (functionName === 'add_expense') {
            const { error } = await supabase.from('expenses').insert([{
                description: args.description,
                amount: args.amount,
                category: args.category || 'operasional',
                date: new Date().toISOString()
            }]);
            if (error) throw error;
            return `Pengeluaran untuk "${args.description}" sebesar Rp ${args.amount} berhasil dicatat.`;
        }

        else if (functionName === 'get_schedules') {
            let query = supabase.from('service_tickets').select('*').order('created_at', { ascending: false }).limit(20);
            if (args.status) {
                query = query.ilike('status', `%${args.status}%`);
            }
            const { data, error } = await query;
            if (error) throw error;
            const formatted = data.map(t => {
                const dateStr = t.scheduled_at ? new Date(t.scheduled_at).toLocaleString('id-ID', { hour12: false }) : 'Tidak diatur';
                const phoneStr = t.guest_phone ? ` (Phone: ${t.guest_phone})` : '';
                const techStr = t.technician_name ? ` | PIC/Teknisi: ${t.technician_name}` : '';
                return `[${t.status}] ${t.guest_name}${phoneStr} - ${t.device_model}: ${t.activity_name} (Tgl: ${dateStr})${techStr}`;
            }).join('\n');
            return formatted || `Tidak ada data jadwal${args.status ? ` dengan status ${args.status}` : ''}.`;
        }

        else if (functionName === 'add_schedule') {
            const { error } = await supabase.from('service_tickets').insert([{
                guest_name: args.guest_name || 'Guest',
                guest_phone: args.guest_phone || null,
                device_model: args.device_model,
                activity_name: args.activity_name,
                service_type: args.service_type || (args.location ? 'On-Site' : 'In-Store'),
                estimated_total: args.estimated_total,
                location: args.location || null,
                scheduled_at: args.scheduled_at || null,
                status: 'Scheduled'
            }]);
            if (error) throw error;
            const timeText = args.scheduled_at ? ` pada waktu ${args.scheduled_at}` : '';
            const locText = args.location ? ` di ${args.location}` : '';
            return `Berhasil membuat jadwal servis: ${args.activity_name} untuk ${args.guest_name || 'Guest'} (${args.device_model})${timeText}${locText}. Estimasi biaya Rp ${args.estimated_total}.`;
        }

        else if (functionName === 'add_transaction') {
            const customerName = args.guest_name || 'Guest';
            const totalAmount = args.total_amount || 0;

            const { data: newTx, error: txError } = await supabase
                .from('transactions')
                .insert([{
                    guest_name: customerName,
                    total: totalAmount,
                    payment_method: args.payment_method || 'cash',
                    status: 'completed'
                }])
                .select()
                .single();

            if (txError) throw txError;

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert([{
                    transaction_id: newTx.id,
                    product_name: args.product_name || 'Manual Sale via AI',
                    quantity: 1,
                    price: totalAmount
                }]);

            if (itemsError) throw itemsError;

            return `Berhasil merekam transaksi (kategori POS): Penjualan produk "${args.product_name}" ke ${customerName} dengan total Rp ${totalAmount} via ${args.payment_method}.`;
        }

        else if (functionName === 'update_schedule_status') {
            const { data: tickets, error: searchError } = await supabase
                .from('service_tickets')
                .select('*')
                .ilike('guest_name', `%${args.guest_name}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (searchError) throw searchError;
            if (!tickets || tickets.length === 0) return `Jadwal untuk pelanggan "${args.guest_name}" tidak ditemukan.`;

            const ticketId = tickets[0].id;
            const { error: updateError } = await supabase
                .from('service_tickets')
                .update({ status: args.new_status })
                .eq('id', ticketId);

            if (updateError) throw updateError;
            return `Status jadwal servis pelanggan "${tickets[0].guest_name}" (${tickets[0].device_model}) berhasil diubah menjadi "${args.new_status}".`;
        }

        else if (functionName === 'update_schedule_details') {
            const { data: tickets, error: searchError } = await supabase
                .from('service_tickets')
                .select('*')
                .ilike('guest_name', `%${args.guest_name}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (searchError) throw searchError;
            if (!tickets || tickets.length === 0) return `Jadwal untuk pelanggan "${args.guest_name}" tidak ditemukan.`;

            const ticketId = tickets[0].id;
            let updates = {};
            if (args.scheduled_at) updates.scheduled_at = args.scheduled_at;
            if (args.technician_name) updates.technician_name = args.technician_name;

            if (Object.keys(updates).length === 0) return "Tidak ada data detail jadwal yang diubah. Harap spesifikasikan update jam atau nama teknisi.";

            const { error: updateError } = await supabase
                .from('service_tickets')
                .update(updates)
                .eq('id', ticketId);

            if (updateError) throw updateError;

            let messageStr = [];
            if (updates.scheduled_at) messageStr.push(`jam ke ${new Date(updates.scheduled_at).toLocaleString('id-ID', { hour12: false })}`);
            if (updates.technician_name) messageStr.push(`ditugaskan ke Teknisi ${updates.technician_name}`);

            return `Pembaruan jadwal servis "${tickets[0].guest_name}" berhasil: ${messageStr.join(' dan ')}.`;
        }

        else if (functionName === 'get_invoice') {
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select(`id, created_at, guest_name, guest_phone, total, payment_method, type, members(name, phone), transaction_items(product_name, quantity, price)`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (txError) throw txError;

            const { data: scheduleData, error: schedError } = await supabase
                .from('service_tickets')
                .select(`*`)
                .eq('status', 'Completed')
                .order('created_at', { ascending: false })
                .limit(100);

            if (schedError) throw schedError;

            const query = args.search_query.toLowerCase();
            const searchType = args.type || 'any';

            let matched = [];

            // Search transactions
            if (searchType === 'any' || searchType === 'pos') {
                const matchedTx = txData.filter(tx => {
                    const name = (tx.members?.name || tx.guest_name || 'Guest').toLowerCase();
                    const phone = (tx.members?.phone || tx.guest_phone || '').toLowerCase();
                    return name.includes(query) || phone.includes(query);
                });
                matched = [...matched, ...matchedTx];
            }

            // Search completed schedules
            if (searchType === 'any' || searchType === 'schedule') {
                const matchedSched = scheduleData.filter(sch => {
                    const name = (sch.guest_name || 'Guest').toLowerCase();
                    const phone = (sch.guest_phone || '').toLowerCase();
                    return name.includes(query) || phone.includes(query);
                }).map(sch => ({
                    id: sch.id,
                    created_at: sch.created_at,
                    guest_name: sch.guest_name,
                    guest_phone: sch.guest_phone,
                    total: sch.estimated_total || 0,
                    payment_method: 'pending',
                    type: 'schedule_invoice',
                    members: null,
                    transaction_items: [{
                        product_name: `${sch.activity_name} (${sch.device_model})`,
                        quantity: 1,
                        price: sch.estimated_total || 0
                    }]
                }));
                matched = [...matched, ...matchedSched];
            }

            // Sort matches so newest is first between combined sources
            matched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            if (matched.length === 0) return `Tidak ditemukan invoice/transaksi untuk pencarian "${args.search_query}".`;

            try {
                if (chatId) {
                    bot.sendMessage(chatId, `_Membuat dokumen PDF untuk invoice terbaru..._`, { parse_mode: 'Markdown' });
                    const latestTx = matched[0];
                    const pdfFile = await generateInvoicePDF(latestTx);
                    await bot.sendDocument(chatId, pdfFile);
                    fs.unlinkSync(pdfFile); // clean up after sending
                }
            } catch (err) {
                console.error("PDF generation/sending error:", err);
            }

            const recentMatches = matched.slice(0, 3);
            const formatted = recentMatches.map(tx => {
                const customer = tx.members?.name || tx.guest_name || 'Guest';
                const items = tx.transaction_items.map(i => `${i.quantity}x ${i.product_name}`).join(', ');
                return `[INV-${tx.id.substring(0, 6).toUpperCase()}] Tgl: ${new Date(tx.created_at).toLocaleDateString()} | Pelanggan: ${customer}\nItem: ${items}\nTotal: Rp ${tx.total} (${tx.payment_method})`;
            }).join('\n\n');

            return `Ditemukan ${matched.length} invoice. Tiga invoice terbaru:\n${formatted}`;
        }

        return `Error: Function ${functionName} tidak dikenali.`;
    } catch (err) {
        console.error("Tool Execution Error:", err);
        return `Database Error: ${err.message}`;
    }
}

// 5. User conversations store (basic memory per chat)
const userSessions = {};

// 6. Handle Incoming Messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text === '/start') {
        const welcome = "Halo! Saya adalah AI Assistant CodevaTech. Saya terkoneksi dengan Dashboard. Kirim pesan apa saja tentang inventory, expenses, absensi jadwal, atau penjualan!";
        bot.sendMessage(chatId, welcome);
        userSessions[chatId] = [];
        return;
    }

    if (text === '/clear') {
        userSessions[chatId] = [];
        bot.sendMessage(chatId, "Riwayat percakapan telah dibersihkan.");
        return;
    }

    // Initialize session if not exists
    if (!userSessions[chatId]) {
        userSessions[chatId] = [];
    }

    // Send typing action
    bot.sendChatAction(chatId, 'typing');

    const currentDate = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'full' });
    let chatHistory = userSessions[chatId];

    // Add current user message
    chatHistory.push({ role: 'user', content: text });

    // Prepare messages for API (prepend system prompt dynamically with fresh time)
    const systemPrompt = {
        role: 'system',
        content: `You are a professional AI Assistant for a POS and Inventory system called CodevaTech. You communicate primarily in Indonesian. You use the provided tools to interact with the database. Format your responses nicely for Telegram. Current Date and Time: ${currentDate}. in WITA / Asia/Makassar / GMT+8 context. Please ensure any generated 'scheduled_at' uses full ISO8601 format mapping to this local time (e.g. 2026-03-12T12:00:00+08:00) so it's correct for the local DB. If extracting a date and time for a schedule, output it in YYYY-MM-DDTHH:mm:ss format. If asked who is assigned to a schedule or what the customer phone number is, look carefully at the returned PIC/Teknisi and Phone tags from get_schedules.`
    };
    let apiMessages = [systemPrompt, ...chatHistory];

    try {
        let apiRes = await axios.post(ZHIPU_API_URL, {
            model: "glm-4.5-flash",
            messages: apiMessages,
            tools: TOOLS,
            tool_choice: "auto",
            temperature: 0.1,
            top_p: 0.7,
        }, { headers: { 'Authorization': `Bearer ${zhipuApiKey}` } });

        let responseMessage = apiRes.data.choices[0].message;

        while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            // Keep tool_calls for context
            chatHistory.push(responseMessage);
            apiMessages = [systemPrompt, ...chatHistory];

            for (const toolCall of responseMessage.tool_calls) {
                const funcName = toolCall.function.name;
                let funcArgs;
                try {
                    funcArgs = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                    funcArgs = {};
                }

                // Show a mini status to user
                bot.sendMessage(chatId, `Sedang mengakses database (${funcName})...`);

                const toolResult = await executeTool(funcName, funcArgs, chatId);

                chatHistory.push({
                    role: 'tool',
                    content: toolResult,
                    tool_call_id: toolCall.id,
                    name: funcName
                });
            }

            apiMessages = [systemPrompt, ...chatHistory];

            // Re-call API to summarize tool execution
            apiRes = await axios.post(ZHIPU_API_URL, {
                model: "glm-4.5-flash",
                messages: apiMessages,
                tools: TOOLS
            }, { headers: { 'Authorization': `Bearer ${zhipuApiKey}` } });

            responseMessage = apiRes.data.choices[0].message;
        }

        if (responseMessage.content) {
            chatHistory.push({ role: 'assistant', content: responseMessage.content });
            bot.sendMessage(chatId, responseMessage.content);
        }

        // Limit history to 20 messages to save tokens
        if (chatHistory.length > 20) {
            userSessions[chatId] = chatHistory.slice(chatHistory.length - 20);
        }

    } catch (err) {
        console.error(err.response?.data || err.message);
        bot.sendMessage(chatId, "❌ Maaf, terjadi kesalahan saat menghubungi server AI.");

        // Remove the user message that caused the error so they can try again
        chatHistory.pop();
    }
});

console.log("🚀 Telegram Bot is running...");
