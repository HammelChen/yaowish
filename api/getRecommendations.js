const apiKey = process.env.GEMINI_API_KEY;
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

// This is the JSON schema we will ask the AI to follow.
// It ensures we get structured, reliable data every time.
const schema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "NUMBER" },
      name: { type: "STRING" },
      country: { type: "STRING" },
      calories: { type: "NUMBER" },
      cost: { type: "NUMBER" },
      taste: { type: "STRING" },
      cookingTime: { type: "NUMBER" },
      image: { type: "STRING" },
      ingredients: { type: "ARRAY", items: { type: "STRING" } },
      steps: { type: "ARRAY", items: { "type": "STRING" } },
    },
    required: ["id", "name", "country", "calories", "cost", "taste", "cookingTime", "image", "ingredients", "steps"]
  }
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST requests allowed' });
    }

    try {
        const { diners, budget, taste } = request.body;

        const prompt = `
            请你扮演一位世界级大厨和营养师。
            根据以下条件，为我推荐2道菜，风格可以多样，不要总是中餐:
            - 用餐人数: ${diners}
            - 总预算大约: ${budget} 元人民币
            - 口味偏好: ${taste}
            
            请严格按照我提供的JSON Schema格式返回一个JSON数组。
            - 'id' 应该是一个随机的、唯一的数字。
            - 'image' 字段请使用 "[https://placehold.co/600x400/RANDOM_HEX/FFFFFF?text=URL_ENCODED_NAME](https://placehold.co/600x400/RANDOM_HEX/FFFFFF?text=URL_ENCODED_NAME)" 格式生成一个占位图URL，其中RANDOM_HEX是一个随机的6位十六进制颜色代码, URL_ENCODED_NAME是URL编码后的菜名。
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        };

        const aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!aiResponse.ok) {
            const errorBody = await aiResponse.text();
            console.error("AI API Error:", errorBody);
            throw new Error(`AI API request failed with status ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        
        // Extract the JSON string from the AI's response and parse it
        const recipesText = data.candidates[0].content.parts[0].text;
        const recipes = JSON.parse(recipesText);

        response.setHeader('Access-Control-Allow-Origin', '*');
        response.status(200).json(recipes);

    } catch (error) {
        console.error("Backend Error:", error);
        response.status(500).json({ message: 'An error occurred on the server.', error: error.message });
    }
}
