let monthlyTakeHome, budgetPieChart, savingsChart;
let nextCategoryId = 1;

function calculateTaxAdjusted() {
    const annualIncomeInput = document.getElementById('annual-gross-income');
    const additionalTaxRateInput = document.getElementById('additional-tax-rate');
    let annualIncome = parseFloat(annualIncomeInput.value);
    let additionalTaxRate = parseFloat(additionalTaxRateInput.value) || 0;
    
    if (isNaN(annualIncome) || annualIncome < 0) {
        annualIncome = 0;
        annualIncomeInput.value = 0;
    }
    
    // 2025 tax brackets and standard deduction (single filer)
    const standardDeduction = 15000;
    const taxBrackets = [
        { min: 0, max: 11925, rate: 0.10 },
        { min: 11925, max: 48475, rate: 0.12 },
        { min: 48475, max: 103350, rate: 0.22 },
        { min: 103350, max: 197300, rate: 0.24 },
        { min: 197300, max: 250525, rate: 0.32 },
        { min: 250525, max: 626350, rate: 0.35 },
        { min: 626350, max: Infinity, rate: 0.37 }
    ];
    
    // Calculate federal income tax
    const taxableIncome = Math.max(0, annualIncome - standardDeduction);
    let federalTax = 0;
    
    for (const bracket of taxBrackets) {
        if (taxableIncome > bracket.min) {
            const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
            federalTax += taxableInBracket * bracket.rate;
        }
    }
    
    // Payroll taxes (Social Security + Medicare)
    const socialSecurityTax = Math.min(annualIncome * 0.062, 168600 * 0.062);
    const medicareTax = annualIncome * 0.0145;
    
    // Additional tax (state/local) applied to taxable income
    const additionalTax = taxableIncome * (additionalTaxRate / 100);
    
    const totalTax = federalTax + socialSecurityTax + medicareTax + additionalTax;
    monthlyTakeHome = (annualIncome - totalTax) / 12;
    
    updateSummary();
}

const CategoryType = {
    EXPENSE: 'expense',
    SAVINGS: 'savings'
};

function getNextCategoryId() {
    return nextCategoryId++;
}

function getCategories() {
    const categoryItems = document.querySelectorAll('#categories-list .category-item');
    const categories = [{ id: -1, name: 'n/a' }];
    
    categoryItems.forEach(item => {
        const input = item.querySelector('input[type="text"]');
        const name = input.value.trim();
        if (name) {
            let categoryId = item.dataset.categoryId;
            if (!categoryId) {
                categoryId = getNextCategoryId();
                item.dataset.categoryId = categoryId;
            }
            categories.push({ id: parseInt(categoryId), name: name });
        }
    });
    
    return categories;
}

function addCategory(name = '', type = CategoryType.EXPENSE) {
    const categoriesList = document.getElementById('categories-list');
    const div = document.createElement('div');
    const categoryId = getNextCategoryId();
    div.className = 'category-item';
    div.dataset.categoryId = categoryId;
    div.innerHTML = `
        <div class="drag-handle"></div>
        <input type="text" placeholder="Category Name" value="${name}" />
        <select class="category-type">
            <option value="expense" ${type === CategoryType.EXPENSE ? 'selected' : ''}>Expense</option>
            <option value="savings" ${type === CategoryType.SAVINGS ? 'selected' : ''}>Savings</option>
        </select>
        <span class="category-type-display">${type === CategoryType.SAVINGS ? 'Savings' : 'Expense'}</span>
        <button class="delete-btn" onclick="removeCategory(this)">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    categoriesList.appendChild(div);
    
    const input = div.querySelector('input');
    const select = div.querySelector('.category-type');
    const display = div.querySelector('.category-type-display');
    
    input.addEventListener('input', () => {
        updateAllocationCategories();
        updateSummary();
        autoSave();
    });
    select.addEventListener('change', () => {
        display.textContent = select.value === 'savings' ? 'Savings' : 'Expense';
        updateAllocationCategories();
        updateSummary();
        autoSave();
    });
    
    updateAllocationCategories();
    return categoryId;
}

function removeCategory(btn) {
    btn.parentElement.remove();
    updateAllocationCategories();
    updateSummary();
    autoSave();
}

function updateAllocationCategories() {
    const categories = getCategories();
    document.querySelectorAll('.allocation-category').forEach(select => {
        const currentValue = parseInt(select.value);
        const display = select.parentElement.querySelector('.allocation-category-display');
        
        select.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
        
        if (categories.find(cat => cat.id === currentValue)) {
            select.value = currentValue;
            const selectedCategory = categories.find(cat => cat.id === currentValue);
            if (display && selectedCategory) {
                display.textContent = selectedCategory.name;
            }
        }
    });
}

function addAllocation(name = '', categoryId = -1, amount = 0, frequency = 'monthly') {
    const categories = getCategories();
    const allocationsList = document.getElementById('allocations-list');
    const div = document.createElement('div');
    div.className = 'allocation-item';
    div.innerHTML = `
        <div class="drag-handle"></div>
        <input type="text" placeholder="Name" class="allocation-name" value="${name}" />
        <select class="allocation-category">
            ${categories.map(cat => `<option value="${cat.id}" ${cat.id === categoryId ? 'selected' : ''}>${cat.name}</option>`).join('')}
        </select>
        <span class="allocation-category-display">${categories.find(cat => cat.id === categoryId)?.name || 'n/a'}</span>
        <input type="number" placeholder="Amount" class="allocation-amount" value="${amount}" />
        <select class="allocation-frequency">
            <option value="monthly" ${frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="annual" ${frequency === 'annual' ? 'selected' : ''}>Annual</option>
            <option value="semi-annual" ${frequency === 'semi-annual' ? 'selected' : ''}>Semi-Annual</option>
            <option value="bimonthly" ${frequency === 'bimonthly' ? 'selected' : ''}>Bi-Monthly</option>
        </select>
        <span class="allocation-frequency-display">${frequency.charAt(0).toUpperCase() + frequency.slice(1)}</span>
        <button class="delete-btn" onclick="removeAllocation(this)">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    allocationsList.appendChild(div);
    
    // Add event listeners for real-time updates
    div.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', updateSummary);
        input.addEventListener('change', updateSummary);
    });
    
    // Add specific listeners to update display spans
    const categorySelect = div.querySelector('.allocation-category');
    const frequencySelect = div.querySelector('.allocation-frequency');
    const categoryDisplay = div.querySelector('.allocation-category-display');
    const frequencyDisplay = div.querySelector('.allocation-frequency-display');
    
    
    // Add event listeners for real-time updates
    div.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => {
            updateSummary();
            autoSave();
        });
        input.addEventListener('change', () => {
            updateSummary();
            autoSave();
        });
    });
    categorySelect.addEventListener('change', () => {
        const categories = getCategories();
        const selectedCategory = categories.find(cat => cat.id === parseInt(categorySelect.value));
        categoryDisplay.textContent = selectedCategory ? selectedCategory.name : 'n/a';
    });
    
    frequencySelect.addEventListener('change', () => {
        frequencyDisplay.textContent = frequencySelect.value.charAt(0).toUpperCase() + frequencySelect.value.slice(1);
    });
    
    updateSummary();
}

function removeAllocation(btn) {
    btn.parentElement.remove();
    updateSummary();
    autoSave();
}

function getAllocationsData() {
    const allocationItems = document.querySelectorAll('.allocation-item');
    const categories = getCategories();
    const categoryMap = Object.fromEntries(categories.map(cat => [cat.id, cat.name]));
    
    const monthlyAllocations = {};
    const annualAllocations = {};
    let totalMonthly = 0;
    let monthlySetaside = 0;
    
    allocationItems.forEach(item => {
        const name = item.querySelector('.allocation-name').value || 'Unnamed';
        const categoryId = parseInt(item.querySelector('.allocation-category').value);
        const amount = parseFloat(item.querySelector('.allocation-amount').value) || 0;
        const frequency = item.querySelector('.allocation-frequency').value;
        
        let monthlyAmount = 0;
        let annualAmount = 0;
        
        switch(frequency) {
            case 'monthly':
                monthlyAmount = amount;
                annualAmount = amount * 12;
                break;
            case 'annual':
                monthlyAmount = amount / 12;
                annualAmount = amount;
                break;
            case 'semi-annual':
                monthlyAmount = amount / 6;
                annualAmount = amount * 2;
                break;
            case 'bimonthly':
                monthlyAmount = amount / 2;
                annualAmount = amount * 6;
                break;
        }

        // Calculate setaside amount (non-monthly expenses converted to monthly)
        if (frequency !== 'monthly') {
            monthlySetaside += monthlyAmount;
        }
        
        const displayCategory = categoryId === -1 ? name : categoryMap[categoryId];
        
        monthlyAllocations[displayCategory] = (monthlyAllocations[displayCategory] || 0) + monthlyAmount;
        annualAllocations[displayCategory] = (annualAllocations[displayCategory] || 0) + annualAmount;
        totalMonthly += monthlyAmount;
    });
    
    return { monthlyAllocations, annualAllocations, totalMonthly, monthlySetaside };
}

function getAnnualGrossIncome() {
    return parseFloat(document.getElementById('annual-gross-income').value) || 0;
}

function getMonthlyGrossIncome() {
    const annualIncome = getAnnualGrossIncome();
    return annualIncome / 12;
}

function updateSummary() {
    const annualGrossIncome = getAnnualGrossIncome();
    const monthlyGrossIncome = getMonthlyGrossIncome();

    const { monthlyAllocations, annualAllocations, totalMonthly, monthlySetaside } = getAllocationsData();
    
    // Calculate expenses vs savings
    const savingsCategories = getSavingsCategories();
    let monthlyExpenses = 0;
    let monthlySavingsAllocated = 0;
    
    Object.entries(monthlyAllocations).forEach(([category, amount]) => {
        if (savingsCategories.includes(category)) {
            monthlySavingsAllocated += amount;
        } else {
            monthlyExpenses += amount;
        }
    });
    let annualExpenses = monthlyExpenses * 12;
    
    const monthlyUnallocatedSavings = monthlyTakeHome - totalMonthly;
    const totalMonthlySavings = monthlySavingsAllocated + monthlyUnallocatedSavings;
    const totalAnnualSavings = totalMonthlySavings * 12;
    
    // Update summary
    document.getElementById('summary-annual-gross').textContent = `$${annualGrossIncome.toFixed(2)}`;
    document.getElementById('summary-monthly-gross').textContent = `$${monthlyGrossIncome.toFixed(2)}`;
    document.getElementById('summary-income').textContent = `$${monthlyTakeHome.toFixed(2)}`;
    document.getElementById('summary-annual-expenses').textContent = `$${annualExpenses.toFixed(2)}`;
    document.getElementById('summary-expenses').textContent = `$${monthlyExpenses.toFixed(2)}`;
    document.getElementById('summary-setaside').textContent = `$${monthlySetaside.toFixed(2)}`;
    document.getElementById('summary-annual-savings').textContent = `$${(monthlySavingsAllocated * 12).toFixed(2)}`;
    document.getElementById('summary-savings').textContent = `$${monthlySavingsAllocated.toFixed(2)}`;
    document.getElementById('summary-annual-cash-flow').textContent = `$${totalAnnualSavings.toFixed(2)}`;
    document.getElementById('summary-cash-flow').textContent = `$${totalMonthlySavings.toFixed(2)}`;
    
    const budgetData = { ...monthlyAllocations };
    if (monthlyUnallocatedSavings > 0) {
        budgetData['Remaining'] = monthlyUnallocatedSavings;
    }
    
    updateBudgetPieChart(budgetData);
    updateSavingsChart(monthlyUnallocatedSavings);
}

function updateBudgetPieChart(data) {
    const ctx = document.getElementById('budget-pie-chart').getContext('2d');
    
    if (budgetPieChart) {
        budgetPieChart.destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = generateColors(labels.length);
    const total = values.reduce((sum, val) => sum + val, 0);
    
    // Get both monthly and annual data for tooltips
    const { monthlyAllocations, annualAllocations } = getAllocationsData();
    const monthlySavings = monthlyTakeHome - Object.values(monthlyAllocations).reduce((sum, val) => sum + val, 0);
    
    budgetPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(1);
                            
                            let monthlyAmount, annualAmount;
                            
                            if (label === 'Remaining') {
                                monthlyAmount = monthlySavings;
                                annualAmount = monthlySavings * 12;
                            } else {
                                monthlyAmount = monthlyAllocations[label] || 0;
                                annualAmount = annualAllocations[label] || 0;
                            }
                            
                            return [
                                `${label}: ${percentage}%`,
                                `Monthly: $${monthlyAmount.toLocaleString()}`,
                                `Annual: $${annualAmount.toLocaleString()}`
                            ];
                        }
                    }
                },
                datalabels: {
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value, context) {
                        const percentage = ((value / total) * 100);
                        return percentage > 5 ? Math.round(percentage) + '%' : '';
                    }
                }
            }
        },
        plugins: [{
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const percentage = ((dataset.data[index] / total) * 100);
                        if (percentage > 5) {
                            const {x, y} = element.tooltipPosition();
                            ctx.fillStyle = '#000';
                            ctx.font = 'bold 14px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(Math.round(percentage) + '%', x, y);
                        }
                    });
                });
            }
        }]
    });
}

function updateSavingsChart(monthlySavings, retirementSavings) {
    const ctx = document.getElementById('savings-chart').getContext('2d');
    
    if (savingsChart) {
        savingsChart.destroy();
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get all savings categories
    const { monthlyAllocations, annualAllocations } = getAllocationsData();
    const savingsCategories = getSavingsCategories();
    
    const datasets = [];
    const colors = ['#667eea', '#38b2ac', '#f093fb', '#4facfe', '#43e97b', '#ffecd2'];
    let colorIndex = 0;
    
    // Calculate total monthly savings (including negative if going into debt)
    const totalMonthlyExpenses = Object.values(monthlyAllocations).reduce((sum, val) => sum + val, 0);
    const totalMonthlySavings = monthlyTakeHome - totalMonthlyExpenses;
    
    // Add total savings line (can go negative)
    const cumulativeTotalSavings = [];
    for (let i = 1; i <= 12; i++) {
        cumulativeTotalSavings.push(totalMonthlySavings * i);
    }
    
    datasets.push({
        label: 'Net Cash Flow',
        data: cumulativeTotalSavings,
        borderColor: '#2d3748',
        backgroundColor: '#2d374820',
        borderWidth: 3,
        tension: 0.4
    });
    
    // Add unallocated savings only if positive
    if (monthlySavings > 0) {
        const cumulativeUnallocated = [];
        for (let i = 1; i <= 12; i++) {
            cumulativeUnallocated.push(monthlySavings * i);
        }
        
        datasets.push({
            label: 'Unallocated Savings',
            data: cumulativeUnallocated,
            borderColor: colors[colorIndex],
            backgroundColor: colors[colorIndex] + '20',
            tension: 0.4
        });
        colorIndex++;
    }
    
    // Add each savings category
    savingsCategories.forEach(category => {
        const monthlyAmount = monthlyAllocations[category] || 0;
        if (monthlyAmount > 0) {
            const cumulativeSavings = [];
            for (let i = 1; i <= 12; i++) {
                cumulativeSavings.push(monthlyAmount * i);
            }
            
            datasets.push({
                label: category,
                data: cumulativeSavings,
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: colors[colorIndex % colors.length] + '20',
                tension: 0.4
            });
            colorIndex++;
        }
    });
    
    savingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function getSavingsCategories() {
    const categoryItems = document.querySelectorAll('.category-item');
    const savingsCategories = [];
    
    categoryItems.forEach(item => {
        const name = item.querySelector('input[type="text"]').value.trim();
        const type = item.querySelector('.category-type').value;
        
        if (name && type === 'savings') {
            savingsCategories.push(name);
        }
    });
    
    return savingsCategories;
}

function generateColors(count) {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

let lastAutoSaveTime = Date.now();

function updateAutoSaveStatus() {
    const now = Date.now();
    const diff = now - lastAutoSaveTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    const statusElement = document.getElementById('auto-save-status');
    if (!statusElement) return;
    
    if (diff < 60000) {
        statusElement.textContent = "Auto-saved a moment ago...";
    } else if (minutes < 60) {
        statusElement.textContent = `Auto-saved ${minutes} minute${minutes === 1 ? '' : 's'} ago...`;
    } else if (hours < 24) {
        statusElement.textContent = `Auto-saved ${hours} hour${hours === 1 ? '' : 's'} ago...`;
    } else {
        statusElement.textContent = `Auto-saved ${days} day${days === 1 ? '' : 's'} ago...`;
    }
}

// Auto-save functionality
function autoSave() {
    const data = getCurrentBudgetData(); // You'll need to extract this from exportData()
    localStorage.setItem('monthlyBudgetPlanner_autoSave', JSON.stringify(data));
    lastAutoSaveTime = Date.now();
    localStorage.setItem('monthlyBudgetPlanner_lastSave', lastAutoSaveTime.toString());
    updateAutoSaveStatus();
}

function getCurrentBudgetData() {
    // Extract the data creation logic from exportData()
    const data = {
        income: {
            annualGrossIncome: parseFloat(document.getElementById('annual-gross-income').value) || 0,
            additionalTaxRate: parseFloat(document.getElementById('additional-tax-rate').value) || 0
        },
        categories: [],
        allocations: []
    };
    
    const categoryItems = document.querySelectorAll('#categories-list .category-item');
    categoryItems.forEach(item => {
        const name = item.querySelector('input[type="text"]').value.trim();
        const type = item.querySelector('.category-type').value;
        if (name) {
            data.categories.push({ name, type });
        }
    });
    
    const allocationItems = document.querySelectorAll('#allocations-list .allocation-item');
    allocationItems.forEach(item => {
        const name = item.querySelector('.allocation-name').value.trim();
        const categoryId = parseInt(item.querySelector('.allocation-category').value);
        const amount = parseFloat(item.querySelector('.allocation-amount').value) || 0;
        const frequency = item.querySelector('.allocation-frequency').value;
        
        let categoryName = 'n/a';
        if (categoryId !== -1) {
            const categories = getCategories();
            const category = categories.find(cat => cat.id === categoryId);
            if (category) {
                categoryName = category.name;
            }
        }
        
        if (name || amount > 0) {
            data.allocations.push({ name, category: categoryName, amount, frequency });
        }
    });
    
    return data;
}

function autoLoad() {
    const savedData = localStorage.getItem('budgetPlannerData');
    if (savedData) {
        try {
            console.info('Loading auto-saved data');
            const data = JSON.parse(savedData);
            loadData(data);
            return true;
        } catch (error) {
            console.error('Error loading auto-saved data:', error);
            localStorage.removeItem('budgetPlannerData');
        }
    }
    return false;
}

function resetToDefaults() {
    if (confirm('This will reset all your data to the default budget. Are you sure?')) {
        localStorage.removeItem('monthlyBudgetPlanner_autoSave');
        localStorage.removeItem('monthlyBudgetPlanner_lastSave');
        location.reload();
    }
}

function exportData() {
    const data = {
        income: {
            annualGrossIncome: parseFloat(document.getElementById('annual-gross-income').value) || 0,
            additionalTaxRate: parseFloat(document.getElementById('additional-tax-rate').value) || 0
        },
        categories: [],
        allocations: []
    };
    
    // Export categories
    const categoryItems = document.querySelectorAll('#categories-list .category-item');
    categoryItems.forEach(item => {
        const name = item.querySelector('input[type="text"]').value.trim();
        const type = item.querySelector('.category-type').value;
        if (name) {
            data.categories.push({ name, type });
        }
    });
    
    // Export allocations
    const allocationItems = document.querySelectorAll('#allocations-list .allocation-item');
    allocationItems.forEach(item => {
        const name = item.querySelector('.allocation-name').value.trim();
        const categoryId = parseInt(item.querySelector('.allocation-category').value);
        const amount = parseFloat(item.querySelector('.allocation-amount').value) || 0;
        const frequency = item.querySelector('.allocation-frequency').value;
        
        // Find category name
        let categoryName = 'n/a';
        if (categoryId !== -1) {
            const categories = getCategories();
            const category = categories.find(cat => cat.id === categoryId);
            if (category) {
                categoryName = category.name;
            }
        }
        
        if (name || amount > 0) {
            data.allocations.push({ name, category: categoryName, amount, frequency });
        }
    });
    
    // Create and download file
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Create timestamped filename
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric'
    }).replace(/\//g, '-');
    const time = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/:/g, '-');
    
    const filename = `budget_plan_${date}_${time}.json`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(link.href);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                loadData(data);
            } catch (error) {
                alert('Error reading file. Please make sure it\'s a valid JSON file.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function loadData(data) {
    // Clear existing data
    document.getElementById('categories-list').innerHTML = '';
    document.getElementById('allocations-list').innerHTML = '';
    nextCategoryId = 1;
    
    // Load income
    if (data.income) {
        document.getElementById('annual-gross-income').value = data.income.annualGrossIncome || 0;
        document.getElementById('additional-tax-rate').value = data.income.additionalTaxRate || 0;
        calculateTaxAdjusted();
    }
    
    // Load categories and create a mapping
    const categoryMapping = { 'n/a': -1 };
    if (data.categories) {
        data.categories.forEach(category => {
            const categoryId = addCategory(category.name, category.type);
            categoryMapping[category.name] = categoryId;
        });
    }
    
    // Load allocations
    if (data.allocations) {
        data.allocations.forEach(allocation => {
            const categoryId = categoryMapping[allocation.category] || -1;
            addAllocation(
                allocation.name || '',
                categoryId,
                allocation.amount || 0,
                allocation.frequency || 'monthly'
            );
        });
    }
    
    updateSummary();
    autoSave();
}

// Initialize with some default allocations
document.addEventListener('DOMContentLoaded', function() {
    // Try to load auto-saved data first
    const autoSaved = localStorage.getItem('monthlyBudgetPlanner_autoSave');
    const lastSaveTime = localStorage.getItem('monthlyBudgetPlanner_lastSave');
    
    if (lastSaveTime) {
        lastAutoSaveTime = parseInt(lastSaveTime);
    }
    
    if (autoSaved) {
        try {
            const data = JSON.parse(autoSaved);
            loadData(data);
        } catch (error) {
            console.error('Failed to load auto-saved data:', error);
            // Fall back to defaults
            initializeDefaults();
        }
    } else {
        initializeDefaults();
    }
    
    // Set up auto-save on changes
    const autoSaveDebounced = debounce(autoSave, 1000);
    
    // Add auto-save listeners
    document.addEventListener('input', autoSaveDebounced);
    document.addEventListener('change', autoSaveDebounced);
    
    // Update auto-save status every 30 seconds
    updateAutoSaveStatus();
    setInterval(updateAutoSaveStatus, 30000);
    
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (budgetPieChart) {
                budgetPieChart.resize();
            }
            if (savingsChart) {
                savingsChart.resize();
            }
            updateSummary();
        }, 150);
    });

    updateSummary();

    // Initialize drag and drop
    new Sortable(document.getElementById('categories-list'), {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen'
    });

    new Sortable(document.getElementById('allocations-list'), {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen'
    });
});

function initializeDefaults() {
    document.getElementById('annual-gross-income').value = 75000;
    document.getElementById('additional-tax-rate').value = 0;
    calculateTaxAdjusted();

    const housingCategory = addCategory("Housing", CategoryType.EXPENSE);
    const retirementCategory = addCategory("Retirement Savings", CategoryType.SAVINGS);

    addAllocation("Rent", housingCategory, 1500);
    addAllocation("Renter's Insurance", housingCategory, 25);
    addAllocation("Home Insurance", housingCategory, 125);
    addAllocation("Roth IRA", retirementCategory, 500);
    addAllocation("Example Item", -1, 50);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
