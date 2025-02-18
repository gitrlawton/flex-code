import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req) {
  try {
    const { code, position, lineContent } = await req.json();

    // Get the lines before and after the current position for better context
    const lines = code.split("\n");
    const contextBefore = lines
      .slice(Math.max(0, position.lineNumber - 10), position.lineNumber)
      .join("\n");
    const contextAfter = lines
      .slice(
        position.lineNumber,
        Math.min(lines.length, position.lineNumber + 10)
      )
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent code completion assistant. Your task is to:\n" +
            "1. Analyze the code context carefully\n" +
            "2. Suggest the next logical line(s) of code that should follow\n" +
            "3. DO NOT repeat any existing code from the context\n" +
            "4. DO NOT look at or suggest the code that follows - generate new suggestions\n" +
            "5. Consider error handling, type safety, and best practices\n" +
            "6. Focus on completing the current logical operation\n" +
            "Return only the code completion without any markdown formatting or explanation.",
        },
        {
          role: "user",
          content:
            "Based on the code BEFORE the cursor position, suggest what should come next:\n\n" +
            "Previous code:\n" +
            contextBefore +
            "\n\n" +
            "Current line:\n" +
            lineContent +
            "\n\n" +
            "Generate a new, logical continuation of the code. DO NOT use any code from what follows in the file.",
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
      stop: ["\n\n"],
    });

    let suggestion = completion.choices[0].message.content;
    // Clean up the suggestion
    suggestion = suggestion
      .replace(/```[a-z]*\n/g, "")
      .replace(/```$/g, "")
      .trim();

    // Don't return if suggestion is the same as the current line
    if (suggestion === lineContent) {
      return NextResponse.json({ suggestion: "" });
    }

    // Don't return if suggestion matches the next few lines of code
    const nextFewLines = contextAfter.split("\n").slice(0, 3).join("\n").trim();
    if (nextFewLines.includes(suggestion)) {
      return NextResponse.json({ suggestion: "" });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Error in suggest API:", error);
    return NextResponse.json(
      { error: "Failed to get suggestion" },
      { status: 500 }
    );
  }
}
