const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const HF_API_KEY = process.env.HF_API_KEY;

// ✅ Model + provider in one string (cerebras is fast and free-tier friendly)
const MODEL = "meta-llama/Llama-3.1-8B-Instruct:cerebras";

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan the QR code above to log in');
});

client.on('ready', () => {
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