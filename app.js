document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LOCALIZATION (多语言和多区域准备) ---
    const loc = {
        loading: "正在连接AI大厨...",
        noResults: "抱歉，没有找到完全符合您条件的菜谱，请尝试放宽预算或更换口味。",
        error: "网络开小差了，请稍后再试 T_T",
        adopt: "采纳此食谱",
        adopted: "已采纳 ✔",
        summaryTitle: "今日饮食小结",
        costLabel: "今日已消费",
        caloriesLabel: "今日已摄入",
        noLog: "今天还未记录任何饮食哦。",
        yuan: "元",
        kcal: "千卡"
    };

    // --- 2. STATE MANAGEMENT (状态管理) ---
    let state = {
        dailyLog: { cost: 0, calories: 0, adoptedRecipeIds: [] },
        currentRecipeInModal: null,
        allFetchedRecipes: {} // 用于存储从后端获取的所有菜谱详情
    };
    let dailyLogChart;

    // --- 3. DOM ELEMENT REFERENCES (DOM元素引用) ---
    const dinersSlider = document.getElementById('diners'), dinersValue = document.getElementById('diners-value');
    const budgetSlider = document.getElementById('budget'), budgetValue = document.getElementById('budget-value');
    const tasteOptions = document.getElementById('taste-options');
    const generateBtn = document.getElementById('generate-btn'), refreshBtn = document.getElementById('refresh-btn');
    const welcomeMessage = document.getElementById('welcome-message'), loadingSpinner = document.getElementById('loading-spinner');
    const recipeCardsContainer = document.getElementById('recipe-cards-container'), resultsHeader = document.getElementById('results-header');
    const logSummary = document.getElementById('log-summary');
    const tabButtons = document.querySelectorAll('.tab-btn'), tabContents = document.querySelectorAll('.tab-content');
    const recipeModal = document.getElementById('recipe-modal'), modalContent = document.getElementById('modal-content');
    const modalCloseBtn = document.getElementById('modal-close-btn'), modalAdoptBtn = document.getElementById('modal-adopt-btn');

    // --- 4. CORE LOGIC & DATA HANDLING (核心逻辑与数据处理) ---
    function saveState() { localStorage.setItem('yaowish_state', JSON.stringify(state)); }
    function loadState() {
        const savedState = localStorage.getItem('yaowish_state');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            if (!Array.isArray(parsedState.dailyLog.adoptedRecipeIds)) {
                parsedState.dailyLog.adoptedRecipeIds = [];
            }
            state = parsedState;
             // 确保 allFetchedRecipes 存在
            if (!state.allFetchedRecipes) {
                state.allFetchedRecipes = {};
            }
        }
    }

    async function fetchRecommendations() {
        const prefs = {
            diners: parseInt(dinersSlider.value),
            budget: parseInt(budgetSlider.value),
            taste: tasteOptions.querySelector('.active')?.textContent || '无'
        };

        // 显示加载动画
        welcomeMessage.classList.add('hidden');
        recipeCardsContainer.innerHTML = '';
        resultsHeader.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        loadingSpinner.querySelector('p').textContent = loc.loading;

        try {
            // 使用fetch调用后端API
            const response = await fetch('/api/getRecommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(prefs),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const recipes = await response.json();
            
            // 存储获取到的菜谱详情
            recipes.forEach(recipe => {
                state.allFetchedRecipes[recipe.id] = recipe;
            });

            displayRecipes(recipes);

        } catch (error) {
            console.error('Fetch error:', error);
            recipeCardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">${loc.error}</p>`;
        } finally {
            // 无论成功或失败，都隐藏加载动画
            loadingSpinner.classList.add('hidden');
        }
    }

    function adoptCurrentRecipe() {
        if (!state.currentRecipeInModal) return;
        const recipe = state.currentRecipeInModal;
        if (state.dailyLog.adoptedRecipeIds.includes(recipe.id)) return;

        state.dailyLog.cost += recipe.cost;
        state.dailyLog.calories += recipe.calories;
        state.dailyLog.adoptedRecipeIds.push(recipe.id);
        
        saveState();
        updateLogUI();
        updateModalAdoptButton();
    }

    // --- 5. UI RENDERING & UPDATES (UI渲染与更新) ---
    function initializeChart() {
        const ctx = document.getElementById('dailyLogChart').getContext('2d');
        dailyLogChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [`消费(${loc.yuan})`, `热量(${loc.kcal})`], datasets: [{ data: [0, 0], backgroundColor: ['rgba(165, 165, 141, 0.6)', 'rgba(221, 161, 94, 0.6)'], borderWidth: 1 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
        });
    }
    
    function updateLogUI() {
        if (state.dailyLog.cost === 0 && state.dailyLog.calories === 0) {
            logSummary.innerHTML = `<p>${loc.noLog}</p>`;
        } else {
            logSummary.innerHTML = `<p>${loc.costLabel}: <strong class="text-green-600">${state.dailyLog.cost.toFixed(2)}</strong> ${loc.yuan}</p><p>${loc.caloriesLabel}: <strong class="text-orange-600">${state.dailyLog.calories}</strong> ${loc.kcal}</p>`;
        }
        if (dailyLogChart) {
            dailyLogChart.data.datasets[0].data = [state.dailyLog.cost, state.dailyLog.calories];
            dailyLogChart.update();
        }
    }

    function displayRecipes(recipes) {
        recipeCardsContainer.innerHTML = '';
        if (recipes.length === 0) {
            recipeCardsContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full">${loc.noResults}</p>`;
            return;
        }
        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105';
            card.dataset.recipeId = recipe.id;
            card.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.name}" class="w-full h-40 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg truncate">${recipe.name}</h3>
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>🔥 ${recipe.calories} ${loc.kcal}</span>
                        <span>💰 ¥${recipe.cost.toFixed(2)}</span>
                    </div>
                </div>`;
            recipeCardsContainer.appendChild(card);
        });
    }
    
    function openModal(recipe) {
        state.currentRecipeInModal = recipe;
        document.getElementById('modal-image').style.backgroundImage = `url(${recipe.image})`;
        document.getElementById('modal-title').textContent = recipe.name;
        document.getElementById('modal-calories').textContent = `🔥 ${recipe.calories} ${loc.kcal}`;
        document.getElementById('modal-cost').textContent = `💰 ¥${recipe.cost.toFixed(2)}`;
        document.getElementById('modal-ingredients').textContent = recipe.ingredients;
        document.getElementById('modal-steps').textContent = recipe.steps;
        
        updateModalAdoptButton();
        
        recipeModal.classList.remove('opacity-0', 'pointer-events-none');
        modalContent.classList.remove('scale-95');
    }

    function closeModal() {
        recipeModal.classList.add('opacity-0', 'pointer-events-none');
        modalContent.classList.add('scale-95');
        state.currentRecipeInModal = null;
    }

    function updateModalAdoptButton() {
        if (state.currentRecipeInModal && state.dailyLog.adoptedRecipeIds.includes(state.currentRecipeInModal.id)) {
            modalAdoptBtn.textContent = loc.adopted;
            modalAdoptBtn.disabled = true;
            modalAdoptBtn.classList.add('bg-green-600', 'cursor-not-allowed');
            modalAdoptBtn.classList.remove('bg-[#A5A58D]');
        } else {
            modalAdoptBtn.textContent = loc.adopt;
            modalAdoptBtn.disabled = false;
            modalAdoptBtn.classList.remove('bg-green-600', 'cursor-not-allowed');
            modalAdoptBtn.classList.add('bg-[#A5A58D]');
        }
    }

    // --- 6. EVENT LISTENERS & HANDLERS (事件监听与处理) ---
    function setupEventListeners() {
        dinersSlider.addEventListener('input', () => dinersValue.textContent = dinersSlider.value);
        budgetSlider.addEventListener('input', () => budgetValue.textContent = budgetSlider.value);
        tasteOptions.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                tasteOptions.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
        generateBtn.addEventListener('click', fetchRecommendations);
        refreshBtn.addEventListener('click', fetchRecommendations);
        tabButtons.forEach(btn => btn.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            tabContents.forEach(content => {
                content.id === `${targetTab}-tab` ? content.classList.remove('hidden') : content.classList.add('hidden');
            });
            document.getElementById('main-content-area').scrollTop = 0;
        }));
        recipeCardsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('[data-recipe-id]');
            if (card) {
                const recipeId = parseInt(card.dataset.recipeId);
                const recipe = state.allFetchedRecipes[recipeId]; // 从存储中获取详情
                if (recipe) openModal(recipe);
            }
        });
        modalCloseBtn.addEventListener('click', closeModal);
        modalAdoptBtn.addEventListener('click', adoptCurrentRecipe);
        recipeModal.addEventListener('click', (e) => { if (e.target === recipeModal) closeModal(); });
    }

    // --- 7. INITIALIZATION (初始化) ---
    function initializeApp() {
        loadState();
        initializeChart();
        updateLogUI();
        setupEventListeners();
    }

    initializeApp();
});