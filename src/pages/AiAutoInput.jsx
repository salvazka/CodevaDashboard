import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wand2, Loader2, Send, Database, User, Bot, Plus, MessageSquare, Trash2 } from 'lucide-react';
import clsx from 'clsx';

// --- Zhipu AI Integration ---
const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY;
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_NAME = 'glm-4.5-flash';

// --- Available Tools for AI ---
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
const INITIAL_MESSAGE = {
    role: 'assistant',
    content: 'Halo! Saya adalah AI Assistant CodevaTech. Saya bisa membantu Anda mengecek stok gudang, mengecek pengeluaran, menambahkan barang, mencatat penjualan POS, atau membuat jadwal servis. Ada yang bisa saya bantu hari ini?'
};

export default function AiAutoInput() {
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Load sessions from local storage on mount
    useEffect(() => {
        const storedSessions = localStorage.getItem('ai_sessions');
        if (storedSessions) {
            const parsed = JSON.parse(storedSessions);
            setSessions(parsed);
            if (parsed.length > 0) {
                const recentSession = parsed[0];
                setActiveSessionId(recentSession.id);
                setMessages(recentSession.messages);
            } else {
                startNewSession();
            }
        } else {
            startNewSession();
        }
    }, []);

    // Save active session to local storage when messages change
    useEffect(() => {
        if (!activeSessionId || messages.length === 0) return;

        let updatedSessions = [...sessions];
        const sessionIndex = updatedSessions.findIndex(s => s.id === activeSessionId);

        // Auto-generate title from the first user message if title is "New Chat"
        let title = "New Chat";
        if (sessionIndex !== -1) {
            title = updatedSessions[sessionIndex].title;
            if (title === "New Chat") {
                const firstUserMsg = messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                }
            }
        }

        const sessionData = {
            id: activeSessionId,
            title: title,
            messages: messages,
            updatedAt: new Date().toISOString()
        };

        if (sessionIndex >= 0) {
            updatedSessions[sessionIndex] = sessionData;
        } else {
            updatedSessions.unshift(sessionData);
        }

        // Sort by most recently updated
        updatedSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        setSessions(updatedSessions);
        localStorage.setItem('ai_sessions', JSON.stringify(updatedSessions));
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const startNewSession = () => {
        const newId = Date.now().toString();
        const initialMsgs = [INITIAL_MESSAGE];

        const newSession = {
            id: newId,
            title: "New Chat",
            messages: initialMsgs,
            updatedAt: new Date().toISOString()
        };

        const updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        localStorage.setItem('ai_sessions', JSON.stringify(updatedSessions));

        setActiveSessionId(newId);
        setMessages(initialMsgs);
    };

    const loadSession = (id) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setActiveSessionId(session.id);
            setMessages(session.messages);
        }
    };

    const deleteSession = (e, id) => {
        e.stopPropagation();
        const updatedSessions = sessions.filter(s => s.id !== id);
        setSessions(updatedSessions);
        localStorage.setItem('ai_sessions', JSON.stringify(updatedSessions));

        if (activeSessionId === id || updatedSessions.length === 0) {
            if (updatedSessions.length > 0) {
                setActiveSessionId(updatedSessions[0].id);
                setMessages(updatedSessions[0].messages);
            } else {
                startNewSession();
            }
        }
    };

    // --- Tool Execution Logic ---
    const executeTool = async (functionName, args) => {
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
                const formatted = data.map(t => `[${t.status}] ${t.guest_name} - ${t.device_model}: ${t.activity_name} (Tgl: ${t.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : 'Tidak diatur'})`).join('\n');
                return formatted || `Tidak ada data jadwal${args.status ? ` dengan status ${args.status}` : ''}.`;
            }

            else if (functionName === 'add_schedule') {
                const { error } = await supabase.from('service_tickets').insert([{
                    guest_name: args.guest_name,
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
                return `Berhasil membuat jadwal servis: ${args.activity_name} untuk ${args.guest_name} (${args.device_model})${timeText}${locText}. Estimasi biaya Rp ${args.estimated_total}.`;
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

                if (searchType === 'any' || searchType === 'pos') {
                    const matchedTx = txData.filter(tx => {
                        const name = (tx.members?.name || tx.guest_name || 'Guest').toLowerCase();
                        const phone = (tx.members?.phone || tx.guest_phone || '').toLowerCase();
                        return name.includes(query) || phone.includes(query);
                    });
                    matched = [...matched, ...matchedTx];
                }

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

                matched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                if (matched.length === 0) return `Tidak ditemukan invoice/transaksi untuk pencarian "${args.search_query}".`;

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
    };

    const callZhipuAPI = async (currentMessages) => {
        const apiMessages = currentMessages.map(m => ({
            role: m.role,
            content: m.content || "",
            ...(m.tool_calls && { tool_calls: m.tool_calls }),
            ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
            ...(m.name && { name: m.name })
        }));

        const currentDate = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'full' });
        apiMessages.unshift({
            role: 'system',
            content: `You are a professional AI Assistant for a POS and Inventory system called CodevaTech. You communicate primarily in Indonesian. You can read inventory, add inventory, read expenses, and add expenses using the provided tools. Be polite and concise. Current Date and Time: ${currentDate}. If extracting a date and time for a schedule, output it in YYYY-MM-DDTHH:mm:ss format.`
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: apiMessages,
                tools: TOOLS,
                tool_choice: "auto",
                temperature: 0.1,
                top_p: 0.7,
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Failed to connect to API');
        }

        return await response.json();
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setLoading(true);

        let chatHistory = [...messages, { role: 'user', content: userMsg }];
        setMessages(chatHistory);

        try {
            let apiResponse = await callZhipuAPI(chatHistory);
            let responseMessage = apiResponse.choices[0].message;

            while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                chatHistory.push(responseMessage);
                setMessages([...chatHistory]);

                for (const toolCall of responseMessage.tool_calls) {
                    const funcName = toolCall.function.name;
                    const funcArgs = JSON.parse(toolCall.function.arguments);
                    const toolResult = await executeTool(funcName, funcArgs);

                    chatHistory.push({
                        role: 'tool',
                        content: toolResult,
                        tool_call_id: toolCall.id,
                        name: funcName
                    });
                }
                setMessages([...chatHistory]);

                apiResponse = await callZhipuAPI(chatHistory);
                responseMessage = apiResponse.choices[0].message;
            }

            if (responseMessage.content) {
                chatHistory.push({ role: 'assistant', content: responseMessage.content });
                setMessages([...chatHistory]);
            }

        } catch (err) {
            console.error('Chat Error:', err);
            setMessages([
                ...chatHistory,
                { role: 'assistant', content: `Maaf, terjadi kesalahan saat menghubungi sistem: ${err.message}`, isError: true }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex relative bg-slate-50 dark:bg-slate-900 overflow-hidden">

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950">
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between z-30 shrink-0 shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Wand2 className="text-primary" size={24} />
                            AI Assistant
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Mengobrol & instruksikan AI untuk mengelola data.</p>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-w-4xl mx-auto space-y-6 pb-4">
                        {messages.map((msg, index) => {
                            if (msg.role === 'tool' || msg.tool_calls) {
                                if (msg.role === 'tool') {
                                    return (
                                        <div key={index} className="flex justify-center my-2">
                                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex items-center gap-1">
                                                <Database size={12} /> Action Performed: {msg.name}
                                            </span>
                                        </div>
                                    );
                                }
                                return null;
                            }

                            const isUser = msg.role === 'user';
                            return (
                                <div key={index} className={clsx("flex w-full gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                        isUser ? "bg-primary text-white" : "bg-white dark:bg-slate-800 text-primary border border-slate-200 dark:border-slate-700"
                                    )}>
                                        {isUser ? <User size={20} /> : <Bot size={20} />}
                                    </div>

                                    <div className={clsx(
                                        "px-5 py-3.5 rounded-2xl max-w-[85%] sm:max-w-[75%] text-sm shadow-sm",
                                        isUser
                                            ? "bg-primary text-white rounded-tr-none"
                                            : msg.isError
                                                ? "bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50"
                                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none"
                                    )}>
                                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                    </div>
                                </div>
                            );
                        })}

                        {loading && (
                            <div className="flex w-full gap-4 flex-row">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-primary border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot size={20} />
                                </div>
                                <div className="px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm flex items-center gap-2">
                                    <span className="flex space-x-1">
                                        <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce"></span>
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </main>

                <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0">
                    <div className="max-w-4xl mx-auto relative">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading}
                                placeholder="Ketik instruksi atau pertanyaan Anda di sini..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-6 py-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            </button>
                        </form>
                        <p className="text-center text-xs text-slate-400 mt-3">
                            AI Assistant menggunakan model GLM-4.5-Flash. Data disimpan secara lokal di browser Anda.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Chat History */}
            <div className="w-64 xl:w-80 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 hidden md:flex">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={startNewSession}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold transition-colors text-sm shadow-sm"
                    >
                        <Plus size={18} />
                        New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1">Recent Chats</h3>
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => loadSession(session.id)}
                            className={clsx(
                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors group",
                                activeSessionId === session.id
                                    ? "bg-blue-50 dark:bg-slate-800 border-primary/20 border"
                                    : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border-transparent border"
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare size={16} className={clsx(
                                    "shrink-0",
                                    activeSessionId === session.id ? "text-primary" : "text-slate-400"
                                )} />
                                <div className="truncate">
                                    <p className={clsx(
                                        "text-sm truncate font-medium",
                                        activeSessionId === session.id ? "text-primary" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {session.title}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {new Date(session.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => deleteSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
