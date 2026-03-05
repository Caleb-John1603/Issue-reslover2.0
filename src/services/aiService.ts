import { GoogleGenAI } from "@google/genai";
import { IssuePriority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeIssuePriority(
  imageBase64: string, 
  title: string, 
  description: string, 
  address: string,
  category: string
): Promise<{ priority: IssuePriority; reasoning: string; isValid: boolean; validationMessage?: string }> {
  try {
    const model = "gemini-3-flash-preview";
    
    // Extract base64 data and mime type
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    const data = imageBase64.split(',')[1];

    const prompt = `
      You are a civic issue analyzer. Analyze the provided image of a public issue (like a pothole, broken streetlight, garbage overflow, etc.) 
      along with the following context:
      - Title: "${title}"
      - Description: "${description}"
      - Category: "${category}"
      - Location/Address: "${address}"
      
      Tasks:
      1. Verify if the image actually shows the reported issue category ("${category}").
      2. Verify if the image matches the description provided.
      3. Determine the severity/priority of this issue.
      
      Weightage Criteria for Priority:
      - Road Type: Issues on main roads, highways, or busy intersections get HIGHER weightage.
      - Safety: Immediate danger to life or property (e.g., main water pipe burst, live wires, massive sinkhole) = "critical".
      - Impact: Significant safety hazard or major service disruption on a busy road = "high".
      - Inconvenience: Noticeable issue causing minor safety risk or inconvenience (e.g., broken streetlight, standard pothole) = "medium".
      - Minor: Aesthetic issues or very low impact on quiet streets = "low".
      
      Return the result in JSON format with these fields:
      - "isValid": boolean (true if the image matches the category and description, false otherwise)
      - "validationMessage": string (if isValid is false, explain why. If true, keep it empty or brief)
      - "priority": one of "low", "medium", "high", "critical"
      - "reasoning": a short, one-sentence explanation for the chosen priority based on the image and location.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    const priority = (result.priority?.toLowerCase() || 'medium') as IssuePriority;
    const reasoning = result.reasoning || "Based on the visual evidence and location provided.";
    const isValid = result.isValid !== false; // Default to true if not explicitly false
    const validationMessage = result.validationMessage || "";
    
    return { 
      priority: ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium', 
      reasoning,
      isValid,
      validationMessage
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return { 
      priority: 'medium', 
      reasoning: "AI analysis unavailable.",
      isValid: true, // Don't block submission if AI fails
    };
  }
}
