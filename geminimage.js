const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const { GoogleGenerativeAI} = require('@google/generative-ai');

// Replace with your Telegram Bot token and Google Generative AI key
const tel = process.env.TELEGRAM_TOKEN
const gen = process.env.API_KEY

const bot = new TelegramBot(tel, { polling: true });
const genAI = new GoogleGenerativeAI(gen);


// Converts local file information to a GoogleGenerativeAI.Part object.
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString('base64'),
            mimeType,
        },
    };
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Check if the message has a photo
    if (msg.photo) {
        // Find the photo with the largest file size
        const largestPhoto = msg.photo.reduce((prev, current) => (prev.file_size > current.file_size) ? prev : current);

        // Get the file ID of the largest photo
        const fileId = largestPhoto.file_id;

        // Use the file ID to get the file path
        const file = await bot.getFile(fileId);
        const filePath = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        // Download the file to the photos directory
        const response = await axios({
            method: 'get',
            url: filePath,
            responseType: 'stream',
        });

        // Specify the path where you want to save the file
        const localFilePath = `./images/${file.file_path.split('/').pop()}`;

        // Pipe the file stream to the local file
        response.data.pipe(fs.createWriteStream(localFilePath));

        response.data.on('end', async () => {
            console.log(`File downloaded to: ${localFilePath}`);
            
 


            // For text-and-image input (multimodal), use the gemini-pro-vision model
            const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });


            

            const prompt = msg.text;
            initial = "you are an expert at understanding images, explain the images in funny and sarcastic way."

            const imageParts = [
                fileToGenerativePart(localFilePath, 'image/jpeg'), // Assuming the downloaded image is in JPEG format
            ];

            const result = await geminiModel.generateContent([initial,prompt, ...imageParts]);
            console.log(initial, prompt)
           ;

            const response = await result.response;
            const text = response.text();
            console.log(text);

            // You can now use 'text' as the generated content or send it back to the user.
            bot.sendMessage(chatId,text);
        });
    }
});
