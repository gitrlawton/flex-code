import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req) {
  try {
    const { message, code, language } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are an AI programming assistant. Provide helpful, clear, and concise responses about code. When suggesting code, ensure it's well-formatted and follows best practices.",
        },
        {
          role: "user",
          content: `I'm working with this ${language} code:\n\n${code}\n\nMy question is: ${message}`,
        },
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
