import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: "Say hello",
        },
      ],
      max_tokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: response.choices[0].message.content,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    });
  }
}
