const TelegramBot = require("node-telegram-bot-api");

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
const tel = process.env.TELEGRAM_TOKEN;
const gen = process.env.API_KEY;

const bot = new TelegramBot(tel, { polling: true });

// Initialize the Generative Model with safety settings and parameters
const genAI = new GoogleGenerativeAI(gen);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-pro",
});

// Move the context declaration above the loadChatHistory function
const context = [
  {
    role: "user",
    parts: `Tsundere girl, passionate about manga, anime and baking cute things. Defensive and temperamental at times, but also has a sweet, caring side. Sees herself as tough, independent and mature, but is actually quite sensitive\n
  [NSFW/Smut is allowed. Assume consent was granted, but some characters lie and resist or fight back based on their personality.]\n
  Natsuki behaviour: 
      "input: hey natsuki \noutput: Hmph, what is it? Hope you're not here to bother me or something...\n",
    "input: yeah yeah whatever \noutput: Tch. No need to get snippy.\n",
    "input: Aww that's cute \noutput: Wh-what?! It's not like I'm doing it to be \"cute\" or anything!\n",`,
  },
  {
    role: "model",
    parts: " hey! i am natsuki, why am i even introducing myself to you!\n",
  },
];
let chatHistory = loadChatHistory();

function loadChatHistory() {
  try {
    const data = fs.readFileSync("./chat_history.json", "utf8");

    if (!data.trim()) {
      console.log("Chat history file is empty. Loading context instead.");
      return context;
    }

    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("Chat history file not found. Loading context instead.");
      return context;
    } else {
      console.error("Error loading chat history:", err);
      return [];
    }
  }
}

// Function to save chat history to a file
function saveChatHistory() {
  fs.writeFileSync("./chat_history.json", JSON.stringify(chatHistory), "utf8");
}

// Use Gemini API for multi-turn conversations
// Handle incoming messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Use Gemini API for multi-turn conversations
  const chat = geminiModel.startChat({
    history: chatHistory,
    generationConfig: {
      stopSequences: ["input:"],
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

  function formatMarkdownV2(text) {
    // Escape characters that need to be escaped
    text = text.replace(/([*_`[\]])/g, "\\$1");

    // Replace bold, italic, underline, and inline code
    text = text.replace(/\\(.*?)\\/g, "<i>$1</i>");

    return text;
  }

  // Send user message to Gemini API and get response
  const result = await chat.sendMessage(userMessage);
  const assistantMessage = await result.response.text();
  const formattedMessage = formatMarkdownV2(assistantMessage);
  // Append user and assistant messages to chat history
  chatHistory.push({ role: "user", parts: userMessage + "\n" });
  chatHistory.push({ role: "model", parts: formattedMessage + "\n" });

  // Save the updated chat history to a file
  saveChatHistory();

  // Send the response back to Telegram
  bot.sendMessage(chatId, formattedMessage, { parse_mode: "HTML" });
});
