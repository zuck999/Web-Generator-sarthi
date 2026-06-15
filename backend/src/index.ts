import express from "express";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { BASE_PROMPT, getSystemPrompt } from "./prompt";
import { basePrompt as nodeBasePrompt } from "./default/node";
import { basePrompt as reactBasePrompt } from "./default/react";


const openai = new OpenAI({
  baseURL: "https://models.github.ai/inference",
  apiKey: "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",
});


const app = express();
app.use(cors());
app.use(express.json());

app.get("/helth",(_,res)=>{
   res.status(200).json({status:"success"});
   return ;
})

app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;
  
  try {
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Return either node or react based on what you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
        },
        { role: "user", content: prompt },
      ],
      model: "openai/gpt-4.1",
      max_tokens: 200,
    });

    const answer = response.choices[0].message.content?.trim().toLowerCase();

    if (answer === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
      return;
    }

    res.status(403).json({ message: "You can't access this" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Model request failed" });
  }
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  console.log(messages);
  try {
    const response = await openai.chat.completions.create({
    messages: [
        { role: "system", content: getSystemPrompt() },
        ...messages
    ],
    model: "openai/gpt-4.1",
    max_tokens: 8500
    });

    res.json({
      response: response.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Chat request failed" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
