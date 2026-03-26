require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const axios = require('axios');

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL = "meta-llama/Llama-3.1-8B-Instruct:cerebras";

let lastQR = null;

// Simple web server to display QR code
http.createServer((req, res) => {
    if (lastQR) {
        qrcode.toDataURL(lastQR, (err, url) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;flex-direction:column">
                    <h2 style="color:white">Scan with WhatsApp</h2>
                    <img src="${url}" style="width:300px;height:300px"/>
                    <p style="color:gray">Refresh if expired</p>
                </body>
                </html>
            `);
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh"><h2>Bot is already connected! ✅</h2></body></html>`);
    }
}).listen(process.env.PORT || 3000);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

client.on('qr', (qr) => {
    lastQR = qr;
    console.log('✅ QR ready — open your Railway public URL to scan it');
});

client.on('ready', () => {
    lastQR = null;
    console.log('✅ Bot is ready!');
});

async function askAI(userMsg, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(
                "https://router.huggingface.co/v1/chat/completions",
                {
                    model: MODEL,
                    messages: [
                        { role: "system", content: "You are a helpful assistant. Keep your replies concise." },
                        { role: "user", content: userMsg }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                },
                {
                    headers: {
                        Authorization: `Bearer ${HF_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            const reply = response.data?.choices?.[0]?.message?.content?.trim();
            if (!reply) throw new Error("Empty response");
            return reply;

        } catch (err) {
            console.error(`Attempt ${i + 1} failed:`, err.response?.data || err.message);
            if (i < retries - 1) await new Promise(r => setTimeout(r, 4000));
        }
    }
    return null;
}

client.on('message', async message => {
    if (!message.body) return;
    console.log("User:", message.body);

    const reply = await askAI(message.body);
    if (reply) {
        console.log("AI:", reply);
        message.reply(reply);
    } else {
        message.reply("⚠️ Sorry, couldn't get a response right now. Please try again.");
    }
});

client.initialize();