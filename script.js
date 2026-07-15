// ============================================
// SCRIPT.JS - LOGIKA UTAMA
// ============================================

let allData = [];
let chartInstance = null;
let currentPage = 1;
const rowsPerPage = 20;

// ============================================
// LOAD DATA
// ============================================

async function loadData() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading">⏳ Loading data...</td></tr>';
    
    try {
        // Ambil semua data
        const response = await fetch(`${CONFIG.webAppUrl}?action=all`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Gagal memuat data');
        }
        
        allData = result.data || [];
        
        // Load bulan dropdown
        loadBulanDropdown();
        
        // Update UI
        updateSummary();
        updateTable();
        updateChart();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `
            <tr><td colspan="9" style="color:red;text-align:center;padding:20px;">
                ❌ ${error.message}
            </td></tr>
        `;
    }
}

// ============================================
// LOAD BULAN DROPDOWN
// ============================================

async function loadBulanDropdown() {
    try {
        const response = await fetch(`${CONFIG.webAppUrl}?action=bulan`);
        const result = await response.json();
        
        if (result.success) {
            const select = document.getElementById('filterBulan');
            result.data.forEach(bulan => {
                const option = document.createElement('option');
                option.value = bulan;
                option.textContent = bulan;
                select.appendChild(option);
            });
        }
    } catch (error) {
        // Fallback: gunakan bulan dari data
        const bulanSet = new Set(allData.map(d => d.bulan));
        const select = document.getElementById('filterBulan');
        bulanSet.forEach(bulan => {
            const option = document.createElement('option');
            option.value = bulan;
            option.textContent = bulan;
            select.appendChild(option);
        });
    }
}

// ============================================
// UPDATE SUMMARY
// ============================================

function updateSummary() {
    const totalPemasukan = allData
        .filter(d => d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const totalPengeluaran = allData
        .filter(d => d.tipe === 'Pengeluaran')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const saldo = totalPemasukan - totalPengeluaran;
    
    document.getElementById('totalPemasukan').textContent = formatRupiah(totalPemasukan);
    document.getElementById('totalPengeluaran').textContent = formatRupiah(totalPengeluaran);
    document.getElementById('saldoAkhir').textContent = formatRupiah(saldo);
    document.getElementById('totalTransaksi').textContent = allData.length.toLocaleString();
}

// ============================================
// UPDATE TABLE
// ============================================

function updateTable(data = allData) {
    const tbody = document.getElementById('tableBody');
    
    // Filter data
    const filtered = filterData(data);
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">📭 Tidak ada data</td></tr>';
        document.getElementById('totalRows').textContent = '0 data';
        return;
    }
    
    // Pagination
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filtered.slice(start, end);
    
    tbody.innerHTML = pageData.map(row => {
        const statusClass = (row.status || 'Valid').toLowerCase();
        const nominal = row.nominal || 0;
        const isPemasukan = row.tipe === 'Pemasukan';
        
        return `
            <tr>
                <td><strong>${row.id || '-'}</strong></td>
                <td>${row.tanggal || '-'}</td>
                <td>${row.bulan || '-'}</td>
                <td><span class="badge-status ${row.kategori === 'SPJ' ? 'valid' : 'pending'}">${row.kategori || '-'}</span></td>
                <td>${isPemasukan ? '📈' : '📉'} ${row.tipe || '-'}</td>
                <td title="${row.sumber || ''}">${truncateText(row.sumber || '-', 30)}</td>
                <td class="${isPemasukan ? 'text-green' : 'text-red'}">${formatRupiah(nominal)}</td>
                <td><span class="badge-status ${statusClass}">${row.status || 'Valid'}</span></td>
                <td>
                    <button class="btn-action btn-edit" onclick="editTransaction('${row.id}')">✏️</button>
                    <button class="btn-action btn-delete" onclick="deleteTransaction('${row.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('totalRows').textContent = `${filtered.length} data`;
}

// ============================================
// FILTER DATA
// ============================================

function filterData(data) {
    const bulan = document.getElementById('filterBulan').value;
    const kategori = document.getElementById('filterKategori').value;
    const tipe = document.getElementById('filterTipe').value;
    
    let filtered = data;
    
    if (bulan) {
        filtered = filtered.filter(d => d.bulan === bulan);
    }
    if (kategori) {
        filtered = filtered.filter(d => d.kategori === kategori);
    }
    if (tipe) {
        filtered = filtered.filter(d => d.tipe === tipe);
    }
    
    return filtered;
}

function applyFilters() {
    currentPage = 1;
    updateTable();
}

function resetFilters() {
    document.getElementById('filterBulan').value = '';
    document.getElementById('filterKategori').value = '';
    document.getElementById('filterTipe').value = '';
    currentPage = 1;
    updateTable();
}

// ============================================
// UPDATE CHART
// ============================================

function updateChart() {
    const ctx = document.getElementById('chartBulanan').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Group by bulan
    const bulanMap = {};
    allData.forEach(d => {
        if (!bulanMap[d.bulan]) {
            bulanMap[d.bulan] = { pemasukan: 0, pengeluaran: 0 };
        }
        if (d.tipe === 'Pemasukan') {
            bulanMap[d.bulan].pemasukan += (d.nominal || 0);
        } else {
            bulanMap[d.bulan].pengeluaran += (d.nominal || 0);
        }
    });
    
    const labels = Object.keys(bulanMap);
    const pemasukan = labels.map(b => bulanMap[b].pemasukan);
    const pengeluaran = labels.map(b => bulanMap[b].pengeluaran);
    const saldo = labels.map(b => bulanMap[b].pemasukan - bulanMap[b].pengeluaran);
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: pemasukan,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: '#22c55e',
                    borderWidth: 2
                },
                {
                    label: 'Pengeluaran',
                    data: pengeluaran,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 2
                },
                {
                    label: 'Saldo',
                    data: saldo,
                    type: 'line',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointBackgroundColor: '#3b82f6',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': Rp ' + 
                                context.parsed.y.toLocaleString('id-ID');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// CRUD OPERATIONS
// ============================================

// --- TAMBAH ---
function showAddModal() {
    document.getElementById('modalTitle').textContent = '➕ Tambah Transaksi';
    document.getElementById('editId').value = '';
    document.getElementById('transactionForm').reset();
    document.getElementById('formTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal').classList.add('active');
}

// --- EDIT ---
async function editTransaction(id) {
    const row = allData.find(d => d.id === id);
    if (!row) {
        Swal.fire('Error', 'Data tidak ditemukan', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = '✏️ Edit Transaksi';
    document.getElementById('editId').value = id;
    document.getElementById('formTanggal').value = row.tanggal || '';
    document.getElementById('formBulan').value = row.bulan || '';
    document.getElementById('formKategori').value = row.kategori || '';
    document.getElementById('formTipe').value = row.tipe || '';
    document.getElementById('formSumber').value = row.sumber || '';
    document.getElementById('formNominal').value = row.nominal || '';
    document.getElementById('formStatus').value = row.status || 'Valid';
    document.getElementById('formKeterangan').value = row.keterangan || '';
    
    document.getElementById('modal').classList.add('active');
}

// --- SAVE ---
async function saveTransaction(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const data = {
        tanggal: document.getElementById('formTanggal').value,
        bulan: document.getElementById('formBulan').value,
        kategori: document.getElementById('formKategori').value,
        tipe: document.getElementById('formTipe').value,
        sumber: document.getElementById('formSumber').value,
        nominal: parseFloat(document.getElementById('formNominal').value),
        status: document.getElementById('formStatus').value,
        keterangan: document.getElementById('formKeterangan').value,
        tahun: new Date().getFullYear()
    };
    
    const action = id ? 'update' : 'add';
    if (id) data.id = id;
    
    const btn = document.querySelector('.btn-save');
    btn.textContent = '⏳ Menyimpan...';
    btn.disabled = true;
    
    try {
        const response = await fetch(CONFIG.webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        
        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Berhasil!', result.message, 'success');
            closeModal();
            await loadData();
        } else {
            Swal.fire('Gagal!', result.error || 'Terjadi kesalahan', 'error');
        }
    } catch (error) {
        Swal.fire('Error!', error.message, 'error');
    } finally {
        btn.textContent = '💾 Simpan';
        btn.disabled = false;
    }
}

// --- DELETE ---
async function deleteTransaction(id) {
    const result = await Swal.fire({
        title: 'Hapus Transaksi?',
        text: 'Data yang dihapus tidak dapat dikembalikan!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const response = await fetch(CONFIG.webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'delete',
                id: id 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire('Terhapus!', data.message, 'success');
            await loadData();
        } else {
            Swal.fire('Gagal!', data.error || 'Terjadi kesalahan', 'error');
        }
    } catch (error) {
        Swal.fire('Error!', error.message, 'error');
    }
}

// ============================================
// MODAL
// ============================================

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// Tutup modal klik di luar
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ============================================
// EXPORT
// ============================================

function exportData() {
    const filtered = filterData(allData);
    if (!filtered.length) {
        Swal.fire('Info', 'Tidak ada data untuk diexport', 'info');
        return;
    }
    
    // Buat CSV
    const headers = ['ID', 'Tanggal', 'Bulan', 'Kategori', 'Tipe', 'Sumber', 'Nominal', 'Status'];
    const rows = filtered.map(d => [
        d.id || '',
        d.tanggal || '',
        d.bulan || '',
        d.kategori || '',
        d.tipe || '',
        d.sumber || '',
        d.nominal || 0,
        d.status || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOSNAS_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// REFRESH
// ============================================

function refreshData() {
    const btn = document.querySelector('.btn-refresh');
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;
    loadData().finally(() => {
        btn.textContent = '🔄 Refresh';
        btn.disabled = false;
    });
}

// ============================================
// UPDATE LAST UPDATED
// ============================================

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 
        '🕐 ' + now.toLocaleString('id-ID');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRupiah(angka) {
    if (isNaN(angka) || angka === null || angka === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}

function truncateText(text, maxLength) {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ============================================
// AUTO REFRESH (5 menit)
// ============================================

setInterval(refreshData, 5 * 60 * 1000);

// ============================================
// START
// ============================================

document.addEventListener('DOMContentLoaded', loadData);