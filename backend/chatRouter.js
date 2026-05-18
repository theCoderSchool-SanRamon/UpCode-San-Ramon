const express = require('express');
require('dotenv').config();
const { OpenAI } = require('openai');

const router = express.Router();

const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HUGGINGFACE_API_KEY,
});

router.post('/chat', async (req, res) => {
    console.log('Express /api/chat body:', req.body)
    const { message, messages } = req.body || {};

    // Accept either a single `message` string (curl/tests) or a `messages` array from the frontend.
    let userMessage = message

    if (!userMessage && Array.isArray(messages)) {
        const lastUser = [...messages].reverse().find((m) => m && m.role === 'user' && typeof m.content === 'string')
        userMessage = lastUser?.content
    }

    if (!userMessage || typeof userMessage !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: missing Hugging Face API key' });
    }

    try {
        const model = process.env.AI_MODEL || "deepseek-ai/DeepSeek-V4-Pro";

        const chatCompletion = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: userMessage }],
        });

        let aiReply = chatCompletion.choices?.[0]?.message?.content
            || "I'm sorry, I couldn't process that.";

        if (aiReply.includes("</think>")) {
            aiReply = aiReply.split("</think>")[1].trim();
        }

        res.json({ reply: aiReply });
    } catch (error) {
        console.error('Error communicating with Hugging Face Router API:', error.message || error);
        res.status(500).json({ error: 'Error communicating with AI service' });
    }
});

module.exports = router;
