import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize the GoogleGenAI client with server-side SDK telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Parse JSON bodies
app.use(express.json({ limit: "50mb" }));

/**
 * API: Generate Brand Concept and Creative Prompts
 * Model used: gemini-3.5-flash (Standard model for basic text/JSON tasks)
 */
app.post("/api/brand/generate-plans", async (req, res) => {
  try {
    const { productDescription, brandName, primaryColors, extraInstructions } = req.body;

    if (!productDescription) {
      return res.status(400).json({ error: "Product description is required." });
    }

    const colorContext = primaryColors && primaryColors.length > 0 
      ? `The primary brand color scheme utilizes: ${primaryColors.join(", ")}.` 
      : "The color scheme is flexible and up to you, but should feel high-end and modern.";

    const systemInstruction = `You are an elite creative design director at a world-class advertising agency. 
Your goal is to take a raw product description and craft a cohesive, highly polished brand concept.
For visual ads, you MUST write detailed image generation prompts that maintain visual consistency of the physical product across different mediums (Billboard, Newspaper, Social Media), but STRICTLY adhere to the rule that NO people should appear in any images.

To ensure strict product consistency across different shots:
1. Craft a highly detailed "productStyleGuide" that describes the product physical attributes: precise shape (e.g. cylindrical with radiused corners), exact materials and finish (e.g. matte micro-textured recycled polymer with brushed anodized aluminum trim), branding badge styling, and specific accent parts (buttons, caps, indicator lights).
2. Incorporate this exact visual product description or a very close summary of it directly into each medium-specific image prompt (Billboard, Newspaper, Social) so the generator produces a consistent subject.
3. Every prompt you generate MUST include instructions prohibiting humans: "Strictly no people, no hands, no faces, no human silhouettes, completely unoccupied scene, clean commercial product-only photography."`;

    const prompt = `Product Raw Description: "${productDescription}"
User-Provided Brand Name (if any): "${brandName || 'None'}"
Color Preferences: ${colorContext}
Extra Creative Instructions (if any): "${extraInstructions || 'None'}"

Generate the complete brand concept in structured JSON matching the requested response schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandName: { 
              type: Type.STRING, 
              description: "A clever, highly memorable, professional brand name for this product. Use the user-provided one if suitable, or suggest a stellar one." 
            },
            slogan: { 
              type: Type.STRING, 
              description: "An elegant, punchy advertising tagline/slogan for the brand." 
            },
            productStyleGuide: {
              type: Type.STRING,
              description: "A meticulous, highly specific visual style guide of the physical product: e.g. shape, materials, textures, color placements, cap/lid details, and logo imprint. This description MUST NOT include people, and will be copy-pasted into visual prompts to guarantee consistency."
            },
            mediums: {
              type: Type.OBJECT,
              properties: {
                billboard: {
                  type: Type.OBJECT,
                  properties: {
                    imagePrompt: { 
                      type: Type.STRING, 
                      description: "Detailed 16:9 landscape image generation prompt. It should describe a grand digital billboard on a modern roadside, in a clean, upscale futuristic city square, or set against a breathtaking minimalist outdoor background at golden hour, displaying the consistent product. Ensure absolutely no people are visible anywhere. Include styling terms like: 'photorealistic, perfect lighting, hyper-detailed commercial render, unoccupied city center, high-end CGI, shot on 85mm lens, no people'." 
                    },
                    copyText: { 
                      type: Type.STRING, 
                      description: "Ultra-minimal, powerful billboard text/headline (3-6 words) to overlay on the design." 
                    }
                  },
                  required: ["imagePrompt", "copyText"]
                },
                newspaper: {
                  type: Type.OBJECT,
                  properties: {
                    imagePrompt: { 
                      type: Type.STRING, 
                      description: "Detailed 3:4 portrait image generation prompt representing a high-society print advertisement. Describe the visual product beautifully presented on a flat surface inside a newsprint press layout, stylized with a classic half-tone or high-contrast silver-halide editorial engraving. The print shows crisp highlights, deep shadows, and subtle paper fiber texture. Strictly no people, no hands. Elegant, archival, and photorealistic." 
                    },
                    copyText: { 
                      type: Type.STRING, 
                      description: "The classic printed newspaper headline or descriptive advertisement text (1-2 sentences)." 
                    }
                  },
                  required: ["imagePrompt", "copyText"]
                },
                social: {
                  type: Type.OBJECT,
                  properties: {
                    imagePrompt: { 
                      type: Type.STRING, 
                      description: "Detailed 1:1 square image generation prompt. An ultra-modern lifestyle product close-up shot resting on an aesthetic surface (like a polished concrete pedestal or beautiful natural wood) under warm directional studio light, with organic leaf shadow play across the background. Hyper-realistic, pristine composition, extremely clean and chic, highly shareable. Ensure absolutely no people or hands are in the shot." 
                    },
                    copyText: { 
                      type: Type.STRING, 
                      description: "Social media caption formatted with hashtags (ready for Instagram/Pinterest)." 
                    }
                  },
                  required: ["imagePrompt", "copyText"]
                }
              },
              required: ["billboard", "newspaper", "social"]
            }
          },
          required: ["brandName", "slogan", "productStyleGuide", "mediums"]
        }
      }
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Error generating brand plan:", error);
    res.status(500).json({ error: error.message || "Failed to generate brand setup." });
  }
});

/**
 * API: Generate Image
 * Model used: gemini-2.5-flash-image (The Nano-Banana Model for Image Generation)
 */
app.post("/api/brand/generate-image", async (req, res) => {
  try {
    const { prompt, medium } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    // Determine target aspect ratio based on advertising medium
    let aspectRatio: "16:9" | "3:4" | "1:1" = "1:1";
    if (medium === "billboard") {
      aspectRatio = "16:9";
    } else if (medium === "newspaper") {
      aspectRatio = "3:4";
    }

    // Enhance prompt to strictly prevent people as demanded by user, and ensure top-tier polish
    const enforcedAntiHumanSuffix = " Strictly no people, no humans, no hands, empty scene, clean professional commercial product placement, high quality, photorealistic, premium aesthetic.";
    const completePrompt = `${prompt}${enforcedAntiHumanSuffix}`;

    console.log(`Generating image for medium [${medium}] with aspect ratio [${aspectRatio}]. Prompt: "${completePrompt}"`);

    // Call gemini-2.5-flash-image (Nano-Banana)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: completePrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
        },
      },
    });

    // Extract inline image bytes
    let base64ImageBytes = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64ImageBytes = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64ImageBytes) {
      console.warn("No base64 data found in standard parts. Attempting alternative lookup.");
      // Fallback: Check if there's any text in case the model failed or returned filter errors
      if (response.text) {
        return res.status(500).json({ 
          error: "No image bytes returned. The model responded with text: " + response.text 
        });
      }
      return res.status(500).json({ error: "Failed to generate image bytes from Nano-Banana model." });
    }

    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Error calling gemini-2.5-flash-image:", error);
    res.status(500).json({ error: error.message || "Failed to generate image." });
  }
});

// Setup Vite and Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite development middleware.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Brand Builder App running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
