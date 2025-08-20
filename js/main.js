let budgetPieChart, savingsChart;
let nextCategoryId = 1;

function calculateTaxAdjusted() {
    const annualIncomeInput = document.getElementById('annual-income');
    let annualIncome = parseFloat(annualIncomeInput.value);
    
    // Force valid integer value, default to 0 if invalid
    if (isNaN(annualIncome) || annualIncome < 0) {
        annualIncome = 0;
        annualIncomeInput.value = 0;
    }
    
    // Simple tax estimation (roughly 22% effective tax rate)
    const monthlyTakeHome = (annualIncome * 0.78) / 12;
    document.getElementById('monthly-income').value = monthlyTakeHome.toFixed(0);
    updateCharts();
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
        <input type="text" placeholder="Category Name" value="${name}" />
        <select class="category-type">
            <option value="expense" ${type === CategoryType.EXPENSE ? 'selected' : ''}>Expense</option>
            <option value="savings" ${type === CategoryType.SAVINGS ? 'selected' : ''}>Savings</option>
        </select>
        <button class="delete-btn" onclick="removeCategory(this)">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    categoriesList.appendChild(div);
    
    const input = div.querySelector('input');
    const select = div.querySelector('.category-type');
    input.addEventListener('input', () => {
        updateAllocationCategories();
        updateCharts();
    });
    input.addEventListener('blur', () => {
        updateAllocationCategories();
        updateCharts();
    });
    select.addEventListener('change', updateAllocationCategories);
    select.addEventListener('change', updateCharts);
    
    updateAllocationCategories();
    return categoryId;
}

function removeCategory(btn) {
    btn.parentElement.remove();
    updateAllocationCategories();
    updateCharts();
}

function updateAllocationCategories() {
    const categories = getCategories();
    document.querySelectorAll('.allocation-category').forEach(select => {
        const currentValue = parseInt(select.value);
        select.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
        if (categories.find(cat => cat.id === currentValue)) {
            select.value = currentValue;
        }
    });
}

function addAllocation(name = '', categoryId = -1, amount = 0, frequency = 'monthly') {
    const categories = getCategories();
    const allocationsList = document.getElementById('allocations-list');
    const div = document.createElement('div');
    div.className = 'allocation-item';
    div.innerHTML = `
        <input type="text" placeholder="Name" class="allocation-name" value="${name}" />
        <select class="allocation-category">
            ${categories.map(cat => `<option value="${cat.id}" ${cat.id === categoryId ? 'selected' : ''}>${cat.name}</option>`).join('')}
        </select>
        <input type="number" placeholder="Amount" class="allocation-amount" value="${amount}" />
        <select class="allocation-frequency">
            <option value="monthly" ${frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="annual" ${frequency === 'annual' ? 'selected' : ''}>Annual</option>
            <option value="semi-annual" ${frequency === 'semi-annual' ? 'selected' : ''}>Semi-Annual</option>
            <option value="bimonthly" ${frequency === 'bimonthly' ? 'selected' : ''}>Bi-Monthly</option>
        </select>
        <button class="delete-btn" onclick="removeAllocation(this)">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    allocationsList.appendChild(div);
    
    // Add event listeners for real-time updates
    div.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', updateCharts);
        input.addEventListener('change', updateCharts);
    });
    
    updateCharts();
}

function removeAllocation(btn) {
    btn.parentElement.remove();
    updateCharts();
}

function getAllocationsData() {
    const allocationItems = document.querySelectorAll('.allocation-item');
    const categories = getCategories();
    const categoryMap = Object.fromEntries(categories.map(cat => [cat.id, cat.name]));
    
    const monthlyAllocations = {};
    const annualAllocations = {};
    let totalMonthly = 0;
    
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
        
        const displayCategory = categoryId === -1 ? name : categoryMap[categoryId];
        
        monthlyAllocations[displayCategory] = (monthlyAllocations[displayCategory] || 0) + monthlyAmount;
        annualAllocations[displayCategory] = (annualAllocations[displayCategory] || 0) + annualAmount;
        totalMonthly += monthlyAmount;
    });
    
    return { monthlyAllocations, annualAllocations, totalMonthly };
}

function updateCharts() {
    const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
    const { monthlyAllocations, annualAllocations, totalMonthly } = getAllocationsData();
    
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
    
    const monthlyUnallocatedSavings = monthlyIncome - totalMonthly;
    const totalMonthlySavings = monthlySavingsAllocated + monthlyUnallocatedSavings;
    const totalAnnualSavings = totalMonthlySavings * 12;
    
    // Update summary
    document.getElementById('summary-income').textContent = `$${monthlyIncome.toLocaleString()}`;
    document.getElementById('summary-allocations').textContent = `$${monthlyExpenses.toLocaleString()}`;
    document.getElementById('summary-savings').textContent = `$${monthlySavingsAllocated.toLocaleString()}`;
    document.getElementById('summary-annual-savings').textContent = `$${(monthlySavingsAllocated * 12).toLocaleString()}`;
    document.getElementById('summary-cash-flow').textContent = `$${totalMonthlySavings.toLocaleString()}`;
    document.getElementById('summary-annual-cash-flow').textContent = `$${totalAnnualSavings.toLocaleString()}`;
    
    // Combined Budget Pie Chart
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
    const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
    const monthlySavings = monthlyIncome - Object.values(monthlyAllocations).reduce((sum, val) => sum + val, 0);
    
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
    const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
    const totalMonthlyExpenses = Object.values(monthlyAllocations).reduce((sum, val) => sum + val, 0);
    const totalMonthlySavings = monthlyIncome - totalMonthlyExpenses;
    
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

// Initialize with some default allocations
document.addEventListener('DOMContentLoaded', function() {
    // Set default annual income
    document.getElementById('annual-income').value = 75000;
    calculateTaxAdjusted();

    // Initialize with default categories and allocations
    const housingCategory = addCategory("Housing", CategoryType.EXPENSE);
    const retirementCategory = addCategory("Retirement Savings", CategoryType.SAVINGS);

    addAllocation("Rent", housingCategory, 1500);
    addAllocation("Renter's Insurance", housingCategory, 25);
    addAllocation("Home Insurance", housingCategory, 125);
    addAllocation("Roth IRA", retirementCategory, 500);
    addAllocation("Example Item", -1, 50);
    
    // Add event listener for income changes with validation
    document.getElementById('annual-income').addEventListener('input', function() {
        calculateTaxAdjusted();
    });

    document.getElementById('annual-income').addEventListener('blur', function() {
        calculateTaxAdjusted();
    });
    
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
            // Force a redraw to ensure crisp rendering at new zoom level
            updateCharts();
        }, 150);
    });

    updateCharts();
});
