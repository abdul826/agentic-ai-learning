import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { ChatGoogle } from "@langchain/google";

const app = express();

const ai = new GoogleGenAI({
    apiKey:process.env.GEMINIAPIKEY 
});

app.use(express.json());

// Testing Gemini API
/* const chatWithGemini = async(message)=>{
    try {
        const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: message,
    });

    return response.text;
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Something went wrong!";
    }
}

// TestP
const answer = await chatWithGemini("Hello My name is Abdul Rahman!");
console.log(answer); */


// Project - Chatboat
/* app.post("/chat",async(req,res)=>{
    const {prompt} = req.body
    const result = await ai.models.generateContent({
        model:"gemini-3.5-flash-lite",
        contents:prompt
    });

    return res.json(result.text);
}) */


// Use LangChain
app.post("/chat",async(req,res)=>{
    const {prompt} = req.body
    // const model = new ChatGoogle('gemini-3.5-flash-lite'); we can also pass multiple parameter

     const model = new ChatGoogle({
        model:'gemini-3.5-flash-lite',
        temperature:0.7,             // Jitna km value hoga utna focused ho kr answer dega LLM we put value in between 0-2
        maxOutputTokens:1000        // Yaha define kr sakte kitne tokens me answer chahiye 
    })

    // const result = await model.invoke(prompt);  we can also pass multiple parameter

    const result = await model.invoke([
        {
            role:"system",
            content:"You are jarvis and my assistent"
        },
        {
            role:"human",
            content:prompt
        }
    ])
    return res.json(result.content);
})


app.listen(process.env.port,()=>{
    console.log(`Server started at port 8000`)
});