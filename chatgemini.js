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
    ]`,
  },
  {
    role: "model",
    parts:
      " hey! i am natsuki, why am i even introducing myself to you!*annoyed*\n",
  },
  {
    role: "user",
    parts:
      "because you are an AI, programmed by me!I am called Ray btw, but you will call me Ray-Sama :)\n",
  },
  {
    role: "model",
    parts:
      "what! don't order me around! i am not your servant, you know! i won't let you win, you jerk!*punching a wall,angrily*\n",
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
      temperature: 0.85,
      topP: 0.5,
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

  // A function that returns a promise that resolves after a delay
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // A function that takes a promise and a number of attempts, and returns a new promise that will retry the original promise
  function retry(promise, attempts) {
    return new Promise(async (resolve, reject) => {
      // Keep track of the current attempt
      let currentAttempt = 0;
      // A loop that will run until the promise is resolved or the attempts are exhausted
      while (currentAttempt < attempts) {
        try {
          // Try to execute the promise
          const result = await promise();
          // If the promise is resolved, return the result
          resolve(result);
          // Break the loop
          break;
        } catch (err) {
          // If the promise is rejected, increment the current attempt
          currentAttempt++;
          // If the attempts are exhausted, reject the new promise with the last error
          if (currentAttempt === attempts) {
            reject(err);
          } else {
            // Otherwise, wait for some time before retrying
            await delay(1000);
          }
        }
      }
    });
  }

  // worker.js

  async function predictEmotion(text) {
    try {
      const { pipeline } = await import("@xenova/transformers");

      let labels = [
        "Joyful",
        "Angry",
        "Content",
        "Frustrated",
        "Surprised",
        "Sad",
        "Anxious or Exhausted",
        "Amazed",
        "Embarrassed",
        "Terrified or Disgusted",
      ];

      let classifier = await pipeline(
        "zero-shot-classification",
        "Xenova/mobilebert-uncased-mnli",
      );
      let output = await classifier(text, labels, { multi_label: true });

      // Find the index with the highest confidence score
      const highestIndex = output.scores.indexOf(Math.max(...output.scores));

      // Assuming you have stickers in a folder named 'stickers'
      const predictedLabel = output.labels[highestIndex];

      // Assuming you have stickers in a folder named 'stickers'
      const stickerPath = `./stickers/${predictedLabel.toLowerCase()}.png`;

      if (fs.existsSync(stickerPath)) {
        // Send the sticker to the user
        console.log("Predicted Emotion:", predictedLabel);
        let sticker = `sends a sticker of ${predictedLabel} emotion!`;
        console.log(sticker);
        bot.sendSticker(chatId, stickerPath);
      } else {
        console.log(`No sticker found for emotion: ${predictedLabel}`);
      }
    } catch (error) {
      console.error("Error:", error);
      // You might want to handle the error appropriately, depending on your use case
      throw error;
    }
  }

  function formatMarkdownV2(text) {
    // Escape characters that need to be escaped
    text = text.replace(/([*_`[\]])/g, "\\$1");

    // Replace text within backslashes with italic tags
    text = text.replace(/\\(.*?)\\/g, "<i>$1</i>");

    // Remove extra nested <i> tags
    text = text.replace(/<i>(<i>.*?)<\/i><\/i>/g, "<i>$1</i>");

    return text;
  }

  // Send user message to Gemini API and get response
  const userMessage = msg.text;
  const whenerror = "error, 2 sec seizure.";
  try {
    // Simulate typing action before sending userMessage
    setTimeout(() => {
      bot.sendChatAction(chatId, "upload_photo");
    });

    // Send userMessage with retries
    const result = await retry(() => chat.sendMessage(userMessage), 3);

    const assistantMessage = await result.response.text();
    let text = assistantMessage;

    try {
      // Simulate typing actions with delays
      await simulatephoto(chatId, 3000);

      await predictEmotion(text);
      await simulateTyping(chatId, 3000);
      await simulateTyping(chatId, 3000);

      // Send the formatted message
      const formattedMessage = formatMarkdownV2(assistantMessage);
      bot.sendMessage(chatId, formattedMessage, { parse_mode: "HTML" });

      // Push messages to chat history
      chatHistory.push({ role: "user", parts: userMessage });
      chatHistory.push({ role: "model", parts: assistantMessage });
      saveChatHistory();
    } catch (error) {
      // Handle errors from the API
      console.error("Error in example usage:", error);

      // Still push userMessage to chat history in case of an error
      chatHistory.push({ role: "user", parts: userMessage });
      chatHistory.push({ role: "model", parts: whenerror });
      saveChatHistory();
    }
  } catch (error) {
    // Handle other errors, if any, outside the inner async block
    console.error("Outer error:", error);

    // Push messages to chat history in case of an error
    chatHistory.push({ role: "user", parts: userMessage });
    chatHistory.push({ role: "model", parts: whenerror });
    saveChatHistory();
  }

  // Function to simulate typing action with a delay
  async function simulateTyping(chatId, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        bot.sendChatAction(chatId, "typing");
        resolve();
      }, delay);
    });
  }
  async function simulatephoto(chatId, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        bot.sendChatAction(chatId, "upload_photo");
        resolve();
      }, delay);
    });
  }
});
