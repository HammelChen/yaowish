
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LOCALIZATION ---
    const loc = {
        loading: "正在连接AI大厨...",
        noResults: "抱歉，AI没有找到合适的菜谱，请尝试放宽您的条件。",
        error: "网络开小差了，请稍后再试 T_T",
        adopt: "采纳此食谱",
        adopted: "已采纳 ✔",
        noLog: "今天还未记录任何饮食哦。",
        yuan: "元",
        kcal: "千卡",
        minutes: "分钟"
    };

    // --- 2. STATE MANAGEMENT ---
    let state = {
        dailyLog: { cost: 0, calories: 0, adoptedRecipeIds: [] },
        currentRecipeInModal: null,
        allFetchedRecipes: {}
    };
    let dailyLogChart;

    // --- 3. DOM REFERENCES ---
    const dinersInput = document.getElementById('diners-input');
    const budgetInput = document.getElementById('budget-input');
    const tasteOptions = document.getElementById('taste-options');
    const generateBtn = document.getElementById('generate-btn'), refreshBtn = document.getElementById('refresh-btn');
    const welcomeMessage = document.getElementById('welcome-message'), loadingSpinner = document.getElementById('loading-spinner');
    const recipeCardsContainer = document.getElementById('recipe-cards-container'), resultsHeader = document.getElementById('results-header');
    const logSummary = document.getElementById('log-summary');
    const tabButtons = document.querySelectorAll('.tab-btn'), tabContents = document.querySelectorAll('.tab-content');
    const recipeModal = document.getElementById('recipe-modal'), modalContent = document.getElementById('modal-content');
    const modalCloseBtn = document.getElementById('modal-close-btn'), modalAdoptBtn = document.getElementById('modal-adopt-btn');

    // --- 4. CORE LOGIC & DATA HANDLING ---
    function saveState() { localStorage.setItem('yaowish_state', JSON.stringify(state)); }
    function loadState() {
        const savedState = localStorage.getItem('yaowish_state');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            if (!Array.isArray(parsedState.dailyLog.adoptedRecipeIds)) {
                parsedState.dailyLog.adoptedRecipeIds = [];
            }
            state = parsedState;
            if (!state.allFetchedRecipes) state.allFetchedRecipes = {};
        }
    }

    async function fetchRecommendations() {
        const prefs = {
            diners: parseInt(dinersInput.value) || 1,
            budget: parseInt(budgetInput.value) || 0,
            taste: tasteOptions.querySelector('.active')?.textContent || '无'
        };

        welcomeMessage.classList.add('hidden');
        recipeCardsContainer.innerHTML = '';
        resultsHeader.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        loadingSpinner.querySelector('p').textContent = loc.loading;

        try {
            const response = await fetch('/api/getRecommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const recipes = await response.json();
            
            recipes.forEach(recipe => {
                state.allFetchedRecipes[recipe.id] = recipe;
            });
            displayRecipes(recipes);
        } catch (error) {
            console.error('Fetch error:', error);
            recipeCardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">${loc.error}</p>`;
        } finally {
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

    // --- 5. UI RENDERING & UPDATES ---
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
            logSummary.innerHTML = `<p>今日已消费: <strong class="text-green-600">${state.dailyLog.cost.toFixed(2)}</strong> ${loc.yuan}</p><p>今日已摄入: <strong class="text-orange-600">${state.dailyLog.calories}</strong> ${loc.kcal}</p>`;
        }
        if (dailyLogChart) {
            dailyLogChart.data.datasets[0].data = [state.dailyLog.cost, state.dailyLog.calories];
            dailyLogChart.update();
        }
    }

    function displayRecipes(recipes) {
        recipeCardsContainer.innerHTML = '';
        if (!recipes || recipes.length === 0) {
            recipeCardsContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full">${loc.noResults}</p>`;
            return;
        }
        recipes.forEach(recipe => {
            const cardHTML = `
                <div class="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer" data-recipe-id="${recipe.id}">
                    <img src="${recipe.image}" alt="${recipe.name}" class="w-full h-40 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/600x400/cccccc/FFFFFF?text=Image+Not+Found';">
                    <div class="p-4">
                        <h3 class="font-bold text-lg truncate">${recipe.name}</h3>
                        <div class="flex justify-between text-xs text-gray-500 mt-1">
                            <span>🔥 ${recipe.calories} ${loc.kcal}</span>
                            <span>💰 ¥${recipe.cost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>`;
            recipeCardsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
    
    function openModal(recipe) {
        state.currentRecipeInModal = recipe;
        document.getElementById('modal-image').style.backgroundImage = `url(${recipe.image})`;
        document.getElementById('modal-title').textContent = recipe.name;
        document.getElementById('modal-cooking-time').textContent = `${recipe.cookingTime} ${loc.minutes}`;
        document.getElementById('modal-calories').textContent = `🔥 ${recipe.calories} ${loc.kcal}`;
        document.getElementById('modal-cost').textContent = `💰 ¥${recipe.cost.toFixed(2)}`;
        
        const ingredientsList = document.getElementById('modal-ingredients');
        ingredientsList.innerHTML = '';
        (recipe.ingredients || []).forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ingredientsList.appendChild(li);
        });

        const stepsList = document.getElementById('modal-steps');
        stepsList.innerHTML = '';
        (recipe.steps || []).forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            stepsList.appendChild(li);
        });
        
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

    // --- 6. EVENT LISTENERS & HANDLERS ---
    function setupEventListeners() {
        document.querySelectorAll('.number-input-btn').forEach(button => {
            button.addEventListener('click', () => {
                const input = document.getElementById(button.dataset.input);
                const step = parseInt(button.dataset.step);
                const min = parseInt(input.min);
                let currentValue = parseInt(input.value) || 0;
                let newValue = currentValue + step;
                if (newValue < min) {
                    newValue = min;
                }
                input.value = newValue;
            });
        });

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
                const recipe = state.allFetchedRecipes[recipeId];
                if (recipe) openModal(recipe);
            }
        });

        modalCloseBtn.addEventListener('click', closeModal);
        modalAdoptBtn.addEventListener('click', adoptCurrentRecipe);
        recipeModal.addEventListener('click', (e) => { if (e.target === recipeModal) closeModal(); });
    }

    // --- 7. INITIALIZATION ---
    function initializeApp() {
        loadState();
        initializeChart();
        updateLogUI();
        setupEventListeners();
    }

    initializeApp();
});