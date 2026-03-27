require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const axios = require('axios');

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL = "meta-llama/Llama-3.1-8B-Instruct:cerebras";

let lastQR = null;
const PORT = process.env.PORT || 8080;

// ─── Web Server for QR Code ───────────────────────────────────────────────
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
        res.end(`<html><body style="background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh"><h2>CollabInst Bot is Connected! ✅</h2></body></html>`);
    }
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ─── Business Data ────────────────────────────────────────────────────────
const businessData = [
    {
        keywords: ["free", "join", "cost", "charge", "signup", "sign up", "register", "fee to join"],
        answer: `✅ Joining CollabInst is 100% FREE for both creators and brands!\n\nWe only take a 20% platform fee when a deal is successfully completed. No hidden charges, ever.\n\n👉 Sign up here: https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["80", "20", "split", "commission", "percentage", "platform fee", "how much do you take"],
        answer: `💰 CollabInst works on a simple 80/20 split:\n\n- Creator gets 80% of the deal amount\n- CollabInst keeps 20% as platform fee\n\nExample: Brand pays $100 → Creator gets $80, CollabInst keeps $20.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["paid", "payment", "payout", "get money", "earn", "income", "withdraw"],
        answer: `💸 As a creator, here's how you get paid:\n\n1. Deliver your reel through the platform\n2. Brand reviews and approves it\n3. 80% of the deal amount is released to you instantly\n\nPayments are held securely until approval — brands cannot withhold payment without requesting a formal revision.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["creator", "influencer", "how to start", "how do i start", "i am a creator", "i'm a creator"],
        answer: `🎥 Welcome Creator! Here's how to get started on CollabInst:\n\n1. Sign up free at our website\n2. Set up your profile — Instagram handle, niche, follower count, price per reel\n3. Browse the Brand Board for opportunities\n4. Get messaged by brands directly\n5. Agree on a deal, upload your reel, get paid 80%!\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["brand", "i am a brand", "i'm a brand", "promote", "advertiser", "find creators", "hire creator"],
        answer: `🏢 Welcome Brand! Here's how CollabInst works for you:\n\n1. Sign up free at our website\n2. Browse creators by niche and follower count\n3. Post an opportunity on the Brand Board\n4. Message creators directly\n5. Send a deal proposal, review the reel, approve to release payment!\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["niche", "category", "type of content", "what niche", "available niche"],
        answer: `🎯 Available niches on CollabInst:\n\n- Fashion & Style\n- Fitness & Health\n- Food & Cooking\n- Tech & Gadgets\n- Travel & Lifestyle\n- Gaming\n- Beauty & Skincare\n- Sports\n- And more!\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["content", "reel", "video", "what kind", "what type"],
        answer: `🎬 Brands can request:\n\n- 30-second brand videos\n- Product reviews\n- Unboxings\n- Lifestyle content\n- And more Instagram reel formats!\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["revision", "not happy", "bad reel", "reject", "disapprove", "redo"],
        answer: `🔄 Not happy with the delivered reel? No problem!\n\nBrands can request a revision. The creator re-uploads and resubmits. Payment is only released when the brand approves.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["both", "creator and brand", "switch", "two roles", "inDrive"],
        answer: `🔀 Yes! You can be both a Creator AND a Brand on CollabInst!\n\nJust like inDrive where you can be both a passenger and a driver — one account, two roles. Switch between Creator Mode and Brand Mode anytime from your dashboard.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["password", "forgot", "reset", "login", "can't login", "cant login"],
        answer: `🔑 Forgot your password?\n\n1. Go to the login page\n2. Click "Forgot your password?"\n3. Enter your email\n4. We'll send you a reset link instantly!\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["delete", "account", "remove account", "deactivate"],
        answer: `🗑️ To delete your account:\n\nProfile → Edit Profile → scroll down to Danger Zone → Delete My Account.\n\n⚠️ This action is permanent and cannot be undone.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["safe", "security", "data", "privacy", "secure"],
        answer: `🔒 Your data is 100% safe!\n\nCollabInst uses Supabase for secure authentication and database management with Row Level Security enabled.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["pakistan", "international", "global", "outside", "worldwide", "country"],
        answer: `🌍 CollabInst is a global platform!\n\nBrands and creators from anywhere in the world can join and collaborate. We were founded in Karachi, Pakistan but we serve worldwide.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["payment method", "stripe", "how to pay", "send money", "transfer"],
        answer: `💳 Currently CollabInst is running demo payments.\n\nReal payments via Stripe are coming very soon! All deals are tracked and managed securely through the platform.\n\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["website", "link", "url", "where", "platform", "collabinst"],
        answer: `🌐 Visit CollabInst here:\n👉 https://alam8010.github.io/collabinst\n\nWhere Brands Meet Creators!`
    },
    {
        keywords: ["hello", "hi", "hey", "salam", "assalam", "good morning", "good evening", "good afternoon"],
        answer: `👋 Hello! Welcome to CollabInst — Where Brands Meet Creators!\n\nI can help you with:\n- How to join as a Creator or Brand\n- How payments work\n- How deals are made\n- Any other questions about the platform\n\nWhat can I help you with today?\n👉 https://alam8010.github.io/collabinst`
    },
    {
        keywords: ["who are you", "what is collabinst", "about", "tell me about", "what do you do"],
        answer: `🚀 CollabInst is an online marketplace that connects emerging Instagram influencers with brands looking for content!\n\n- Brands post opportunities\n- Creators apply and deliver content\n- Payment is handled securely with an 80/20 split\n- 80% goes to the creator, 20% to CollabInst\n\nJoining is 100% FREE!\n👉 https://alam8010.github.io/collabinst`
    }
];

// ─── Check Business Data ──────────────────────────────────────────────────
function checkBusinessData(msg) {
    const lower = msg.toLowerCase();
    for (const item of businessData) {
        if (item.keywords.some(k => lower.includes(k))) {
            return item.answer;
        }
    }
    return null;
}

// ─── AI System Prompt ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a friendly and professional customer support assistant for CollabInst — an online marketplace that connects Instagram influencers (creators) with brands.

KEY FACTS:
- Website: https://alam8010.github.io/collabinst
- Joining is 100% free for both creators and brands
- Payment split: 80% to creator, 20% to CollabInst per completed deal
- Payments currently in demo mode, Stripe coming soon
- Platform is 100% online and global
- Founded in Karachi, Pakistan

FOR CREATORS: Sign up free, set up profile, browse Brand Board, get messaged by brands, deliver reel, get paid 80%.
FOR BRANDS: Sign up free, browse creators, post opportunities, message creators, review reel, approve to release payment.

RULES:
- Keep responses short, friendly and clear
- Always end with the website link: https://alam8010.github.io/collabinst
- Never make up information not listed here
- If unsure, say "Let me connect you with our team" and ask them to message on the same number
- Respond in the same language the user uses`;

// ─── AI Function ──────────────────────────────────────────────────────────
async function askAI(userMsg, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(
                "https://router.huggingface.co/v1/chat/completions",
                {
                    model: MODEL,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
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

// ─── WhatsApp Client ──────────────────────────────────────────────────────
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
    console.log('✅ CollabInst Bot is ready!');
});

// ─── Message Handler ──────────────────────────────────────────────────────
client.on('message', async message => {
    if (!message.body) return;
    console.log("User:", message.body);

    // Check business data first
    const localReply = checkBusinessData(message.body);
    if (localReply) {
        console.log("✅ Replied from business data");
        message.reply(localReply);
        return;
    }

    // Fall back to AI
    console.log("🤖 Replied from AI");
    const reply = await askAI(message.body);
    if (reply) {
        message.reply(reply);
    } else {
        message.reply("⚠️ Sorry, I couldn't get a response right now. Please try again or visit https://alam8010.github.io/collabinst");
    }
});

client.initialize();