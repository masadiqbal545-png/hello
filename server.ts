import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Support large payload sizes for base64 images
app.use(express.json({ limit: "20mb" }));

// API 1: Generate Book Outlines (5 pages)
app.post("/api/generate-outlines", async (req, res) => {
  try {
    const { theme, childName } = req.body;
    if (!theme || !childName) {
      return res.status(400).json({ error: "Theme and child's name are required." });
    }

    console.log(`Generating coloring book outline for theme: "${theme}", child: "${childName}"`);

    const promptText = `Generate a fun, kids-friendly outline for a 5-page coloring book.
The theme is: "${theme}".
The child's name is: "${childName}".

Suggest a coloring book name/title (including the theme and child name, e.g. "Oliver's Galactic Space Dinosaurs Adventure").
For each of the 5 pages, provide:
1. A catchy page title (e.g., "T-Rex Rocket Ride")
2. A detailed drawing prompt description for generating a black-and-white coloring page drawing.
3. A cute story-like caption to print at the bottom of the page (e.g. "Commander Oliver floating past Jupiter's red spot!").

Provide the response in structured JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coverTitle: {
              type: Type.STRING,
              description: "The beautiful cover title of the coloring book."
            },
            pages: {
              type: Type.ARRAY,
              description: "Array of exactly 5 pages in chronological order.",
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING, description: "Detailed description of the scene emphasizing simple shapes, thick bold outlines, black and white line art suitable for crayon coloring." },
                  caption: { type: Type.STRING, description: "A one-sentence narrative caption that mentions the child's name, to be printed under the drawing." }
                },
                required: ["pageNumber", "title", "prompt", "caption"]
              }
            }
          },
          required: ["coverTitle", "pages"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const outlines = JSON.parse(jsonText.trim());
    res.json(outlines);
  } catch (error: any) {
    console.error("Error generating book outlines:", error);
    res.status(500).json({ error: error.message || "Failed to generate outlines." });
  }
});

// Helper: Procedural fallback SVG coloring pages when Gemini is offline, busy or times out
function getProceduralSVG(theme: string, childName: string, pageNumber: number, title: string, caption: string): string {
  const normTheme = ((theme || "") + " " + (title || "")).toLowerCase();
  let elements = "";

  // 1. Determine cartoon vectors based on keywords
  if (normTheme.includes("space") || normTheme.includes("rocket") || normTheme.includes("galaxy") || normTheme.includes("planet") || normTheme.includes("astronaut") || normTheme.includes("sky")) {
    elements = `
      <!-- Space Theme Elements -->
      <!-- Smiling Crescent Moon -->
      <path d="M 600,180 A 110,110 0 1,0 680,380 A 130,130 0 1,1 600,180 Z" fill="white" stroke="black" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="620" cy="270" r="8" fill="black" />
      <path d="M 615,290 Q 625,300 635,290" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" />

      <!-- Saturn Planet -->
      <circle cx="200" cy="350" r="80" fill="white" stroke="black" stroke-width="6" />
      <!-- Ring around Saturn -->
      <ellipse cx="200" cy="350" rx="140" ry="30" fill="none" stroke="black" stroke-width="8" stroke-linecap="round" transform="rotate(-15 200 350)" />
      <!-- Strip patterns on Saturn to color -->
      <path d="M 135,320 Q 200,340 265,320" fill="none" stroke="black" stroke-width="5" />
      <path d="M 125,360 Q 200,380 275,360" fill="none" stroke="black" stroke-width="5" />

      <!-- Cute Smiling Rocket Ship -->
      <g transform="translate(180, 520) rotate(25)">
        <!-- Rocket Body -->
        <path d="M 100,50 C 130,10 170,10 200,50 L 200,280 C 200,290 190,300 175,300 L 125,300 C 110,300 100,290 100,280 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Rocket Nose Cone -->
        <path d="M 100,110 C 100,80 150,0 200,110 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Fins -->
        <path d="M 100,230 L 55,290 C 50,295 60,300 70,300 L 100,280 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <path d="M 200,230 L 245,290 C 250,295 240,300 230,300 L 200,280 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Window -->
        <circle cx="150" cy="160" r="30" fill="white" stroke="black" stroke-width="6" />
        <circle cx="150" cy="160" r="12" fill="white" stroke="black" stroke-width="4" />
        <!-- Flame Sparks -->
        <path d="M 120,300 L 110,340 L 135,315 L 150,360 L 165,315 L 190,340 L 180,300 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
      </g>
      
      <!-- Tiny Stars & Asteroids -->
      <circle cx="450" cy="320" r="15" fill="none" stroke="black" stroke-width="5" />
      <circle cx="480" cy="480" r="25" fill="none" stroke="black" stroke-width="5" />
      <circle cx="510" cy="460" r="5" fill="black" />
      
      <!-- Big Star 1 -->
      <path d="M 450,180 L 458,200 L 480,200 L 462,212 L 468,232 L 450,220 L 432,232 L 438,212 L 420,200 L 442,200 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
      <!-- Big Star 2 -->
      <path d="M 150,200 L 154,210 L 165,210 L 156,216 L 159,226 L 150,220 L 141,226 L 144,216 L 135,210 L 146,210 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      <!-- Star 3 -->
      <path d="M 680,500 L 684,510 L 695,510 L 686,516 L 689,526 L 680,520 L 671,526 L 674,516 L 665,510 L 676,510 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
    `;
  } else if (normTheme.includes("dino") || normTheme.includes("dinosaur") || normTheme.includes("jurassic") || normTheme.includes("t-rex") || normTheme.includes("dragon") || normTheme.includes("monster")) {
    elements = `
      <!-- Dinosaur Theme Elements -->
      <!-- Smiling Sun -->
      <circle cx="150" cy="220" r="60" fill="white" stroke="black" stroke-width="6" />
      <path d="M 150,140 L 150,120 M 150,300 L 150,320 M 70,220 L 50,220 M 230,220 L 250,220 M 93,163 L 79,149 M 207,277 L 221,291 M 93,277 L 79,291 M 207,163 L 221,149" stroke="black" stroke-width="5" stroke-linecap="round" />
      <circle cx="130" cy="210" r="6" fill="black" />
      <circle cx="170" cy="210" r="6" fill="black" />
      <path d="M 135,235 Q 150,250 165,235" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />

      <!-- Volcanic Mountain in background -->
      <path d="M 500,600 L 560,420 Q 590,420 620,420 L 720,600 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
      <!-- Volcano Lava Clouds -->
      <path d="M 550,420 C 530,370 650,350 620,420 Q 640,380 660,400 Q 670,430 630,440" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      
      <!-- Big Smiling Dinosaur (Apatosaurus or Brontosaurus style) -->
      <g transform="translate(180, 360)">
        <!-- Long Neck & Head -->
        <path d="M 100,240 C 60,140 100,20 180,20 C 220,20 230,60 210,80 C 190,100 140,100 130,240" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Big Round Body -->
        <path d="M 120,230 C 140,160 320,160 360,240 C 400,260 450,240 480,210 C 460,260 420,380 320,380 C 200,380 120,350 120,230 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Back Spikes/Plates to color in -->
        <path d="M 152,154 L 170,125 L 188,158 M 205,170 L 225,140 L 245,178 M 260,185 L 285,155 L 310,195 M 325,198 L 350,170 L 370,210" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Eye & Cheerful Smile -->
        <circle cx="180" cy="45" r="7" fill="black" />
        <path d="M 180,65 Q 195,75 205,60" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" />
        
        <!-- Thick Stumpy Dinosaur Legs -->
        <path d="M 160,340 L 160,430 L 205,430 L 205,355" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <path d="M 280,355 L 280,430 L 325,430 L 325,340" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Cute Toe Nails to Color -->
        <circle cx="170" cy="425" r="6" fill="white" stroke="black" stroke-width="4" />
        <circle cx="182" cy="425" r="6" fill="white" stroke="black" stroke-width="4" />
        <circle cx="194" cy="425" r="6" fill="white" stroke="black" stroke-width="4" />
        <circle cx="290" cy="425" r="6" fill="white" stroke="black" stroke-width="4" />
        <circle cx="302" cy="425" r="6" fill="white" stroke="black" stroke-width="4" />
        <circle cx="314" cy="425" r="6" fill="white" stroke="black" stroke-width="4" />
      </g>
    `;
  } else if (normTheme.includes("mermaid") || normTheme.includes("sea") || normTheme.includes("ocean") || normTheme.includes("underwater") || normTheme.includes("fish") || normTheme.includes("shell")) {
    elements = `
      <!-- Underwater / Sea Theme Elements -->
      <!-- Rising Bubbles -->
      <circle cx="150" cy="220" r="20" fill="white" stroke="black" stroke-width="5" />
      <circle cx="140" cy="210" r="5" fill="white" stroke="black" stroke-width="3" />
      <circle cx="180" cy="150" r="30" fill="white" stroke="black" stroke-width="5" />
      <circle cx="165" cy="135" r="8" fill="white" stroke="black" stroke-width="3" />
      <circle cx="680" cy="300" r="25" fill="white" stroke="black" stroke-width="5" />
      <circle cx="120" cy="450" r="12" fill="white" stroke="black" stroke-width="4" />
      
      <!-- Waves on Top -->
      <path d="M 50,50 Q 150,80 250,50 T 450,50 T 650,50 T 850,50" fill="none" stroke="black" stroke-width="6" stroke-linecap="round" />
      <path d="M 50,80 Q 150,110 250,80 T 450,80 T 650,80 T 850,80" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" />

      <!-- Cute Swimming Dolphin or Giant Whale -->
      <g transform="translate(180, 260)">
        <!-- Whale Body -->
        <path d="M 50,150 C 70,50 250,20 370,120 Q 420,70 480,50 C 470,120 450,165 400,200 C 300,260 100,260 50,150 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Blowing Water Spout -->
        <path d="M 230,60 C 230,10 200,-10 180,-5" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />
        <path d="M 235,60 C 250,10 280,-10 300,-5" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />
        <!-- Whale Tail Flukes -->
        <path d="M 460,73 C 510,40 540,80 500,105 C 540,130 510,170 460,135 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Fin -->
        <path d="M 220,195 C 240,240 280,260 270,190 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Big Cute Eye & Smile -->
        <circle cx="130" cy="105" r="14" fill="white" stroke="black" stroke-width="5" />
        <circle cx="134" cy="101" r="5" fill="black" />
        <path d="M 120,140 Q 140,160 160,135" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" />
      </g>

      <!-- Ocean floor seaweed plants & starfishes -->
      <path d="M 100,800 Q 130,680 90,560 Q 60,680 100,800 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
      <path d="M 150,800 Q 110,650 160,500 Q 200,650 150,800 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      <path d="M 680,800 Q 720,630 670,480 Q 640,630 680,800 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      
      <!-- Smiling Starfish to Color -->
      <g transform="translate(540,660)">
        <path d="M 50,0 L 63,30 L 95,35 L 70,55 L 78,88 L 50,70 L 22,88 L 30,55 L 5,35 L 37,30 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <circle cx="42" cy="40" r="4" fill="black" />
        <circle cx="58" cy="40" r="4" fill="black" />
        <path d="M 44,50 Q 50,56 56,50" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" />
      </g>
    `;
  } else if (normTheme.includes("robot") || normTheme.includes("machine") || normTheme.includes("mechanical") || normTheme.includes("computer") || normTheme.includes("tech")) {
    elements = `
      <!-- Robot Theme Elements -->
      <!-- Modern Gears in background -->
      <g transform="translate(620,240)">
        <circle cx="0" cy="0" r="70" fill="white" stroke="black" stroke-width="6" />
        <circle cx="0" cy="0" r="30" fill="white" stroke="black" stroke-width="5" />
        <!-- Teeth -->
        <path d="M -15,-85 L 15,-85 L 10,-70 L -10,-70 Z" fill="white" stroke="black" stroke-width="5" />
        <path d="M -15,70 L 15,70 L 10,85 L -10,85 Z" fill="white" stroke="black" stroke-width="5" />
        <path d="M -85,-15 L -85,15 L -70,10 L -70,-10 Z" fill="white" stroke="black" stroke-width="5" />
        <path d="M 70,-15 L 70,15 L 85,10 L 85,-10 Z" fill="white" stroke="black" stroke-width="5" />
      </g>
      <g transform="translate(140,400) scale(0.6)">
        <circle cx="0" cy="0" r="70" fill="white" stroke="black" stroke-width="6" />
        <circle cx="0" cy="0" r="30" fill="white" stroke="black" stroke-width="5" />
      </g>

      <!-- Huge, Cute, Friendly Robot -->
      <g transform="translate(240, 280)">
        <!-- Antenna -->
        <line x1="160" y1="80" x2="160" y2="20" stroke="black" stroke-width="6" />
        <circle cx="160" cy="15" r="15" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Head -->
        <rect x="70" y="80" width="180" height="130" rx="30" ry="30" fill="white" stroke="black" stroke-width="6" />
        <!-- Big Lightbulb Eyes -->
        <circle cx="120" cy="140" r="28" fill="white" stroke="black" stroke-width="6" />
        <circle cx="120" cy="140" r="8" fill="black" />
        <circle cx="200" cy="140" r="28" fill="white" stroke="black" stroke-width="6" />
        <circle cx="200" cy="140" r="8" fill="black" />
        <!-- Cute Smile -->
        <path d="M 130,185 L 190,185" stroke="black" stroke-width="6" stroke-linecap="round" />
        
        <!-- Neck -->
        <rect x="130" y="210" width="60" height="30" rx="5" fill="white" stroke="black" stroke-width="6" />
        
        <!-- Large Blocky Body with dials -->
        <rect x="40" y="240" width="240" height="220" rx="20" fill="white" stroke="black" stroke-width="6" />
        <!-- Dashboard details to color -->
        <circle cx="100" cy="300" r="25" fill="white" stroke="black" stroke-width="5" />
        <line x1="100" y1="300" x2="115" y2="285" stroke="black" stroke-width="5" stroke-linecap="round" />
        
        <!-- Meter Indicator box -->
        <rect x="160" y="275" width="80" height="50" rx="5" fill="white" stroke="black" stroke-width="5" />
        <path d="M 170,315 Q 200,285 230,315" fill="none" stroke="black" stroke-width="4" />
        <line x1="200" y1="315" x2="190" y2="290" stroke="black" stroke-width="5" stroke-linecap="round" />

        <!-- Control Buttons -->
        <rect x="80" y="370" width="30" height="30" rx="5" fill="white" stroke="black" stroke-width="5" />
        <rect x="130" y="370" width="30" height="30" rx="5" fill="white" stroke="black" stroke-width="5" />
        <rect x="180" y="370" width="30" height="30" rx="5" fill="white" stroke="black" stroke-width="5" />
        
        <!-- Spring Legs -->
        <path d="M 100,460 L 100,520 L 130,490 L 130,550 M 220,460 L 220,520 L 190,490 L 190,550" fill="none" stroke="black" stroke-width="6" stroke-linecap="round" />
      </g>
    `;
  } else if (normTheme.includes("forest") || normTheme.includes("nature") || normTheme.includes("magic") || normTheme.includes("animal") || normTheme.includes("castle") || normTheme.includes("fairy") || normTheme.includes("safari") || normTheme.includes("tea")) {
    elements = `
      <!-- Castle / Magic Forest Theme Elements -->
      <!-- Royal Flag and Castle Tower -->
      <g transform="translate(480, 260)">
        <!-- Main Tower -->
        <rect x="60" y="160" width="140" height="340" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Roof Cone -->
        <path d="M 40,160 L 130,20 L 220,160 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        <!-- Flying Flag -->
        <path d="M 130,20 L 130,-20 L 70,-5 L 130,10" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Tower Window -->
        <path d="M 110,240 C 110,210 150,210 150,240 L 150,290 L 110,290 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Brick details to paint -->
        <rect x="80" y="350" width="35" height="15" fill="none" stroke="black" stroke-width="4" />
        <rect x="140" y="380" width="35" height="15" fill="none" stroke="black" stroke-width="4" />
        <rect x="75" y="420" width="35" height="15" fill="none" stroke="black" stroke-width="4" />
      </g>

      <!-- Flying Magical Butterfly -->
      <g transform="translate(120, 220)">
        <path d="M 50,50 Q 10,10 50,30 Q 90,10 50,50" fill="white" stroke="black" stroke-width="5" />
        <!-- Butterfly Wings Left -->
        <path d="M 50,40 C 10,0 -10,60 50,70" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Butterfly Wings Right -->
        <path d="M 55,40 C 95,0 115,60 55,70" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
        <!-- Body -->
        <rect x="49" y="30" width="8" height="55" rx="4" fill="white" stroke="black" stroke-width="4" />
        <line x1="49" y1="30" x2="35" y2="10" stroke="black" stroke-width="3" stroke-linecap="round" />
        <line x1="57" y1="30" x2="71" y2="10" stroke="black" stroke-width="3" stroke-linecap="round" />
      </g>

      <!-- Giant Smiling Flower on Left -->
      <g transform="translate(180, 580)">
        <!-- Flower Stem -->
        <path d="M 100,100 Q 80,180 100,240" fill="none" stroke="black" stroke-width="6" stroke-linecap="round" />
        <!-- Giant Leaf -->
        <path d="M 90,165 Q 20,150 50,200 Z" fill="white" stroke="black" stroke-width="4" stroke-linejoin="round" />
        <!-- Flower Center -->
        <circle cx="100" cy="100" r="50" fill="white" stroke="black" stroke-width="6" />
        <circle cx="85" cy="90" r="5" fill="black" />
        <circle cx="115" cy="90" r="5" fill="black" />
        <path d="M 90,115 Q 100,130 110,115" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" />
        
        <!-- Petals Around Center -->
        <circle cx="100" cy="30" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="100" cy="170" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="30" cy="100" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="170" cy="100" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="50" cy="50" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="150" cy="150" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="150" cy="50" r="28" fill="white" stroke="black" stroke-width="5" />
        <circle cx="50" cy="150" r="28" fill="white" stroke="black" stroke-width="5" />
      </g>
    `;
  } else {
    // DEFAULT BEAUTIFUL HOT AIR BALLOON IN CLOUDY SKY
    elements = `
      <!-- Hot Air Balloon theme -->
      <!-- Big Sun -->
      <circle cx="650" cy="220" r="70" fill="white" stroke="black" stroke-width="6" />
      <path d="M 650,130 L 650,110 M 650,310 L 650,330 M 560,220 L 540,220 M 740,220 L 760,220" stroke="black" stroke-width="5" stroke-linecap="round" />
      
      <!-- Big Soft Clouds -->
      <g transform="translate(80, 200)">
        <path d="M 30,60 C 10,60 10,30 30,30 C 30,10 70,10 80,20 C 100,-10 150,10 150,30 C 170,30 170,60 150,60 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      </g>
      <g transform="translate(560, 420)">
        <path d="M 30,60 C 10,60 10,30 30,30 C 30,10 70,10 80,20 C 100,-10 150,10 150,30 C 170,30 170,60 150,60 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      </g>

      <!-- Majestic Hot Air Balloon structure -->
      <g transform="translate(180, 220)">
        <!-- Balloon Envelope -->
        <path d="M 200,60 C 60,60 60,240 150,300 L 250,300 C 340,240 340,60 200,60 Z" fill="white" stroke="black" stroke-width="6" stroke-linejoin="round" />
        
        <!-- Stripes on the balloon helper lines for coloring -->
        <path d="M 120,80 Q 200,100 280,80" fill="none" stroke="black" stroke-width="4" />
        <path d="M 100,130 Q 200,160 300,130" fill="none" stroke="black" stroke-width="5" />
        <path d="M 90,190 Q 200,230 310,190" fill="none" stroke="black" stroke-width="5" />
        <path d="M 110,250 Q 200,290 290,250" fill="none" stroke="black" stroke-width="4" />
        
        <!-- Hanging ropes -->
        <line x1="165" y1="300" x2="175" y2="340" stroke="black" stroke-width="5" />
        <line x1="235" y1="300" x2="225" y2="340" stroke="black" stroke-width="5" stroke-linecap="round" />
        <line x1="200" y1="300" x2="200" y2="340" stroke="black" stroke-width="4" />
        
        <!-- Basket -->
        <rect x="165" y="340" width="70" height="50" rx="10" fill="white" stroke="black" stroke-width="6" />
        <!-- Criss-cross texture details for basket -->
        <line x1="180" y1="340" x2="180" y2="390" stroke="black" stroke-width="3" />
        <line x1="220" y1="340" x2="220" y2="390" stroke="black" stroke-width="3" />
        <line x1="165" y1="365" x2="235" y2="365" stroke="black" stroke-width="3" />
      </g>
    `;
  }

  // Wrap everything in a high quality, completely valid XML SVG wrapper
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
      <!-- SOLID WHITE BACKGROUND -->
      <rect id="svg-background" width="800" height="1000" fill="white" />
      
      <!-- DOUBLE OUTLINE PAGE FRAME -->
      <rect x="25" y="25" width="750" height="950" rx="20" fill="none" stroke="black" stroke-width="6" />
      <rect x="35" y="35" width="730" height="930" rx="10" fill="none" stroke="black" stroke-width="2" stroke-dasharray="10,12" />

      <!-- CUSTOM OUTLINE LETTERS FOR CHILD'S NAME AT TOP -->
      <!-- Cloud container for Name -->
      <path d="M 180,140 C 130,140 110,95 160,85 C 130,40 230,10 280,45 C 330,10 470,10 520,45 C 570,10 670,40 640,85 C 690,95 670,140 620,140 Z" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" />
      
      <text x="400" y="85" font-family="'Fredoka', 'Comic Sans MS', 'Arial Black', sans-serif" font-weight="900" font-size="34" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" text-anchor="middle" letter-spacing="1">
        ${(childName || "FRIEND").toUpperCase()}'S
      </text>
      <text x="400" y="125" font-family="'Fredoka', 'Comic Sans MS', 'Arial Black', sans-serif" font-weight="900" font-size="32" fill="white" stroke="black" stroke-width="5" stroke-linejoin="round" text-anchor="middle" letter-spacing="2">
        COLORING ADVENTURE
      </text>

      <!-- THE THEMED ILLUSTRATIONS -->
      ${elements}

      <!-- OUTLINE BANNER AT BOTTOM FOR STORY TEXT AND PAGE NUMBER -->
      <g transform="translate(60, 830)">
        <rect x="0" y="0" width="680" height="80" rx="15" fill="white" stroke="black" stroke-width="5" />
        
        <!-- Caption Title label banner -->
        <rect x="30" y="-15" width="220" height="30" rx="10" fill="white" stroke="black" stroke-width="4" />
        <text x="140" y="5" font-family="sans-serif" font-weight="bold" font-size="12" fill="black" text-anchor="middle">
          CHAPTER ${pageNumber} : ${(title || "COLORING TIME").toUpperCase()}
        </text>

        <!-- Bold Caption Text -->
        <text x="340" y="47" font-family="sans-serif" font-weight="bold" font-size="15" fill="black" text-anchor="middle">
          "${caption || "Let's capture this magnificent world with colors!"}"
        </text>
      </g>
    </svg>
  `.trim();
}

// Robust retry wrapper with backoff to prevent transient rate limits or 503s
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    console.warn(`Transient error encountered on Gemini model. Retrying in ${delay}ms... Error:`, error.message || error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Helper: generate coloring page as SVG
async function generateSVGColoringPage(theme: string, childName: string, pageNumber: number, title: string, pagePrompt: string, caption: string): Promise<string> {
  const promptText = `Create a beautiful, clean, bold black and white kids' SVG coloring page.
Theme: "${theme}"
Child's Name: "${childName}"
Page #${pageNumber}: "${title}"
Scene to draw: "${pagePrompt}"
Printed bottom caption: "${caption}"

Instructions:
1. ONLY return a valid, well-formed inline XML SVG string starting with "<svg" and ending with "</svg>". Do NOT wrap in backticks, markdown markers, or include any surrounding text.
2. The SVG viewport MUST be exactly width="800" height="1000", with viewBox="0 0 800 1000".
3. The background MUST be solid white: start with a "<rect width=\\"800\\" height=\\"1000\\" fill=\\"white\\" />".
4. Every stroke/path/circle/rect/line MUST have stroke="black", stroke-width="5" or "6" (super thick, crisp, perfectly clear bold lines for toddlers' crayon coloring), stroke-linecap="round", stroke-linejoin="round", and fill="white" or fill="none".
5. Keep shapes large, cute, simple, and friendly (cartoon circles, simple curves, big friendly dinosaur smiles, large space helmets). ABSOLUTELY NO shading, fine hatching, gray scales, gradients, patterns, or thin messy details.
6. Make sure to embed the child's name "${childName}" inside the graphic in oversized bubble letters or outline text (e.g., inside a banner, on a badge, or as a fun giant cloud text), so they can color in their own name!
7. Ensure the entire 800x1000 canvas is filled with high-contrast, cute cartoon line-art elements that match the scene.
8. Make sure the SVG is completely valid XML and renders a complete coloring masterpiece.`;

  // Apply robust retry with backoff and a 15-second individual timeout limit!
  const response = await retryWithBackoff(async () => {
    // Race Gemini request with an explicit 15s timeout
    const apiCall = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        temperature: 0.2,
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout of 15 seconds exceeded on LLM SVG generation.")), 15000)
    );

    return Promise.race([apiCall, timeoutPromise]);
  });

  let rawSvg = response.text || "";
  // String cleanups to ensure we get ONLY the svg element
  rawSvg = rawSvg.trim();
  if (rawSvg.includes("```xml")) {
    rawSvg = rawSvg.substring(rawSvg.indexOf("```xml") + 6);
  } else if (rawSvg.includes("```html")) {
    rawSvg = rawSvg.substring(rawSvg.indexOf("```html") + 7);
  } else if (rawSvg.includes("```svg")) {
    rawSvg = rawSvg.substring(rawSvg.indexOf("```svg") + 6);
  } else if (rawSvg.includes("```")) {
    rawSvg = rawSvg.substring(rawSvg.indexOf("```") + 3);
  }
  if (rawSvg.endsWith("```")) {
    rawSvg = rawSvg.substring(0, rawSvg.lastIndexOf("```"));
  }
  rawSvg = rawSvg.trim();
  
  // Enforce XML declarations or cleanup
  if (!rawSvg.startsWith("<svg")) {
    const startIndex = rawSvg.indexOf("<svg");
    if (startIndex >= 0) {
      rawSvg = rawSvg.substring(startIndex);
    }
  }
  const endIndex = rawSvg.lastIndexOf("</svg>");
  if (endIndex >= 0) {
    rawSvg = rawSvg.substring(0, endIndex + 6);
  }

  // Double-verify that we have an actual svg element
  if (!rawSvg.startsWith("<svg")) {
    throw new Error("Generated content was not a valid SVG.");
  }

  return rawSvg;
}

// API 2: Generate Coloring Page Line Art (Image or SVG)
app.post("/api/generate-page-image", async (req, res) => {
  const { theme, childName, pageNumber, title, prompt, caption, mode } = req.body;
  try {
    if (!theme || !childName || !pageNumber || !title || !prompt || !caption) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    console.log(`Generating page #${pageNumber} (${title}) using mode: "${mode}"`);

    // Let's implement the generation logic
    if (mode === "svg") {
      // Direct SVG generation with defensive fallback inside try block
      try {
        const svgContent = await generateSVGColoringPage(theme, childName, pageNumber, title, prompt, caption);
        return res.json({ type: "svg", content: svgContent });
      } catch (innerError: any) {
        console.warn("SVG prompt generation timed out or failed. Rendering cute procedural fallback instead:", innerError.message || innerError);
        const fallbackSvg = getProceduralSVG(theme, childName, pageNumber, title, caption);
        return res.json({ type: "svg", content: fallbackSvg, isFallback: true });
      }
    } else {
      // mode === "imagen" (or auto fallback)
      try {
        console.log(`Calling Imagen-4 for children's coloring page...`);
        
        // Formulate a highly targeted prompt for coloring pages
        const imagenPrompt = `An ultra-clean, minimal coloring page for children, pure black and white line art, extremely thick lines, bold outlines, white background, no shading, no gray, no sketch lines, simple cartoon style, high contrast, perfect vector line-art quality. Featuring: ${prompt}. Cute and friendly, suitable for crayons.`;

        const response = await retryWithBackoff(async () => {
          // Race Image Gen request with an explicit 15s timeout
          const imgCall = ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagenPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout of 15 seconds exceeded on LLM Image generation.")), 15000)
          );

          return Promise.race([imgCall, timeoutPromise]);
        });

        const imageBytes = response.generatedImages[0].image.imageBytes;
        const base64Image = `data:image/jpeg;base64,${imageBytes}`;
        return res.json({ type: "raster", content: base64Image });
      } catch (imagenError: any) {
        console.warn("Imagen generation failed or not configured. Falling back to SVG vector art! Error:", imagenError.message || imagenError);
        
        // Graceful automatic fallback to LLM SVG, or local procedural SVG if both fail
        try {
          const svgContent = await generateSVGColoringPage(theme, childName, pageNumber, title, prompt, caption);
          return res.json({ type: "svg", content: svgContent, isFallback: true });
        } catch (svgError: any) {
          console.warn("LLM fallback failed as well. Drawing gorgeous procedural layout instead:", svgError.message || svgError);
          const fallbackSvg = getProceduralSVG(theme, childName, pageNumber, title, caption);
          return res.json({ type: "svg", content: fallbackSvg, isFallback: true });
        }
      }
    }
  } catch (error: any) {
    console.error("Critical error in generation router:", error);
    // Absolute containment: never return 500 HTML. Always return procedural vector!
    const ultimateFallback = getProceduralSVG(theme, childName, pageNumber, title, caption);
    res.json({ type: "svg", content: ultimateFallback, isFallback: true, error: error.message });
  }
});

// Serve static assets and bundle Express to Vite dev server in development
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Coloring Book Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
