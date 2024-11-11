const { GoogleGenerativeAI } = require("@google/generative-ai");

class CallGemini {
  constructor(GEMINI_API_KEY) {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.conversationHistory = [];
  }

  async startChat(prompt) {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "In json output, \"start\" means the start point, \"end\" means the end point, \"traveling mode\" can only have three option : walking, transport, cycling, \"safety mode\" has three mode : brightest, cctv, angela",
    });
    // Add the prompt to the conversation history
    this.conversationHistory.push({ role: "user", text: prompt });

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
      }
    };

    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Recommand safety mode in function of time, for example if it's before sunset, you recommand police/angela, if it's after sunset, you recommand brightest. If the user doesn't provide one of the information, get the data from previous prompt\nI want to walk from Casa de Galicia Restaurante to Av. Don Pedro de Mendoza 965 and it is almost midnight"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\"end\": \"Av. Don Pedro de Mendoza 965\", \"safety mode\": \"brightest\", \"start\": \"Casa de Galicia Restaurante\", \"traveling mode\": \"walking\"}\n\n```"},
          ],
        },
        {
          role: "user",
          parts: [
            {text: "Now i am at San Telmo Market, please choose the safest route where has police station nearby"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\"end\": \"Av. Don Pedro de Mendoza 965\", \"safety mode\": \"police/angela\", \"start\": \"San Telmo Market\", \"traveling mode\": \"walking\"}\n\n```"},
          ],
        },
        ...this.conversationHistory.map(entry => ({
          role: entry.role,
          parts: [{ text: entry.text }],
        })),
      ],
    });

    const result = await chatSession.sendMessage(prompt);
    const resultText = result.response.text();

    // Add the model's response to the conversation history
    this.conversationHistory.push({ role: "model", text: resultText });
    console.log("Conversation history:", this.conversationHistory);
    return resultText;
  }
}
//I want to walk from Casa de Galicia Restaurante to Av. Don Pedro de Mendoza 965 and it is morning of the day
//I want to walk from Casa de Galicia Restaurante to Av. Don Pedro de Mendoza 965 and it is almost midnight
//Now i am at Ber Club Center, go to the same destination, i want to take bus, please choose the brightest route 
module.exports = CallGemini;