let budgetPieChart, savingsChart;

function calculateTaxAdjusted() {
    const annualIncome = parseFloat(document.getElementById('annual-income').value) || 0;
    // Simple tax estimation (roughly 22% effective tax rate)
    const monthlyTakeHome = (annualIncome * 0.78) / 12;
    document.getElementById('monthly-income').value = monthlyTakeHome.toFixed(0);
    updateCharts();
}

function getCategories() {
    const categoryInputs = document.querySelectorAll('#categories-list input[type="text"]');
    const categories = ['n/a'];
    categoryInputs.forEach(input => {
        if (input.value.trim()) {
            categories.push(input.value.trim());
        }
    });
    return categories;
}

function addCategory() {
    const categoriesList = document.getElementById('categories-list');
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
        <input type="text" placeholder="New Category" />
        <select class="category-type">
            <option value="expense">Expense</option>
            <option value="savings">Savings</option>
        </select>
        <button class="delete-btn" onclick="removeCategory(this)">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    categoriesList.appendChild(div);
    
    const input = div.querySelector('input');
    const select = div.querySelector('.category-type');
    input.addEventListener('input', updateAllocationCategories);
    input.addEventListener('blur', updateAllocationCategories);
    select.addEventListener('change', updateAllocationCategories);
    
    updateAllocationCategories();
}

function removeCategory(btn) {
    btn.parentElement.remove();
    updateAllocationCategories();
    updateCharts();
}

function updateAllocationCategories() {
    const categories = getCategories();
    document.querySelectorAll('.allocation-category').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
        if (categories.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

function addAllocation() {
    const categories = getCategories();
    const allocationsList = document.getElementById('allocations-list');
    const div = document.createElement('div');
    div.className = 'allocation-item';
    div.innerHTML = `
        <input type="text" placeholder="Name" class="allocation-name" />
        <select class="allocation-category">
            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>
        <input type="number" placeholder="Amount" class="allocation-amount" />
        <select class="allocation-frequency">
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="semi-annual">Semi-Annual</option>
            <option value="bimonthly">Bi-Monthly</option>
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
}

function removeAllocation(btn) {
    btn.parentElement.remove();
    updateCharts();
}

function getAllocationsData() {
    const allocationItems = document.querySelectorAll('.allocation-item');
    const monthlyAllocations = {};
    const annualAllocations = {};
    let totalMonthly = 0;
    let retirementSavings = 0;
    
    allocationItems.forEach(item => {
        const name = item.querySelector('.allocation-name').value || 'Unnamed';
        const category = item.querySelector('.allocation-category').value;
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
        
        const displayCategory = category === 'n/a' ? name : category;
        
        monthlyAllocations[displayCategory] = (monthlyAllocations[displayCategory] || 0) + monthlyAmount;
        annualAllocations[displayCategory] = (annualAllocations[displayCategory] || 0) + annualAmount;
        totalMonthly += monthlyAmount;
    });
    
    return { monthlyAllocations, annualAllocations, totalMonthly, retirementSavings };
}

function updateCharts() {
    const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
    const { monthlyAllocations, annualAllocations, totalMonthly, retirementSavings } = getAllocationsData();
    const monthlySavings = monthlyIncome - totalMonthly;
    const annualSavings = monthlySavings * 12;
    
    // Update summary
    document.getElementById('summary-income').textContent = `$${monthlyIncome.toLocaleString()}`;
    document.getElementById('summary-allocations').textContent = `$${totalMonthly.toLocaleString()}`;
    document.getElementById('summary-savings').textContent = `$${monthlySavings.toLocaleString()}`;
    document.getElementById('summary-annual-savings').textContent = `$${annualSavings.toLocaleString()}`;
    
    // Combined Budget Pie Chart
    const budgetData = { ...monthlyAllocations };
    if (monthlySavings > 0) {
        budgetData['Remaining'] = monthlySavings;
    }
    
    updateBudgetPieChart(budgetData);
    updateSavingsChart(monthlySavings, retirementSavings);
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
    
    // Add unallocated savings
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
                    beginAtZero: true,
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
    addAllocation();
    addAllocation();
    
    // Add event listener for income changes
    document.getElementById('annual-income').addEventListener('input', function() {
        if (this.value) {
            calculateTaxAdjusted();
        }
    });
    
    document.getElementById('monthly-income').addEventListener('input', updateCharts);
    
    updateCharts();
});
