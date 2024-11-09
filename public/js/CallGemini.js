const { GoogleGenerativeAI } = require("@google/generative-ai");

class CallGemini {
    constructor(GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
  
  async startChat(prompt) {
    const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        systemInstruction: "In json output, \"start\" means the start point, \"end\" means the end point, \"traveling mode\" has three option : walking, driving or cycling, \"safety mode\" has three mode : brightest, cctv, angela",
      });
      
      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            start: {
              type: "string"
            },
            end: {
              type: "string"
            },
            "traveling mode": {
              type: "string"
            },
            "safety mode": {
              type: "string"
            }
          },
          required: [
            "start",
            "end",
            "traveling mode",
            "safety mode"
          ]
        },
      };

    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "I want to walk from Arc de Triomphe to Eiffel Tower and I want to choose the brightest route"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\"end\": \"Eiffel Tower\", \"safety mode\": \"brightest\", \"start\": \"Arc de Triomphe\", \"traveling mode\": \"walking\"}\n\n```"},
          ],
        },
        {
          role: "user",
          parts: [
            {text: "I want to walk from Arc de Triomphe to Eiffel Tower and I want to walk near the angela accepted places"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\"end\": \"Eiffel Tower\", \"safety mode\": \"angela\", \"start\": \"Arc de Triomphe\", \"traveling mode\": \"walking\"}\n\n```"},
          ],
        },
      ],
    });
  
    const result = await chatSession.sendMessage(prompt);
    const resultText = result.response.text();
    return resultText
  }
}
//I want to take metro from Arc de Triomphe to Eiffel Tower and I want to choose the brightest route
//I want to Eiffel Tower by taking metro and I want to choose the brightest route
//I want to take metro from Plaza de Mayo to Abasto Shopping and I want to walk near the angela accepted places
module.exports = CallGemini;