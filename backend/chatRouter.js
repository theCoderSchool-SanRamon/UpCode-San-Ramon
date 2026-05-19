const express = require('express');
require('dotenv').config();
const { OpenAI } = require('openai');

const router = express.Router();

const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HUGGINGFACE_API_KEY,
});

function cleanAssistantText(text) {
    const withoutThinkBlocks = String(text || "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/^[\s\S]*?<\/think>/i, "");

    const reasoningSentencePattern = /^(we are asked|we need to|we'll|we have|i need to|i should|i'll|i will|the user|the context|provided app context|i can|let's|so i'll|actually|but the raw|notice that|maybe|need to)\b/i;
    const promptAnalysisPattern = /\b(user's question|provided app context|app context|ranked results|raw scores|raw family score|score formula|i should provide|i need to be transparent|i'll focus|i'll mention|based solely on the app data)\b/i;
    const sentences = withoutThinkBlocks.split(/(?<=[.!?])\s+/);
    let firstAnswerSentenceIndex = sentences.findIndex((sentence) => {
        const trimmed = sentence.trim();
        return trimmed && !reasoningSentencePattern.test(trimmed) && !promptAnalysisPattern.test(trimmed);
    });

    if (firstAnswerSentenceIndex === -1) {
        firstAnswerSentenceIndex = 0;
    }

    return sentences
        .slice(firstAnswerSentenceIndex)
        .join(" ")
        .replace(/(?<=[A-Za-z])\d{1,3}\b/g, "")
        .replace(/\b\d{1,3}(?=[A-Za-z])/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

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
            messages: [
                {
                    role: 'system',
                    content: 'Return only the final user-facing answer. Do not include reasoning notes, chain-of-thought, or planning text.'
                },
                { role: 'user', content: userMessage }
            ],
        });

        let aiReply = chatCompletion.choices?.[0]?.message?.content
            || "I'm sorry, I couldn't process that.";

        aiReply = cleanAssistantText(aiReply);

        res.json({ reply: aiReply });
    } catch (error) {
        console.error('Error communicating with Hugging Face Router API:', error.message || error);
        res.status(500).json({ error: 'Error communicating with AI service' });
    }
});

module.exports = router;
