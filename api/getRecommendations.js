// 这是您的后端API服务，它将运行在云端（例如Vercel）。

// 模拟一个更丰富的菜谱数据库，AI将从中挑选
const allRecipes = [
    { id: 1, name: "鱼香肉丝", country: "中餐", calories: 850, cost: 35, taste: "酸甜", image: "https://placehold.co/600x400/ef4444/FFFFFF?text=鱼香肉丝", ingredients: "猪里脊, 木耳, 胡萝卜, 青椒", steps: "1. 肉丝加盐、料酒、淀粉腌制。\n2. 调鱼香汁。\n3. 炒制肉丝，加入配料翻炒。\n4. 倒入鱼香汁，大火收汁。" },
    { id: 2, name: "麻婆豆腐", country: "中餐", calories: 600, cost: 20, taste: "麻辣", image: "https://placehold.co/600x400/dc2626/FFFFFF?text=麻婆豆腐", ingredients: "豆腐, 牛肉末, 豆瓣酱, 花椒", steps: "1. 豆腐切块焯水。\n2. 炒香牛肉末和豆瓣酱。\n3. 加入豆腐和高汤，小火慢炖。\n4. 勾芡，撒上花椒粉和葱花。" },
    { id: 3, name: "宫保鸡丁", country: "中餐", calories: 780, cost: 40, taste: "酸甜", image: "https://placehold.co/600x400/f97316/FFFFFF?text=宫保鸡丁", ingredients: "鸡胸肉, 花生米, 干辣椒, 黄瓜", steps: "1. 鸡丁腌制。\n2. 炸香花生米。\n3. 炒制鸡丁，加入干辣椒和配料。\n4. 淋入宫保汁翻炒均匀。" },
    { id: 4, name: "日式照烧鸡", country: "日餐", calories: 720, cost: 45, taste: "咸鲜", image: "https://placehold.co/600x400/f59e0b/FFFFFF?text=照烧鸡", ingredients: "鸡腿肉, 酱油, 味醂, 清酒", steps: "1. 鸡腿肉煎至两面金黄。\n2. 调制照烧汁。\n3. 倒入照烧汁，小火慢煮至浓稠。" },
    { id: 5, name: "清蒸鲈鱼", country: "中餐", calories: 450, cost: 50, taste: "清淡", image: "https://placehold.co/600x400/84cc16/FFFFFF?text=清蒸鲈鱼", ingredients: "鲈鱼, 葱, 姜, 蒸鱼豉油", steps: "1. 鲈鱼处理干净，放上葱姜。\n2. 大火蒸8-10分钟。\n3. 倒掉多余水分，淋上蒸鱼豉油。\n4. 浇上热油即可。" },
    { id: 6, name: "韩式泡菜汤", country: "韩餐", calories: 550, cost: 45, taste: "微辣", image: "https://placehold.co/600x400/eab308/FFFFFF?text=泡菜汤", ingredients: "泡菜, 五花肉, 豆腐, 洋葱", steps: "1. 五花肉炒香。\n2. 加入泡菜翻炒。\n3. 加入水或高汤，煮沸。\n4. 加入豆腐、洋葱等配料，煮熟即可。" }
];

// 这是Node.js Serverless函数的标准写法
export default async function handler(request, response) {
    // 确保只处理POST请求
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST requests allowed' });
    }

    try {
        // 1. 从前端请求中获取用户偏好
        const { diners, budget, taste } = request.body;

        // 2. 构建给AI的详细指令 (Prompt)
        // 这是整个应用最核心的部分
        const promptToAI = `
            请你扮演一位精通多国菜系的厨师。
            根据以下条件，推荐2道菜:
            - 用餐人数: ${diners}
            - 总预算大约: ${budget} 元人民币
            - 口味偏好: ${taste}

            请以一个JSON数组的格式返回结果，数组中的每个对象都应包含以下字段：
            "id": (数字, 唯一标识), 
            "name": (字符串, 菜名), 
            "country": (字符串, 所属国家菜系),
            "calories": (数字, 单人份预估热量), 
            "cost": (数字, 单人份预估成本), 
            "taste": (字符串, 口味),
            "image": (字符串, 图片URL),
            "ingredients": (字符串, 主要食材列表),
            "steps": (字符串, 制作步骤，用\\n换行)
        `;

        console.log("--- Sending Prompt to AI ---");
        console.log(promptToAI);
        console.log("--------------------------");

        // 3. 调用AI的API (此处为模拟)
        // 在真实应用中，您会在这里使用fetch去调用Gemini API
        // const aiResponse = await fetch('https://generativelanguage.googleapis.com/...', { ... });
        // const recipes = await aiResponse.json();
        
        // --- AI调用模拟开始 ---
        // 为了让您能立即测试，我们模拟AI根据Prompt筛选数据的过程
        let filtered = allRecipes.filter(r => r.cost * diners <= budget);
        if (taste !== '无') {
            const tasteFiltered = filtered.filter(r => r.taste === taste);
            if (tasteFiltered.length > 0) filtered = tasteFiltered;
        }
        const recipes = filtered.sort(() => 0.5 - Math.random()).slice(0, 2);
        // --- AI调用模拟结束 ---


        // 4. 将AI返回的结果回传给前端
        // 设置响应头，允许所有来源的跨域请求（在开发阶段很有用）
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.status(200).json(recipes);

    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'An error occurred on the server.' });
    }
}