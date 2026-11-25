import dotenv from 'dotenv';
dotenv.config();
import express from 'express';

// LangChain
import { ChatGoogle } from "@langchain/google";
import { TavilySearch } from "@langchain/tavily";
import {createAgent, tool} from 'langchain';
import nodemailer from 'nodemailer';
import z from 'zod';

// LangGrapg
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';

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

// ye langGrapg k liye hai 
const tools = [inBuiltTool,sendEmailTool];

// We are using gemini model for langChani
// If we use langGraph an extra function we have to use and that is bindTools()
// bindTools automatic jo tools hm bnayenge usko access karega with the help of model
const model = new ChatGoogle('gemini-3.5-flash-lite').bindTools(tools);

// const model = new ChatGoogle('gemini-3.5-flash-lite'); -- ye part jb langGraph use kr rahe tb


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

// --------------- LangGrapg -----------------

// State k andar ye sb hota hai
/* state = [
    humanMessage:"",
    AIMessage:"",
    Message:"",
    AIMessage:"",
] */

// Create Node
const toolNode = new ToolNode(tools);

const agent = async(state)=>{
    const result = await model.invoke(
        state.messages
    );

    // every messages me state return krne padti hai
    return {
        messages:[result]
    }
}

// AB hm ek condition bnayenge jis se agent decide karega tools pr jana hai ya End krna hai
// state.messages[state.messages.length - 1] -- give last length
const shouldContinue = async(state)=>{
    if(state.messages[state.messages.length - 1].tool_calls.length > 0){
        return "tool_node"
    }else{
        return "__end__"
    }
}

const graph = new StateGraph(MessagesAnnotation)
.addNode("agent",agent)
.addNode("tool_node",toolNode)
.addEdge("__start__","agent")
.addConditionalEdges("agent",shouldContinue)
.addEdge("tool_node","agent")
.compile();

app.post('/langgraphchat',async(req,res)=>{
    const {prompt} = req.body;

    const result = await graph.invoke({
        messages:[
            {
                role:"user",
                content:prompt
            }
        ]
    });

    console.log(result.messages)

    return res.json(result.messages[result.messages.length-1].content);   // Return last because output comes in last in AIMessages
});


app.listen(process.env.port,()=>{
    console.log(`Server started at port 8000`)
});

