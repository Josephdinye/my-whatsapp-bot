import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import express from 'express';
import qrImage from 'qr-image';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
let latestQRCodeRaw = null; 
let isClientReady = false; 

// Detect if running on Render's cloud platform or local machine
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Serve the live QR code website dashboard page
app.get('/', (req, res) => {
    if (isClientReady) {
        return res.send(`
            <html>
                <body style="font-family: Arial; text-align: center; margin-top: 50px; background-color: #f0f2f5;">
                    <div style="background: white; padding: 30px; display: inline-block; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #128C7E;">🟢 Bot is Connected & Active</h2>
                        <p>The engine is fully synchronized with your phone's WhatsApp app.</p>
                    </div>
                </body>
            </html>
        `);
    }

    if (latestQRCodeRaw) {
        try {
            const qrPngBuffer = qrImage.imageSync(latestQRCodeRaw, { type: 'png' });
            const qrBase64String = qrPngBuffer.toString('base64');
            const finalImageSource = `data:image/png;base64,${qrBase64String}`;

            res.send(`
                <html>
                    <head>
                        <title>WhatsApp Bot Dashboard</title>
                        <meta http-equiv="refresh" content="7">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f0f2f5; }
                            .container { background: white; padding: 30px; display: inline-block; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                            h1 { color: #128C7E; }
                            img { margin-top: 20px; border: 1px solid #ccc; padding: 10px; background: white; max-width: 100%; height: auto; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Sync your WhatsApp Bot</h1>
                            <p>Open WhatsApp on your phone > Settings > Linked Devices > Scan the QR below:</p>
                            <img src="${finalImageSource}" alt="WhatsApp QR Code" />
                            <p style="color: #666; font-size: 12px; margin-top: 15px;">Page auto-refreshes. Once successfully scanned, the code disappears.</p>
                        </div>
                    </body>
                </html>
            `);
        } catch (imageErr) {
            console.error("Image generation crash:", imageErr);
            res.send("<h2>⚠️ Error rendering the visual QR layout matrix.</h2>");
        }
    } else {
        res.send(`
            <html>
                <body style="font-family: Arial; text-align: center; margin-top: 50px; background-color: #f0f2f5;">
                    <div style="background: white; padding: 30px; display: inline-block; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <h2>🔄 System Initializing...</h2>
                        <p>Generating pairing token matrix. Please wait a moment.</p>
                    </div>
                </body>
            </html>
        `);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express gateway port binding successful on port ${PORT}`);
    if (!isProduction) {
        console.log(`Open http://localhost:${PORT} in your browser to view the QR code.`);
    }
});

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 90000, // Increased to 90 seconds to avoid connection dropouts
    qrMaxRetries: 5,
    puppeteer: {
        headless: true, 
        // 🛠️ SMART CONFIG: Uses Render's system path on cloud, or default Windows path locally
        executablePath: isProduction 
            ? '/usr/bin/google-chrome-stable' 
            : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        timeout: 90000, // Wait up to 90 seconds for ://whatsapp.com to open
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--dns-prefetch-disable'
        ]
    }
});

client.on('qr', (qr) => {
    latestQRCodeRaw = qr; 
    isClientReady = false;
    console.log('👉 New QR Code generated.');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('🔒 Authentication credentials saved successfully.');
    latestQRCodeRaw = null;
});

client.on('ready', () => {
    latestQRCodeRaw = null; 
    isClientReady = true;
    console.log('\n======================================================');
    console.log('🚀 SYSTEM ONLINE: BOT IS LIVE AND WAITING FOR MESSAGES 🚀');
    console.log('======================================================\n');
});

// COMBINED MESSAGE HANDLER: Handles responses securely without infinite recursive loops
client.on('message_create', async (msg) => {
    // Ignore group chats
    if (msg.from.endsWith('@g.us') || msg.to.endsWith('@g.us')) return;
    
    // Ignore empty messages
    if (!msg.body || msg.body.trim() === "") return;

    // Handle messages sent BY the bot account itself
    if (msg.fromMe) {
        // Only reply if you text your own number directly as an explicit test
        if (msg.to === msg.from && !msg.body.startsWith('🤖')) {
            console.log(`[SELF MESSAGE] Texted yourself: "${msg.body}"`);
            await processAndReply(msg, msg.from);
        }
        return; 
    }

    // Handle incoming messages from other users
    console.log(`[INCOMING MESSAGE] From: ${msg.from} | Text: "${msg.body}"`);
    await processAndReply(msg, msg.from);
});

client.on('disconnected', (reason) => {
    console.log(`❌ Client disconnected: ${reason}`);
    isClientReady = false;
    latestQRCodeRaw = null;
    client.initialize(); 
});

async function processAndReply(msg, targetNumber) {
    try {
        console.log(` -> Forwarding message payload to Google Gemini...`);
        const aiResponse = await generateAIResponse(msg.body);

        console.log(` -> Delivering response bubble packet...`);
        // Prefix with 🤖 so self-testing code blocks recognize it as automated
        await client.sendMessage(targetNumber, `🤖 ${aiResponse}`);
        console.log(`🎉 Success! Reply sent to ${targetNumber}\n`);
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
        return response.text().trim();
    } catch (err) {
        console.error('Gemini API Integration Error:', err.message);
        return "My internal cloud link hit a temporary validation snag. Please check system configurations!";
    }
}

client.initialize();
