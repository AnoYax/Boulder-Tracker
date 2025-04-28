// Constants
const LEVELS = {
    yellow: { name: 'Yellow', color: '#F9D949' },
    green: { name: 'Green', color: '#36AE7C' },
    blue: { name: 'Blue', color: '#5271FF' },
    purple: { name: 'Purple', color: '#9C4DF4' },
    red: { name: 'Red', color: '#EB5353' },
    black: { name: 'Black', color: '#222222' }
};

const OUTCOMES = {
    flash: { name: 'Flash', description: 'Completed first try' },
    within2: { name: 'Within 2 Tries', description: 'Completed in 2 attempts' },
    within5: { name: 'Within 5 Tries', description: 'Completed in 3-5 attempts' },
    failed: { name: 'Failed', description: 'Could not complete' }
};

// State management
let state = {
    points: {
        yellow: 1,
        green: 0,
        blue: 0,
        purple: 0,
        red: 0,
        black: 0
    },
    history: [],
    selectedLevel: null
};

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('boulderState');
    if (savedState) {
        state = JSON.parse(savedState);
    }
    updateUI();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('boulderState', JSON.stringify(state));
}

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// Generate challenge
document.querySelector('.generate-btn').addEventListener('click', () => {
    const totalPoints = Object.values(state.points).reduce((sum, points) => sum + points, 0);
    const random = Math.random() * totalPoints;
    let cumulative = 0;
    
    for (const [level, points] of Object.entries(state.points)) {
        cumulative += points;
        if (random <= cumulative) {
            state.selectedLevel = level;
            break;
        }
    }
    
    const challengeSection = document.querySelector('.challenge-section');
    const currentLevel = document.querySelector('.current-level');
    
    challengeSection.classList.remove('hidden');
    currentLevel.textContent = `${LEVELS[state.selectedLevel].name} Boulder`;
    currentLevel.style.backgroundColor = LEVELS[state.selectedLevel].color;
});

// Record attempt
document.querySelectorAll('.outcome-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!state.selectedLevel) return;
        
        const outcome = btn.classList[1];
        const notes = document.querySelector('.notes-input').value.trim();
        
        // Update points based on outcome
        switch (outcome) {
            case 'flash':
                const nextLevel = getNextLevel(state.selectedLevel);
                if (nextLevel) state.points[nextLevel]++;
                break;
            case 'within2':
                state.points[state.selectedLevel]++;
                const next = getNextLevel(state.selectedLevel);
                if (next) state.points[next]++;
                break;
            case 'within5':
                state.points[state.selectedLevel]++;
                break;
            case 'failed':
                const prevLevel = getPreviousLevel(state.selectedLevel);
                if (prevLevel) state.points[prevLevel]++;
                break;
        }
        
        // Add to history
        state.history.unshift({
            id: Date.now().toString(),
            level: state.selectedLevel,
            outcome,
            date: new Date().toISOString(),
            notes
        });
        
        // Reset challenge
        state.selectedLevel = null;
        document.querySelector('.challenge-section').classList.add('hidden');
        document.querySelector('.notes-input').value = '';
        
        saveState();
        updateUI();
    });
});

// Reset progress
document.querySelector('.reset-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        state = {
            points: { yellow: 1, green: 0, blue: 0, purple: 0, red: 0, black: 0 },
            history: [],
            selectedLevel: null
        };
        saveState();
        updateUI();
    }
});

// Helper functions
function getNextLevel(level) {
    const levels = Object.keys(LEVELS);
    const currentIndex = levels.indexOf(level);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

function getPreviousLevel(level) {
    const levels = Object.keys(LEVELS);
    const currentIndex = levels.indexOf(level);
    return currentIndex > 0 ? levels[currentIndex - 1] : null;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update UI
function updateUI() {
    // Update level cards
    const levelsContainer = document.querySelector('.levels');
    levelsContainer.innerHTML = '';
    
    const totalPoints = Object.values(state.points).reduce((sum, points) => sum + points, 0);
    
    Object.entries(state.points).forEach(([level, points]) => {
        const percentage = totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0;
        levelsContainer.innerHTML += `
            <div class="level-card" data-level="${level}">
                <div class="level-dot"></div>
                <div class="level-info">
                    <h3>${LEVELS[level].name}</h3>
                    <p>${points} points • ${percentage}% chance</p>
                </div>
            </div>
        `;
    });
    
    // Update history
    const historyList = document.querySelector('.history-list');
    historyList.innerHTML = state.history.length === 0 ? 
        '<p>No attempts yet</p>' :
        state.history.map(attempt => `
            <div class="history-item">
                <h3 style="color: ${LEVELS[attempt.level].color}">${LEVELS[attempt.level].name}</h3>
                <p>${OUTCOMES[attempt.outcome].name} - ${formatDate(attempt.date)}</p>
                ${attempt.notes ? `<p class="notes">${attempt.notes}</p>` : ''}
            </div>
        `).join('');
    
    // Update stats using IDs
    const totalAttemptsElem = document.getElementById('total-attempts');
    const successRateElem = document.getElementById('success-rate');
    const flashesElem = document.getElementById('flashes');
    const mostCommonLevelElem = document.getElementById('most-common-level');

    if (totalAttemptsElem) totalAttemptsElem.innerHTML = `
                                                <h3>Total Attempts</h3>
                                                <p class="stat-value">`+state.history.length+`</p>
                                                `;
    if (successRateElem) {
        const successfulAttempts = state.history.filter(a => a.outcome !== 'failed').length;
        const successRate = state.history.length > 0 ? Math.round((successfulAttempts / state.history.length) * 100) : 0;
        successRateElem.innerHTML = `
                        <h3>Success Rate</h3>
                        <p class="stat-value">`+successRate+`%</p>
                        `;
    }
    if (flashesElem) {
        const flashes = state.history.filter(a => a.outcome === 'flash').length;
        flashesElem.innerHTML = `
                        <h3>Flashes</h3>
                        <p class="stat-value">`+flashes+`</p>
                        `;
    }
    if (mostCommonLevelElem && state.history.length > 0) {
        const levelCounts = state.history.reduce((acc, attempt) => {
            acc[attempt.level] = (acc[attempt.level] || 0) + 1;
            return acc;
        }, {});
        const mostCommonLevel = Object.entries(levelCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
        mostCommonLevelElem.innerHTML = `
                        <h3>Most Common Level</h3>
                        <p class="stat-value">`+LEVELS[mostCommonLevel].name+`</p>
                        `;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadState();
});