import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// Initialize the standard Google Generative AI SDK wrapper
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Required for cloud deployment containers like Render
        timeout: 0, 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--ignore-certificate-errors',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
});

client.on('qr', (qr) => {
    console.log('\n================================================================');
    console.log('👉 QR CODE FETCHED! OPEN WHATSAPP ON YOUR PHONE TO SCAN IT:');
    console.log('================================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n======================================================');
    console.log('🚀 SYSTEM ONLINE: CLOUD DEPLOYED GEMINI BOT IS LIVE 🚀');
    console.log('======================================================\n');
});

client.on('message', async (msg) => {
    console.log(`[INCOMING MESSAGE] From: ${msg.from} | Text: "${msg.body}"`);
    await processAndReply(msg);
});

client.on('message_create', async (msg) => {
    if (msg.fromMe && !msg.body.startsWith('🤖') && (msg.to.endsWith('@c.us') || msg.to.endsWith('@lid'))) {
        console.log(`[SELF MESSAGE] Texted yourself: "${msg.body}"`);
        await processAndReply(msg, true);
    }
});

async function processAndReply(msg, isSelf = false) {
    try {
        const targetNumber = isSelf ? msg.to : msg.from;

        if (!targetNumber.endsWith('@g.us')) {
            if (!msg.body || msg.body.trim() === "") return;

            console.log(` -> Forwarding message payload to Google Gemini...`);
            const aiResponse = await generateAIResponse(msg.body);

            console.log(` -> Delivering response bubble packet...`);
            await client.sendMessage(targetNumber, aiResponse);
            console.log(`🎉 Success! Reply sent to ${targetNumber}\n`);
        }
    } catch (error) {
        console.error('CRITICAL ERROR inside structural transmission router:', error);
    }
}

async function generateAIResponse(userPrompt) {
    try {
        // Correctly calls the active, long-term flagship free model tier 'gemini-1.5-flash'
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "You are a professional, polite, and helpful assistant. Keep your answers brief (under 3 sentences maximum). Always reply in the same language the user writes to you."
        });

        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        return response.text();
    } catch (err) {
        console.error('Gemini API Integration Error:', err.message);
        return "🤖 My internal cloud link hit a temporary validation snag. Please check system configurations!";
    }
}

client.initialize();
