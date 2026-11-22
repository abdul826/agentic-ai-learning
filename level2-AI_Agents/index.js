import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { ChatGoogle } from "@langchain/google";
import { TavilySearch } from "@langchain/tavily";
import {createAgent, tool} from 'langchain';
import nodemailer from 'nodemailer';
import z from 'zod';

const app = express();

app.use(express.json());

// In built Tool
const inBuiltTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

// Custome Tool 
const customeTool = tool(
    (a,b)=>{
        return `Addition of ${a} & ${b} is`
    },
    {
        name:"Addition_Tool",
        description:"Use this tool for addition for two numbers",
        schema:z.object({
            a:z.number(),
            b:z.number()
        })
    }
)

// Custom Tool for sending mail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ADD THIS HERE
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Gmail SMTP Error:", error.message);
    } else {
        console.log("✅ Gmail SMTP Connected Successfully!");
    }
});

const sendEmailTool = tool(
    async ({ email }) => {

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'AI Agent Email',
            text: 'Hello, mail send successfully using AI agent'
        });

        return `Email successfully sent to ${email}. Message ID: ${info.messageId}`;
    },
    {
        name: "Send_Email_Tool",
        description: "Use this tool to send an email to the email address provided by the user.",
        schema: z.object({
            email: z.string().email()
        })
    }
);

const model = new ChatGoogle('gemini-3.5-flash-lite');


app.post('/chat',async(req,res)=>{
    const {prompt} = req.body;

    // Create Agent
    const agent = createAgent({
        model,
        tools:[inBuiltTool,customeTool,sendEmailTool]
    });
    
    const result = await agent.invoke({
        messages:[{role:"user", content:prompt}],
    });

    return res.json(result.messages[result.messages.length-1].text);   // Return last because output comes in last in AIMessages
});



app.listen(process.env.port,()=>{
    console.log(`Server started at port 8000`)
});