let monthlyPieChart, annualPieChart, savingsChart;
let allocations = [];

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
        <button class="delete-btn" onclick="removeCategory(this)">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    categoriesList.appendChild(div);
    
    // Add event listener to update dropdowns when category name changes
    const input = div.querySelector('input');
    input.addEventListener('input', updateAllocationCategories);
    input.addEventListener('blur', updateAllocationCategories);
    
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
        
        // Check if it's retirement savings
        if (name.toLowerCase().includes('retirement') || category.toLowerCase().includes('retirement')) {
            retirementSavings += annualAmount;
        }
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
    
    // Monthly Pie Chart
    const monthlyData = { ...monthlyAllocations };
    if (monthlySavings > 0) {
        monthlyData['Remaining'] = monthlySavings;
    }
    
    updatePieChart('monthly-pie-chart', monthlyData, 'monthlyPieChart');
    updatePieChart('annual-pie-chart', annualAllocations, 'annualPieChart');
    updateSavingsChart(monthlySavings, retirementSavings);
}

function updatePieChart(canvasId, data, chartVar) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (window[chartVar]) {
        window[chartVar].destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = generateColors(labels.length);
    
    window[chartVar] = new Chart(ctx, {
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
                }
            }
        }
    });
}

function updateSavingsChart(monthlySavings, retirementSavings) {
    const ctx = document.getElementById('savings-chart').getContext('2d');
    
    if (savingsChart) {
        savingsChart.destroy();
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cumulativePersonalSavings = [];
    const cumulativeRetirementSavings = [];
    
    for (let i = 1; i <= 12; i++) {
        cumulativePersonalSavings.push(monthlySavings * i);
        cumulativeRetirementSavings.push((retirementSavings / 12) * i);
    }
    
    savingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Unallocated Savings',
                data: cumulativePersonalSavings,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }, {
                label: 'Retirement Savings',
                data: cumulativeRetirementSavings,
                borderColor: '#38b2ac',
                backgroundColor: 'rgba(56, 178, 172, 0.1)',
                tension: 0.4
            }]
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
