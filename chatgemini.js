const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const tel = process.env.TELEGRAM_TOKEN;
const gen = process.env.API_KEY;

const bot = new TelegramBot(tel, { polling: true });

// Initialize the Generative Model with safety settings and parameters
const genAI = new GoogleGenerativeAI(gen);
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-pro'
});

// Load chat history from a file
let chatHistory = loadChatHistory();

// Function to load chat history from a file
function loadChatHistory() {
  try {
    const data = fs.readFileSync('./chat_history.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading chat history:', err);
    return [];
  }
}

// Function to save chat history to a file
function saveChatHistory() {
  fs.writeFileSync('./chat_history.json', JSON.stringify(chatHistory), 'utf8');
}

// Use Gemini API for multi-turn conversations
// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Use Gemini API for multi-turn conversations
  const chat = geminiModel.startChat({
    history: chatHistory,
    generationConfig: {
      stopSequences: ['input:'],
      maxOutputTokens: 150,
      temperature: 0.9,
      topP: 1,
      topK: 1,
    },
    safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
  });

  // Get user message from Telegram
  const userMessage = msg.text;

  // Send user message to Gemini API and get response
  const result = await chat.sendMessage(userMessage);
  const assistantMessage = await result.response.text();

  // Append user and assistant messages to chat history
  chatHistory.push({ role: 'user', parts: userMessage });
  chatHistory.push({ role: 'model', parts: assistantMessage });

  // Save the updated chat history to a file
  saveChatHistory();

  // Send the response back to Telegram
  bot.sendMessage(chatId, assistantMessage);
});
