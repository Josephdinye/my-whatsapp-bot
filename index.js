import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import express from 'express'; // 🛠️ Express framework added
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// 1. Initialize Express Web Server for Render Port Binding
const app = express();
const PORT = process.env.PORT || 10000; // Render auto-injects the required port here
let latestQRCodeRaw = null; // Memory variable to hold the live QR string

// Serve the live QR code inside your public URL link!
app.get('/', (req, res) => {
    if (latestQRCodeRaw) {
        res.send(`
            <html>
                <head>
                    <title>WhatsApp Bot Dashboard</title>
                    <meta http-equiv="refresh" content="5"> <!-- Auto-refreshes the page every 5 seconds -->
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f0f2f5; }
                        .container { background: white; padding: 30px; display: inline-block; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                        h1 { color: #128C7E; }
                        img { margin-top: 20px; border: 1px solid #ccc; padding: 10px; background: white; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Sync your WhatsApp Bot</h1>
                        <p>Open WhatsApp > Settings > Linked Devices > Scan the QR below:</p>
                        <!-- Uses Google's chart API to instantly turn our raw text code into a scannable image! -->
                        <img src="https://googleapis.com{encodeURIComponent(latestQRCodeRaw)}&choe=UTF-8" alt="WhatsApp QR Code" />
                        <p style="color: #666; font-size: 12px; margin-top: 15px;">Page auto-refreshes. If the bot connects, this image will update.</p>
                    </div>
                </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
                <body style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h2>🔄 System Initializing...</h2>
                    <p>The WhatsApp engine is booting up. Please refresh this page in 10 seconds.</p>
                </body>
            </html>
        `);
    }
});

// Start the public web server listener
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express gateway port binding successful on port ${PORT}`);
});

// 2. Initialize the standard Google Generative AI SDK wrapper
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3. Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
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

// 4. EVENT: Catches the QR string matrix and mirrors it to our Express webpage variable
client.on('qr', (qr) => {
    latestQRCodeRaw = qr; // Stores the raw payload for the webpage view link
    console.log('👉 New QR Code cached. Refresh your public browser link now!');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    latestQRCodeRaw = null; // Clear the QR code image once successfully logged in
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
