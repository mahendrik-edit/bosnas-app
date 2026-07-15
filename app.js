// ============================================
// KONFIGURASI
// ============================================
// GANTI DENGAN URL DEPLOY ANDA
const API_URL = 'https://script.google.com/macros/s/AKfycbwk9XxTQUptHTE04LC-QLl9st66Kb9IzH6KzWKfC0D_3zKRVihU0CSJcBmSEwEPe014cA/exec';

// ============================================
// STATE
// ============================================
let currentTab = 'incomeSPJ';
let currentData = [];
let dailyChart = null;
let monthlyChart = null;

// ============================================
// INISIALISASI
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplikasi Bendahara Pro dimulai');
    console.log('📡 API URL:', API_URL);

    testConnection();
    loadDashboard();
    loadAlerts();
    loadProjection();
    loadSummary();
    loadData('income', 'SPJ');
    setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Tab clicks
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;

            if (currentTab === 'rekap') {
                document.getElementById('filterSection').classList.add('hidden');
                document.getElementById('formSection').classList.add('hidden');
                document.querySelector('.table-container').classList.add('hidden');
                document.getElementById('rekapSection').classList.remove('hidden');
                loadRekap();
            } else {
                document.getElementById('filterSection').classList.remove('hidden');
                document.getElementById('formSection').classList.remove('hidden');
                document.querySelector('.table-container').classList.remove('hidden');
                document.getElementById('rekapSection').classList.add('hidden');
                switchTab(currentTab);
            }
        });
    });

    // Form submit
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitTransaction();
    });

    // Edit form submit
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateData();
    });

    // Enter key for filter search
    document.getElementById('filterSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') applyFilters();
    });
}

// ============================================
// TAB FUNCTIONS
// ============================================
function switchTab(tab) {
    const match = tab.match(/(income|expense)(SPJ|Taktis)/);
    if (!match) return;
    
    const [, type, category] = match;

    document.getElementById('formType').value = type;
    document.getElementById('formCategory').value = category;
    document.getElementById('formTitle').innerHTML = 
        `<i class="fas fa-plus-circle"></i> Tambah ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${category}`;
    document.getElementById('tableTitle').innerHTML = 
        `<i class="fas fa-table"></i> Data ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${category}`;

    const tambahanGroup = document.getElementById('keteranganTambahanGroup');
    if (type === 'expense' && category === 'SPJ') {
        tambahanGroup.style.display = 'block';
    } else {
        tambahanGroup.style.display = 'none';
    }

    resetFilters(false);
    loadData(type, category);
}

// ============================================
// DATA FUNCTIONS
// ============================================
function loadData(type, category, params = {}) {
    const urlParams = new URLSearchParams({
        action: 'getData',
        type: type,
        category: category
    });
    if (params.startDate) urlParams.append('startDate', params.startDate);
    if (params.endDate) urlParams.append('endDate', params.endDate);
    if (params.search) urlParams.append('search', params.search);

    const url = `${API_URL}?${urlParams.toString()}`;
    document.getElementById('tableBody').innerHTML = 
        '<tr><td colspan="6" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    currentData = result.data || [];
                    renderTable(currentData);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                console.error('Parse error:', e);
                console.error('Response:', text.substring(0, 200));
                document.getElementById('tableBody').innerHTML = 
                    '<tr><td colspan="6" class="empty-state"><span class="icon">⚠️</span>Error: Periksa URL API</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('tableBody').innerHTML = 
                `<tr><td colspan="6" class="empty-state"><span class="icon">❌</span>Error: ${error.message}</td></tr>`;
        });
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    document.getElementById('tableInfo').textContent = `Menampilkan ${data.length} data`;

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="icon">📭</span>
                    Tidak ada data
                    <div style="font-size:0.85rem;color:var(--gray-400);margin-top:5px;">Silakan tambahkan data baru</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(item.tanggal)}</td>
            <td>${escapeHtml(item.keterangan)}</td>
            <td style="text-align:right;font-weight:600;">Rp ${formatNumber(item.nominal)}</td>
            <td>${escapeHtml(item.keteranganTambahan || '-')}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-warning btn-sm" onclick="openEditModal(${item.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData(${item.id})" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function applyFilters() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const search = document.getElementById('filterSearch').value;
    const sort = document.getElementById('filterSort').value;

    const match = currentTab.match(/(income|expense)(SPJ|Taktis)/);
    if (!match) return;
    const [, type, category] = match;

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (search) params.search = search;

    const urlParams = new URLSearchParams({
        action: 'getFilteredData',
        type: type,
        category: category,
        ...params
    });

    const url = `${API_URL}?${urlParams.toString()}`;
    document.getElementById('tableBody').innerHTML = 
        '<tr><td colspan="6" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    currentData = result.data || [];
                    if (sort) currentData = sortData(currentData, sort);
                    renderTable(currentData);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                alert('Error: ' + e.message);
            }
        })
        .catch(error => alert('Error: ' + error.message));
}

function resetFilters(loadData = true) {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterSort').value = 'tanggal_desc';

    if (loadData) {
        const match = currentTab.match(/(income|expense)(SPJ|Taktis)/);
        if (match) {
            const [, type, category] = match;
            loadData(type, category);
        }
    }
}

function sortData(data, sortType) {
    const sorted = [...data];
    switch (sortType) {
        case 'tanggal_desc':
            return sorted.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        case 'tanggal_asc':
            return sorted.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
        case 'nominal_desc':
            return sorted.sort((a, b) => b.nominal - a.nominal);
        case 'nominal_asc':
            return sorted.sort((a, b) => a.nominal - b.nominal);
        default:
            return sorted;
    }
}

// ============================================
// CRUD FUNCTIONS
// ============================================
function submitTransaction() {
    const type = document.getElementById('formType').value;
    const category = document.getElementById('formCategory').value;
    const tanggal = document.getElementById('tanggal').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;
    const keteranganTambahan = document.getElementById('keteranganTambahan').value;
    const editRowId = document.getElementById('editRowId').value;

    if (!tanggal || !keterangan || !nominal) {
        alert('⚠️ Mohon lengkapi semua field yang wajib (ditandai *)');
        return;
    }

    if (editRowId) {
        updateDataDirect(type, category, editRowId, tanggal, keterangan, nominal, keteranganTambahan);
        return;
    }

    const params = new URLSearchParams({
        action: type === 'income' ? 'addIncome' : 'addExpense',
        category: category,
        tanggal: tanggal,
        keterangan: keterangan,
        nominal: nominal
    });
    if (type === 'expense' && category === 'SPJ') {
        params.append('keteranganTambahan', keteranganTambahan);
    }

    const url = `${API_URL}?${params.toString()}`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    alert('✅ Data berhasil disimpan!');
                    document.getElementById('transactionForm').reset();
                    loadDashboard();
                    loadSummary();
                    const match = currentTab.match(/(income|expense)(SPJ|Taktis)/);
                    if (match) {
                        const [, type, category] = match;
                        loadData(type, category);
                    }
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                alert('❌ Error: ' + e.message);
            }
        })
        .catch(error => alert('❌ Error: ' + error.message));
}

function deleteData(rowId) {
    if (!confirm('⚠️ Yakin ingin menghapus data ini?')) return;

    const match = currentTab.match(/(income|expense)(SPJ|Taktis)/);
    if (!match) return;
    const [, type, category] = match;

    const url = `${API_URL}?action=deleteData&type=${type}&category=${category}&rowId=${rowId}`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    alert('✅ Data berhasil dihapus!');
                    loadDashboard();
                    loadSummary();
                    loadData(type, category);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                alert('❌ Error: ' + e.message);
            }
        })
        .catch(error => alert('❌ Error: ' + error.message));
}

function openEditModal(rowId) {
    const match = currentTab.match(/(income|expense)(SPJ|Taktis)/);
    if (!match) return;
    const [, type, category] = match;

    const item = currentData.find(d => d.id === rowId);
    if (!item) {
        alert('Data tidak ditemukan');
        return;
    }

    document.getElementById('editId').value = rowId;
    document.getElementById('editType').value = type;
    document.getElementById('editCategory').value = category;
    document.getElementById('editTanggal').value = item.tanggal;
    document.getElementById('editKeterangan').value = item.keterangan;
    document.getElementById('editNominal').value = item.nominal;
    document.getElementById('editTambahan').value = item.keteranganTambahan || 'Tunai';

    if (type === 'expense' && category === 'SPJ') {
        document.getElementById('editTambahanGroup').style.display = 'block';
    } else {
        document.getElementById('editTambahanGroup').style.display = 'none';
    }

    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function updateData() {
    const rowId = document.getElementById('editId').value;
    const type = document.getElementById('editType').value;
    const category = document.getElementById('editCategory').value;
    const tanggal = document.getElementById('editTanggal').value;
    const keterangan = document.getElementById('editKeterangan').value;
    const nominal = document.getElementById('editNominal').value;
    const keteranganTambahan = document.getElementById('editTambahan').value;

    updateDataDirect(type, category, rowId, tanggal, keterangan, nominal, keteranganTambahan);
}

function updateDataDirect(type, category, rowId, tanggal, keterangan, nominal, keteranganTambahan) {
    const params = new URLSearchParams({
        action: 'updateData',
        type: type,
        category: category,
        rowId: rowId,
        tanggal: tanggal,
        keterangan: keterangan,
        nominal: nominal
    });
    if (type === 'expense' && category === 'SPJ') {
        params.append('keteranganTambahan', keteranganTambahan);
    }

    const url = `${API_URL}?${params.toString()}`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    alert('✅ Data berhasil diupdate!');
                    closeEditModal();
                    loadDashboard();
                    loadSummary();
                    loadData(type, category);
                    cancelEdit();
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                alert('❌ Error: ' + e.message);
            }
        })
        .catch(error => alert('❌ Error: ' + error.message));
}

function cancelEdit() {
    document.getElementById('editRowId').value = '';
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Simpan';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('transactionForm').reset();
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================
function loadDashboard() {
    const url = `${API_URL}?action=getDashboard`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    const data = result.data;
                    
                    // Main cards
                    document.getElementById('totalIncome').textContent = `Rp ${formatNumber(data.totalPemasukan || 0)}`;
                    document.getElementById('totalExpense').textContent = `Rp ${formatNumber(data.totalPengeluaran || 0)}`;
                    document.getElementById('totalBalance').textContent = `Rp ${formatNumber(data.saldoTotal || 0)}`;
                    document.getElementById('totalTransactions').textContent = `${data.transaksiBulanIni?.length || 0} transaksi bulan ini`;
                    
                    // Trends
                    const trendIncome = document.getElementById('trendIncome');
                    const trendExpense = document.getElementById('trendExpense');
                    trendIncome.textContent = `${data.trendPemasukan >= 0 ? '↑' : '↓'} ${Math.abs(data.trendPemasukan).toFixed(1)}%`;
                    trendIncome.className = `trend ${data.trendPemasukan >= 0 ? 'positive' : 'negative'}`;
                    trendExpense.textContent = `${data.trendPengeluaran >= 0 ? '↑' : '↓'} ${Math.abs(data.trendPengeluaran).toFixed(1)}%`;
                    trendExpense.className = `trend ${data.trendPengeluaran >= 0 ? 'positive' : 'negative'}`;
                    
                    // Alert count
                    const alertCount = document.getElementById('alertCount');
                    fetch(`${API_URL}?action=getAlerts`)
                        .then(res => res.text())
                        .then(t => {
                            try {
                                const a = JSON.parse(t);
                                if (a.success) {
                                    alertCount.textContent = a.data.length;
                                }
                            } catch(e) {}
                        })
                        .catch(() => {});
                    
                    // Charts
                    renderDailyChart(data.dailyData || []);
                    renderMonthlyChart(data.monthlyData || []);
                }
            } catch (e) {
                console.error('Dashboard error:', e);
            }
        })
        .catch(error => console.error('Dashboard error:', error));
}

function renderDailyChart(data) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    
    if (dailyChart) {
        dailyChart.destroy();
    }

    const labels = data.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit' });
    });

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: data.map(d => d.pemasukan),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Pengeluaran',
                    data: data.map(d => d.pengeluaran),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function renderMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }

    const labels = data.map(d => d.label || d.month);

    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: data.map(d => d.pemasukan),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pengeluaran',
                    data: data.map(d => d.pengeluaran),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// SUMMARY FUNCTIONS
// ============================================
function loadSummary() {
    const url = `${API_URL}?action=getSummary`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    const data = result.data;
                    document.getElementById('incomeSPJ').textContent = formatNumber(data.totalPemasukanSPJ || 0);
                    document.getElementById('expenseSPJ').textContent = formatNumber(data.totalPengeluaranSPJ || 0);
                    document.getElementById('saldoSPJ').textContent = formatNumber(data.saldoSPJ || 0);
                    document.getElementById('incomeTaktis').textContent = formatNumber(data.totalPemasukanTaktis || 0);
                    document.getElementById('expenseTaktis').textContent = formatNumber(data.totalPengeluaranTaktis || 0);
                    document.getElementById('saldoTaktis').textContent = formatNumber(data.saldoTaktis || 0);
                }
            } catch (e) {
                console.error('Summary error:', e);
            }
        })
        .catch(error => console.error('Summary error:', error));
}

// ============================================
// ALERTS FUNCTIONS
// ============================================
function loadAlerts() {
    const container = document.getElementById('alertsContainer');
    const url = `${API_URL}?action=getAlerts`;
    
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    const alerts = result.data;
                    if (alerts.length === 0) {
                        container.innerHTML = `
                            <div class="alert-item success">
                                <div class="alert-icon">✅</div>
                                <div class="alert-content">
                                    <div class="alert-title">Semua aman!</div>
                                    <div class="alert-message">Tidak ada peringatan saat ini</div>
                                </div>
                            </div>
                        `;
                    } else {
                        container.innerHTML = alerts.map(alert => `
                            <div class="alert-item ${alert.type}">
                                <div class="alert-icon">${alert.type === 'warning' ? '⚠️' : alert.type === 'success' ? '✅' : 'ℹ️'}</div>
                                <div class="alert-content">
                                    <div class="alert-title">${alert.title}</div>
                                    <div class="alert-message">${alert.message}</div>
                                    ${alert.date ? `<div class="alert-date">${formatDate(alert.date)}</div>` : ''}
                                </div>
                            </div>
                        `).join('');
                    }
                }
            } catch (e) {
                console.error('Alerts error:', e);
                container.innerHTML = '<div class="loading">Error memuat notifikasi</div>';
            }
        })
        .catch(error => {
            console.error('Alerts error:', error);
            container.innerHTML = '<div class="loading">Error memuat notifikasi</div>';
        });
}

// ============================================
// PROJECTION FUNCTIONS
// ============================================
function loadProjection() {
    const container = document.getElementById('projectionContainer');
    const url = `${API_URL}?action=getProjection`;
    
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    const data = result.data;
                    
                    let html = `
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:15px;">
                            <div style="background:var(--gray-50);padding:12px;border-radius:8px;text-align:center;">
                                <div style="font-size:0.8rem;color:var(--gray-500);">Rata-rata Pemasukan</div>
                                <div style="font-size:1.2rem;font-weight:700;color:var(--success);">Rp ${formatNumber(data.avgPemasukan)}</div>
                            </div>
                            <div style="background:var(--gray-50);padding:12px;border-radius:8px;text-align:center;">
                                <div style="font-size:0.8rem;color:var(--gray-500);">Rata-rata Pengeluaran</div>
                                <div style="font-size:1.2rem;font-weight:700;color:var(--danger);">Rp ${formatNumber(data.avgPengeluaran)}</div>
                            </div>
                            <div style="background:var(--gray-50);padding:12px;border-radius:8px;text-align:center;">
                                <div style="font-size:0.8rem;color:var(--gray-500);">Saldo Saat Ini</div>
                                <div style="font-size:1.2rem;font-weight:700;color:var(--info);">Rp ${formatNumber(data.currentSaldo)}</div>
                            </div>
                        </div>
                        <div class="projection-grid">
                    `;
                    
                    data.projection.forEach(p => {
                        html += `
                            <div class="projection-item">
                                <div class="month">${p.bulan}</div>
                                <div class="projection-amount income">Rp ${formatNumber(p.pemasukan)}</div>
                                <div style="font-size:0.8rem;color:var(--gray-400);">Pemasukan</div>
                                <div class="projection-amount expense">Rp ${formatNumber(p.pengeluaran)}</div>
                                <div style="font-size:0.8rem;color:var(--gray-400);">Pengeluaran</div>
                                <div class="projection-amount balance">Rp ${formatNumber(p.saldo)}</div>
                                <div style="font-size:0.8rem;color:var(--gray-400);">Saldo</div>
                            </div>
                        `;
                    });
                    
                    html += `
                        </div>
                        <div class="projection-recommendation">
                            ${data.recommendation}
                        </div>
                    `;
                    
                    container.innerHTML = html;
                }
            } catch (e) {
                console.error('Projection error:', e);
                container.innerHTML = '<div class="loading">Error memuat proyeksi</div>';
            }
        })
        .catch(error => {
            console.error('Projection error:', error);
            container.innerHTML = '<div class="loading">Error memuat proyeksi</div>';
        });
}

// ============================================
// REKAP FUNCTIONS
// ============================================
function loadRekap() {
    const content = document.getElementById('rekapContent');
    content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading rekap...</div>';
    
    const url = `${API_URL}?action=getRekap`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    renderRekap(result.data);
                } else {
                    content.innerHTML = `<div class="empty-state"><span class="icon">❌</span>${result.error || 'Error loading rekap'}</div>`;
                }
            } catch (e) {
                console.error('Rekap error:', e);
                content.innerHTML = `<div class="empty-state"><span class="icon">❌</span>Error: ${e.message}</div>`;
            }
        })
        .catch(error => {
            console.error('Rekap error:', error);
            content.innerHTML = `<div class="empty-state"><span class="icon">❌</span>Error: ${error.message}</div>`;
        });
}

function renderRekap(data) {
    let html = `
        <div class="rekap-summary">
            <div class="rekap-card">
                <div class="label">Total Pemasukan</div>
                <div class="value income">Rp ${formatNumber(data.total.pemasukan || 0)}</div>
            </div>
            <div class="rekap-card">
                <div class="label">Total Pengeluaran</div>
                <div class="value expense">Rp ${formatNumber(data.total.pengeluaran || 0)}</div>
            </div>
            <div class="rekap-card">
                <div class="label">Saldo Akhir</div>
                <div class="value balance">Rp ${formatNumber(data.total.saldo || 0)}</div>
            </div>
        </div>
    `;

    // Per Kategori
    html += `<h4 style="margin:20px 0 15px;color:var(--gray-700);">📊 Rekap per Kategori</h4>`;
    html += `<div class="rekap-summary">`;
    
    ['SPJ', 'Taktis'].forEach(cat => {
        ['Pemasukan', 'Pengeluaran'].forEach(type => {
            const amount = data.perKategori?.[type]?.[cat] || 0;
            const cls = type === 'Pemasukan' ? 'income' : 'expense';
            html += `
                <div class="rekap-card">
                    <div class="label">${type} ${cat}</div>
                    <div class="value ${cls}">Rp ${formatNumber(amount)}</div>
                </div>
            `;
        });
    });
    
    html += `</div>`;

    // Per Bulan
    html += `<h4 style="margin:20px 0 15px;color:var(--gray-700);">📅 Rekap per Bulan</h4>`;
    html += `<div class="rekap-table"><table>
        <thead>
            <tr>
                <th>Bulan</th>
                <th style="text-align:right;">Pemasukan</th>
                <th style="text-align:right;">Pengeluaran</th>
                <th style="text-align:right;">Saldo</th>
                <th>Detail</th>
            </tr>
        </thead>
        <tbody>
    `;

    const months = Object.keys(data.perBulan || {}).sort();
    if (months.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;padding:20px;">Tidak ada data</td></tr>`;
    } else {
        months.forEach(month => {
            const m = data.perBulan[month];
            const saldo = (m.pemasukan || 0) - (m.pengeluaran || 0);
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleString('id-ID', { month: 'long' });
            
            const detail = [];
            if (m.detail?.Pemasukan) {
                Object.keys(m.detail.Pemasukan).forEach(cat => {
                    detail.push(`Pemasukan ${cat}: Rp ${formatNumber(m.detail.Pemasukan[cat])}`);
                });
            }
            if (m.detail?.Pengeluaran) {
                Object.keys(m.detail.Pengeluaran).forEach(cat => {
                    detail.push(`Pengeluaran ${cat}: Rp ${formatNumber(m.detail.Pengeluaran[cat])}`);
                });
            }
            
            html += `
                <tr>
                    <td><strong>${monthName} ${year}</strong></td>
                    <td style="text-align:right;color:var(--success);">Rp ${formatNumber(m.pemasukan || 0)}</td>
                    <td style="text-align:right;color:var(--danger);">Rp ${formatNumber(m.pengeluaran || 0)}</td>
                    <td style="text-align:right;color:${saldo >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:700;">
                        Rp ${formatNumber(saldo)}
                    </td>
                    <td style="font-size:0.85rem;">${detail.join('<br>') || '-'}</td>
                </tr>
            `;
        });
    }
    
    html += `</tbody></table></div>`;
    document.getElementById('rekapContent').innerHTML = html;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================
function exportData() {
    if (!currentData || currentData.length === 0) {
        alert('Tidak ada data untuk diexport');
        return;
    }

    let csv = 'No,Tanggal,Keterangan,Nominal,Jenis Pembayaran\n';
    currentData.forEach((item, index) => {
        csv += `${index + 1},${formatDate(item.tanggal)},"${item.keterangan || ''}",${item.nominal || 0},"${item.keteranganTambahan || '-'}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_${currentTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ============================================
// CONNECTION TEST
// ============================================
function testConnection() {
    const status = document.getElementById('connectionStatus');
    status.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
    status.className = 'checking';

    fetch(`${API_URL}?action=getSummary`)
        .then(response => response.text())
        .then(text => {
            try {
                JSON.parse(text);
                status.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
                status.className = 'connected';
            } catch (e) {
                status.innerHTML = '<i class="fas fa-exclamation-circle"></i> API Error';
                status.className = 'error';
                status.title = text.substring(0, 100);
                console.error('API Error:', text.substring(0, 200));
            }
        })
        .catch(error => {
            status.innerHTML = '<i class="fas fa-times-circle"></i> Connection Error';
            status.className = 'error';
            status.title = error.message;
            console.error('Connection Error:', error);
        });
}

// Auto check every 30 seconds
setInterval(testConnection, 30000);

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
};

console.log('✅ Aplikasi Bendahara Pro siap digunakan!');
console.log('📌 Tips: Ganti API_URL dengan URL deploy Anda');
