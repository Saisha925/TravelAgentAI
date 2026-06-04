import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: any = null;
function getGeminiClient(): any {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error(
      "Missing GEMINI_API_KEY environment variable. Please set your Gemini API key in the Secrets / Env Variables configuration tab of Google AI Studio."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Simulated MCP databases and parameters
const CATEGORIES = ["Transport", "Hotel", "Food", "Sightseeing", "Shopping", "Adventure", "Relaxation"];

// API Enpoint to generate complete Travel Plan utilizing collaborative Agents
app.post("/api/plan", async (req: Request, res: Response) => {
  try {
    const { origin, destination, startDate, endDate, budget, travelStyle, interests } = req.body;

    if (!origin || !destination || !startDate || !endDate || !budget || !travelStyle) {
      return res.status(400).json({ error: "Missing required parameters to customize travel plan." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Build specialized step-by-step agent trace logs
    const timestamp = () => new Date().toISOString();
    const logs: any[] = [
      {
        id: "log-1",
        timestamp: timestamp(),
        agentName: "System Coordinator",
        targetAgentOrMcp: "Itinerary Planner Agent",
        type: "system",
        message: `Task initialized: Plan a ${diffDays}-day custom trip to ${destination} from ${origin}. Budget target: $${budget}. Style: ${travelStyle}.`,
      },
      {
        id: "log-2",
        timestamp: timestamp(),
        agentName: "Itinerary Planner Agent",
        targetAgentOrMcp: "Flight Search Agent",
        type: "collaboration",
        message: `Requested Flight Search Agent to look up optimal roundtrip flights from ${origin} to ${destination} matching a ${travelStyle} travel profile on dates ${startDate} to ${endDate}.`,
      },
      {
        id: "log-3",
        timestamp: timestamp(),
        agentName: "Flight Search Agent",
        targetAgentOrMcp: "Travel API MCP",
        type: "tool_call",
        message: `Invoking 'search_flights' in Travel API MCP server`,
        payload: JSON.stringify({ origin, destination, startDate, endDate, maxPrice: Math.round(budget * 0.35) }, null, 2),
      },
      {
        id: "log-4",
        timestamp: timestamp(),
        agentName: "Flight Search Agent",
        targetAgentOrMcp: "Travel API MCP",
        type: "tool_response",
        message: `Received flight search results. Filtered down to 3 recommendations fitting the budget ceiling of $${Math.round(budget * 0.35)}.`,
      },
      {
        id: "log-5",
        timestamp: timestamp(),
        agentName: "Flight Search Agent",
        targetAgentOrMcp: "Itinerary Planner Agent",
        type: "collaboration",
        message: `Sent flights listing back to Itinerary Planner with a recommended prime option.`,
      },
      {
        id: "log-6",
        timestamp: timestamp(),
        agentName: "Itinerary Planner Agent",
        targetAgentOrMcp: "Hotel Recommendation Agent",
        type: "collaboration",
        message: `Requested Hotel Recommendation Agent to source reviews and recommend lodging in ${destination} aligned with a '${travelStyle}' vibe and withinbudget limits.`,
      },
      {
        id: "log-7",
        timestamp: timestamp(),
        agentName: "Hotel Recommendation Agent",
        targetAgentOrMcp: "Travel API MCP",
        type: "tool_call",
        message: `Invoking 'search_hotels' in Travel API MCP server`,
        payload: JSON.stringify({ location: destination, travelStyle, priceCategory: budget < 1000 ? "budget" : budget < 3000 ? "mid-range" : "luxury" }, null, 2),
      },
      {
        id: "log-8",
        timestamp: timestamp(),
        agentName: "Hotel Recommendation Agent",
        targetAgentOrMcp: "Travel API MCP",
        type: "tool_response",
        message: "Retrieved hotel listings with ratings and description filters.",
      },
      {
        id: "log-9",
        timestamp: timestamp(),
        agentName: "Hotel Recommendation Agent",
        targetAgentOrMcp: "Itinerary Planner Agent",
        type: "collaboration",
        message: "Filtered hotel matching amenities and style, cataloged prime hotel proposals and forwarded recommendations.",
      },
      {
        id: "log-10",
        timestamp: timestamp(),
        agentName: "Itinerary Planner Agent",
        targetAgentOrMcp: "Weather Information Agent",
        type: "collaboration",
        message: `Requested Weather Information Agent to assess forecast logs and current trends in ${destination} for dates ${startDate} to ${endDate}.`,
      },
      {
        id: "log-11",
        timestamp: timestamp(),
        agentName: "Weather Information Agent",
        targetAgentOrMcp: "Weather MCP",
        type: "tool_call",
        message: `Invoking 'get_weather_summary' in Weather MCP server`,
        payload: JSON.stringify({ location: destination, startMonth: startDate.split("-")[1], days: diffDays }, null, 2),
      },
      {
        id: "log-12",
        timestamp: timestamp(),
        agentName: "Weather Information Agent",
        targetAgentOrMcp: "Weather MCP",
        type: "tool_response",
        message: `Acquired seasonal weather summary data for ${destination}. Forecast matches historical trends.`,
      },
      {
        id: "log-13",
        timestamp: timestamp(),
        agentName: "Weather Information Agent",
        targetAgentOrMcp: "Itinerary Planner Agent",
        type: "collaboration",
        message: "Formulated custom packing and climate guidelines, and delivered report summary to Itinerary Planner.",
      },
      {
        id: "log-14",
        timestamp: timestamp(),
        agentName: "Itinerary Planner Agent",
        targetAgentOrMcp: "Maps MCP",
        type: "tool_call",
        message: `Invoking 'optimize_navigation_matrix' in Maps MCP server to plot localized relative coordinates (coords mapping x/y, 0-100) and generate travel routing sequences.`,
        payload: JSON.stringify({ destination, interests, nodes: diffDays * 3 }, null, 2),
      },
      {
        id: "log-15",
        timestamp: timestamp(),
        agentName: "Itinerary Planner Agent",
        targetAgentOrMcp: "Maps MCP",
        type: "tool_response",
        message: "Maps MCP matched the landmark array and calculated efficient coordinates map nodes and routing chains.",
      },
      {
        id: "log-16",
        timestamp: timestamp(),
        agentName: "Itinerary Planner Agent",
        targetAgentOrMcp: "System Coordinator",
        type: "collaboration",
        message: "Synthesizing itinerary layout using Gemini AI, aligning activities with weather constraints, geographical corridors, and total budget boundaries.",
      },
    ];

    const ai = getGeminiClient();

    const systemPrompt = `You are a professional travel planning coordination system called Itinerary Planner Agent.
You generate fully customized travel options in structured JSON matching the parameters requested.
Your plan MUST respect the user's origin, destination, date range, budget, travel style, and interests:
- Origin: ${origin}
- Destination: ${destination}
- Dates: ${startDate} to ${endDate} (${diffDays} days)
- Budget: $${budget}
- Travel Style: ${travelStyle}
- Interests: ${interests.join(", ")}

Generate details:
1. "flights": 3 realistic roundtrip options. For ID, use random string e.g. "f-1", "f-2", "f-3". Price should fit the target budget (for budget style: low price, luxury style: premium price). Origin and destination must match user inputs. Departure and arrival times must look highly authentic.
2. "hotels": 3 realistic accommodation options in the destination. For ID, use "h-1", "h-2", "h-3". Include nightly prices, addresses, ratings (out of 5), descriptions, and 4 amenities.
3. "weather": An array matching each day of the travel. Predict actual realistic weather (temps, sky condition, detailed packing suggestions) in ${destination} for the travel dates. High/Low temps must be numbers.
4. "itinerary": EXACTLY ${diffDays} day nodes.
   - Each day element MUST contain: "dayNumber" (integer starting from 1), "date" (string e.g. "June 5, 2026"), "theme" (descriptive single line of the main highlight today).
   - "activities": EXACTLY 3 high-quality, customized, localized activities (Morning, Afternoon, Evening) for each day.
     - Each activity contains: "id" (unique string), "title" (specific name of restaurant, landmark, monument, museum with local authenticity), "time" (e.g. "09:00 AM", "01:30 PM", "07:00 PM"), "duration" (e.g. "2 hours"), "location" (neighborhood or address), "description" (engaging 1-2 sentences), "cost" (estimate number in USD, 0 if free), "category" (choose EXACTLY ONE from: "Transport", "Hotel", "Food", "Sightseeing", "Shopping", "Adventure", "Relaxation").
     - "coords": Map coordinates. Select x and y as a percentage or grid spacing numbers (between 5 and 95) representing geographic landmarks in standard coordinates, so we can connect and plot them cleanly on the interactive visual map! (Make the activities in the same geographical region or day follow a logical sequence so they don't jump all over the place).
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Generate the travel plan JSON as instructed.",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  airline: { type: Type.STRING },
                  flightNumber: { type: Type.STRING },
                  departureTime: { type: Type.STRING },
                  arrivalTime: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  origin: { type: Type.STRING },
                  destination: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  stops: { type: Type.INTEGER },
                },
                required: ["id", "airline", "flightNumber", "departureTime", "arrivalTime", "price", "origin", "destination", "duration", "stops"],
              },
            },
            hotels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  pricePerNight: { type: Type.NUMBER },
                  rating: { type: Type.NUMBER },
                  address: { type: Type.STRING },
                  description: { type: Type.STRING },
                  amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["id", "name", "pricePerNight", "rating", "address", "description", "amenities"],
              },
            },
            weather: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  date: { type: Type.STRING },
                  tempHigh: { type: Type.NUMBER },
                  tempLow: { type: Type.NUMBER },
                  condition: { type: Type.STRING },
                  description: { type: Type.STRING },
                  packingAdvice: { type: Type.STRING },
                },
                required: ["day", "date", "tempHigh", "tempLow", "condition", "description", "packingAdvice"],
              },
            },
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  date: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        time: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING },
                        cost: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        coords: {
                          type: Type.OBJECT,
                          properties: {
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                          },
                          required: ["x", "y"],
                        },
                      },
                      required: [
                        "id",
                        "title",
                        "time",
                        "duration",
                        "location",
                        "description",
                        "cost",
                        "category",
                        "coords",
                      ],
                    },
                  },
                },
                required: ["dayNumber", "date", "theme", "activities"],
              },
            },
          },
          required: ["flights", "hotels", "weather", "itinerary"],
        },
      },
    });

    const bodyText = response.text || "{}";
    let parsedData = JSON.parse(bodyText.trim());

    // Select the best first flight and hotel as defaults
    const selectedFlight = parsedData.flights?.[0] || null;
    const selectedHotel = parsedData.hotels?.[0] || null;

    // Calculate dynamic expenses
    const expenses: any[] = [];
    if (selectedFlight) {
      expenses.push({
        id: "exp-flight",
        title: `Roundtrip flight (${selectedFlight.airline} - ${selectedFlight.flightNumber})`,
        amount: selectedFlight.price,
        category: "Flights",
        date: startDate,
      });
    }
    if (selectedHotel) {
      expenses.push({
        id: "exp-hotel",
        title: `${selectedHotel.name} (${diffDays} nights at $${selectedHotel.pricePerNight})`,
        amount: selectedHotel.pricePerNight * diffDays,
        category: "Hotels",
        date: startDate,
      });
    }

    let actCounter = 1;
    if (parsedData.itinerary) {
      for (const day of parsedData.itinerary) {
        if (day.activities) {
          for (const act of day.activities) {
            if (act.cost > 0) {
              expenses.push({
                id: `exp-act-${actCounter++}`,
                title: act.title,
                amount: act.cost,
                category: "Activities",
                date: day.date,
              });
            }
          }
        }
      }
    }

    const travelPlan = {
      id: "plan-" + Math.random().toString(36).substr(2, 9),
      origin,
      destination,
      startDate,
      endDate,
      budget: Number(budget),
      travelStyle,
      interests,
      flights: parsedData.flights || [],
      selectedFlight,
      hotels: parsedData.hotels || [],
      selectedHotel,
      weather: parsedData.weather || [],
      itinerary: parsedData.itinerary || [],
      expenses,
    };

    logs.push({
      id: "log-17",
      timestamp: timestamp(),
      agentName: "Itinerary Planner Agent",
      targetAgentOrMcp: "System Coordinator",
      type: "system",
      message: `Travel plan successfully formulated! All schedules cross-referenced. Flights, hotels, structured cost sheets and responsive interactive coordinates synchronized. Ready for deployment.`,
    });

    res.json({ travelPlan, logs });
  } catch (err: any) {
    console.error("Error generating travel plan:", err);
    let errorMsg = err.message || "Failed to generate travel plan.";
    if (errorMsg.includes("503") || errorMsg.includes("quota") || errorMsg.includes("UNAVAILABLE")) {
       errorMsg = "The Gemini AI model is currently experiencing high demand or daily quota restrictions. Please wait a moment and try again later.";
    }
    res.status(500).json({ error: errorMsg });
  }
});

// Travel Chat Assistant Multi-Agent API Router
// Takes current TravelPlan, chat History, and User message
// Returns a textual response, potentially updated TravelPlan, and a list of new interactive Agent Logs
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { travelPlan, message, history } = req.body;

    if (!travelPlan || !message) {
      return res.status(400).json({ error: "Missing required travelPlan or message contents." });
    }

    const ai = getGeminiClient();

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // System instructions explaining agent collaboration
    const chatSystemInstruction = `You are the Itinerary Planning Agent, a master travel orchestrator. You work with Flight Search Agent, Hotel Recommendation Agent, and Weather Information Agent to optimize the user's travel plans.
The user is viewing their active travel plan. They can request edits, add stops, swap hotels, find cheaper flights, check weather suitability, adjust expenses, or customize activities.

You must handle the user's request, deliberate with other agents as needed, compile necessary logs of who did what, and output a structured JSON response.

Your JSON output must strictly follow this shape:
{
  "reply": "Clear, friendly response text from Itinerary Planning Agent explaining the adjustments or recommendations made.",
  "updatedPlan": { ... full TravelPlan object ... }, // Provide the fully updated TravelPlan with the changes applied! If no physical plan changes are made (e.g., user just asked a weather question or general tip), return null.
  "agentLogs": [
     // List of logs representing background agent collaboration or MCP tools called in response to this message e.g.:
     {
       "id": "chatlog-x",
       "timestamp": "ISO Date string",
       "agentName": "Flight Search Agent" | "Hotel Recommendation Agent" | "Weather Information Agent" | "Itinerary Planner Agent",
       "targetAgentOrMcp": "Travel API MCP" | "Weather MCP" | "Maps MCP" | "Itinerary Planner Agent" | "Flight Search Agent",
       "type": "tool_call" | "tool_response" | "collaboration" | "info",
       "message": "Detail of tool call or communication step..."
     }
  ]
}

Available properties in TravelPlan context for updates:
- Selected flight choices can be modified or selected from the arrays.
- Selected hotel choices can be changed.
- If activities are replaced/edited/added/deleted in the day-by-day Itinerary, make sure to update both:
  1. TravelPlan's "itinerary" node day activity details.
  2. TravelPlan's "expenses" node (make sure expenses for swapped flights, hotels, or custom activities are recalculated correctly! Flights expense uses selectedFlight.price, Hotel expense uses selectedHotel.pricePerNight * stayDays, activities use activity.cost).
- When adding or replacing activities, make sure they have a valid ID e.g. "act-new", title, category, description, cost, coordinates (coords: { x: number, y: number }), location, time, and duration.
- For new/updated coordinates, output numbers between 10 and 90, matching near geographic landmarks on our relative mapping coordinate space.

Current active plan:
${JSON.stringify(travelPlan, null, 2)}
`;

    // Fetch conversation response
    const chatResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...formattedHistory,
        {
          role: "user",
          parts: [
            {
              text: `Please handle this user request: "${message}". If the request causes logical changes, output the updated plan and details. Always output a friendly reply and background agent interaction logs.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: chatSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            updatedPlan: {
              type: Type.OBJECT,
              description: "Optional complete updated TravelPlan, or null if no changes are made.",
              // Re-use standard travel plan structure to ensure strict formatting
              properties: {
                id: { type: Type.STRING },
                origin: { type: Type.STRING },
                destination: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                budget: { type: Type.NUMBER },
                travelStyle: { type: Type.STRING },
                interests: { type: Type.ARRAY, items: { type: Type.STRING } },
                flights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      airline: { type: Type.STRING },
                      flightNumber: { type: Type.STRING },
                      departureTime: { type: Type.STRING },
                      arrivalTime: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      origin: { type: Type.STRING },
                      destination: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      stops: { type: Type.INTEGER },
                    },
                    required: ["id", "airline", "flightNumber", "departureTime", "arrivalTime", "price", "origin", "destination", "duration", "stops"],
                  },
                },
                selectedFlight: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    id: { type: Type.STRING },
                    airline: { type: Type.STRING },
                    flightNumber: { type: Type.STRING },
                    departureTime: { type: Type.STRING },
                    arrivalTime: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    origin: { type: Type.STRING },
                    destination: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    stops: { type: Type.INTEGER },
                  },
                },
                hotels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      pricePerNight: { type: Type.NUMBER },
                      rating: { type: Type.NUMBER },
                      address: { type: Type.STRING },
                      description: { type: Type.STRING },
                      amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["id", "name", "pricePerNight", "rating", "address", "description", "amenities"],
                  },
                },
                selectedHotel: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    pricePerNight: { type: Type.NUMBER },
                    rating: { type: Type.NUMBER },
                    address: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
                weather: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING },
                      date: { type: Type.STRING },
                      tempHigh: { type: Type.NUMBER },
                      tempLow: { type: Type.NUMBER },
                      condition: { type: Type.STRING },
                      description: { type: Type.STRING },
                      packingAdvice: { type: Type.STRING },
                    },
                  },
                },
                itinerary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      dayNumber: { type: Type.INTEGER },
                      date: { type: Type.STRING },
                      theme: { type: Type.STRING },
                      activities: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            time: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            location: { type: Type.STRING },
                            description: { type: Type.STRING },
                            cost: { type: Type.NUMBER },
                            category: { type: Type.STRING },
                            coords: {
                              type: Type.OBJECT,
                              properties: {
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                              },
                              required: ["x", "y"],
                            },
                          },
                          required: [
                            "id",
                            "title",
                            "time",
                            "duration",
                            "location",
                            "description",
                            "cost",
                            "category",
                            "coords",
                          ],
                        },
                      },
                    },
                  },
                },
                expenses: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                      date: { type: Type.STRING },
                    },
                    required: ["id", "title", "amount", "category", "date"],
                  },
                },
              },
            },
            agentLogs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  agentName: { type: Type.STRING },
                  targetAgentOrMcp: { type: Type.STRING },
                  type: { type: Type.STRING },
                  message: { type: Type.STRING },
                  payload: { type: Type.STRING, nullable: true },
                },
                required: ["id", "timestamp", "agentName", "targetAgentOrMcp", "type", "message"],
              },
            },
          },
          required: ["reply", "agentLogs"],
        },
      },
    });

    const bodyText = chatResponse.text || "{}";
    const parsedData = JSON.parse(bodyText.trim());

    res.json(parsedData);
  } catch (err: any) {
    console.error("Error in agent chat assistant:", err);
    let errorMsg = err.message || "Failed to converse with travel agents.";
    if (errorMsg.includes("503") || errorMsg.includes("quota") || errorMsg.includes("UNAVAILABLE")) {
       errorMsg = "The Gemini AI model is currently busy or out of quota. Please try your request again later.";
    }
    res.status(500).json({ error: errorMsg });
  }
});


// Serve Vite or bundled production dependencies and start listening
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  export default app;
}

startServer();
