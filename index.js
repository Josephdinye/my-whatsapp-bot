import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import express from 'express';
import qrImage from 'qr-image'; // 🛠️ Local image compiler module added
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
let latestQRCodeRaw = null; 

// Serve the live QR code website dashboard page
app.get('/', (req, res) => {
    if (latestQRCodeRaw) {
        try {
            // 🛠️ FIX APPLIED HERE: Convert the text string into a native Base64 PNG image stream 
            const qrPngBuffer = qrImage.imageSync(latestQRCodeRaw, { type: 'png' });
            const qrBase64String = qrPngBuffer.toString('base64');
            const finalImageSource = `data:image/png;base64,${qrBase64String}`;

            res.send(`
                <html>
                    <head>
                        <title>WhatsApp Bot Dashboard</title>
                        <meta http-equiv="refresh" content="7"> <!-- Auto-refreshes every 7 seconds -->
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
                            <p>Open WhatsApp > Settings > Linked Devices > Scan the QR below:</p>
                            <!-- Renders the locally generated Base64 string flawlessly with no external URL requirements! -->
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
                        <h2>🔄 System Synchronized or Initializing...</h2>
                        <p>The engine is processing the link. If you have already scanned it, your bot is officially active!</p>
                        <p style="color: #666; font-size: 13px;">Please check your WhatsApp app's "Linked Devices" dashboard or text your account to verify.</p>
                    </div>
                </body>
            </html>
        `);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express gateway port binding successful on port ${PORT}`);
});

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

client.on('qr', (qr) => {
    latestQRCodeRaw = qr; 
    console.log('👉 New QR Code generated and mapped to base64 page builder.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    latestQRCodeRaw = null; 
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
