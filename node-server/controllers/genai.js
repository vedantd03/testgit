const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { TaskType } = require("@google/generative-ai");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require("@langchain/openai");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CSVLoader } = require("@langchain/community/document_loaders/fs/csv");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const dotenv = require('dotenv');
dotenv.config();

async function getInference(prompt){
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const generationConfig = {
        // stopSequences: ["red"],
        maxOutputTokens: 2048,
        temperature: 0.5,
        topP: 0.95,
        topK: 5,
    };
    const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro",  generationConfig, safetySettings });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text
}

async function getResponse(message, history){
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const generationConfig = {
        // stopSequences: ["red"],
        maxOutputTokens: 2048,
        temperature: 0.5,
        topP: 0.95,
        topK: 5,
    };
    const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", safetySettings });
    const chat = model.startChat({
        history,
        generationConfig
    });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    return text
}

async function data_loader(directory, ){
    const loader = new DirectoryLoader(
        directory,
        {
          ".pdf": (path) => new PDFLoader(path),
          ".txt": (path) => new TextLoader(path),
          ".csv": (path) => new CSVLoader(path, "text"),
        }
      );
    const docs = await loader.load();
    return docs
}

async function getRAGResponse(user_query){
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const embedding_model = new GoogleGenerativeAIEmbeddings({
        model: "embedding-001", // 768 dimensions
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        title: "Document title",
        apiKey: process.env.GOOGLE_API_KEY,
    });

    const directory = "./assets/dataset"
    const docs = await data_loader(directory)
    const VECTOR_STORE_PATH = `./assets/dataset/datastore.index`;
    // const vectorStore = await MemoryVectorStore.fromDocuments(docs, embedding_model);

    let vectorStore;
    if (fs.existsSync(VECTOR_STORE_PATH)) {
        vectorStore = await FaissStore.load(VECTOR_STORE_PATH, embedding_model);
    } else {
        vectorStore = await FaissStore.fromDocuments(docs, embedding_model);
        await vectorStore.save(VECTOR_STORE_PATH);
    }
    const generationConfig = {
        maxOutputTokens: 2048,
        temperature: 0.5,
        topP: 0.95,
        topK: 5,
    };
    const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro",  generationConfig, safetySettings });
    const context = await vectorStore.similaritySearch(`${user_query}`, 3);
    const pageContents = context.map(item => item.pageContent);
    const prompt = `Answer the user's question: ${user_query} based on the given context: ${pageContents}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text
}

async function buildConversationHistory(messages) {
    let history = [];
    for (let i = 0; i < messages.length; i += 2) {
        let userMessage = messages[i];
        let modelMessage = i + 1 < messages.length ? messages[i + 1] : "";
        
        history.push({
            role: "user",
            parts: [{ text: userMessage }]
        });
        
        if (modelMessage) {
            history.push({
                role: "model",
                parts: [{ text: modelMessage }]
            });
        }
    }
    return history;
}

function fileToGenerativePart(path, mimeType) {
    try {
        const fileData = fs.readFileSync(path);
        return {
            inlineData: {
                data: Buffer.from(fileData).toString("base64"),
                mimeType
            },
        };
    } catch (error) {
        console.error(`Error reading file: ${error.message}`);
        throw error;
    }
}

  async function getVideoFromUrl(url) {
    try {
        let info = await ytdl.getInfo(url);
        const title = (info.videoDetails.title).replace(/[^\w\s]/g, '').replace(/\s+/g, '_');;
        const filePath = `./assets/audio/${title}.mp3`;
        if (fs.existsSync(filePath)) {
            return filePath;
        }
        const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
        const videoStream = ytdl(url, { format });
        const fileStream = fs.createWriteStream(filePath);
        videoStream.pipe(fileStream);
        return new Promise((resolve, reject) => {
            fileStream.on('finish', () => resolve(filePath));
            fileStream.on('error', error => reject(error));
        });
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

const generateVideoQuiz = async (req, res) => {
    try {
        const { videoLink } = req.body;
        const filePath = await getVideoFromUrl(videoLink);
        const prompt = `Given the following audio attached below, 
        generate 10 accurate Multiple Choice Questions (in English), with 4 posssible answers and also provide the 
        correct answer for it according to content of the video. The questions should be related to the contents 
        of the video. Provide output in JSON parsable format.`;
        const videoParts = [
            fileToGenerativePart(filePath, "audio/mp3"),
          ];
        const response = await getInference([prompt, ...videoParts]);
        const parsedResponse = JSON.parse(response.replace(/^```json\s*|```$/g, ''));
        // fs.unlink(filePath, (err) => {
        // if (err) {
        //     console.error('Error deleting file:', err);
        //     return;
        // }});
        return res.status(200).json({ response: parsedResponse });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

const generateVideoSummary = async (req, res) => {
    try {
        const { videoLink } = req.body;
        if (!videoLink) {
            return res.status(400).json({ message: "Video URL is required" });
        }
        const filePath = await getVideoFromUrl(videoLink);
        const prompt = `Given the following audio attached below, 
        generate an accurate summary (in English), according to content of the video.`;
        const videoParts = [
            fileToGenerativePart(filePath, "audio/mp3"),
          ];
        const response = await getInference([prompt, ...videoParts]);
        // fs.unlink(filePath, (err) => {
        // if (err) {
        //     console.error('Error deleting file:', err);
        //     return;
        // }});
        return res.status(200).json({ response: response });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

const generateAnswer = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ message: "Question is required" });
        }
        const response = await getInference(question)
        return res.status(200).json({ response });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const haveChat = async (req, res) => {
    try {
        const { user_message, chat } = req.body;
        if (!user_message) {
            return res.status(400).json({ message: "User message is required" });
        }
        chat_history = await buildConversationHistory(chat);
        const response = await getResponse(user_message, chat_history)
        return res.status(200).json({ response });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const haveChatWithRAG = async (req, res) => {
    try{
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ message: "Question is required" });
        }
        const response = await getRAGResponse(question)
        return res.status(200).json({ response });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

module.exports = {
    generateVideoQuiz,
    generateVideoSummary,
    generateAnswer,
    haveChat,
    haveChatWithRAG,
};