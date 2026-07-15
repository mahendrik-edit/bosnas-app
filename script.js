// ============================================
// SCRIPT.JS - BOSNAS APP v3.0
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
    tbody.innerHTML = '<tr><td colspan="10" class="loading">⏳ Loading data...</td></tr>';
    
    try {
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
            <tr><td colspan="10" style="color:red;text-align:center;padding:20px;">
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
            // Clear existing options (keep first)
            while (select.options.length > 1) {
                select.remove(1);
            }
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
        while (select.options.length > 1) {
            select.remove(1);
        }
        bulanSet.forEach(bulan => {
            const option = document.createElement('option');
            option.value = bulan;
            option.textContent = bulan;
            select.appendChild(option);
        });
    }
}

// ============================================
// TOGGLE METODE (SPJ + Pengeluaran)
// ============================================

function toggleMetode() {
    const kategori = document.getElementById('formKategori').value;
    const tipe = document.getElementById('formTipe').value;
    const metodeGroup = document.getElementById('metodeGroup');
    
    // Tampilkan hanya jika SPJ + Pengeluaran
    if (kategori === 'SPJ' && tipe === 'Pengeluaran') {
        metodeGroup.style.display = 'block';
    } else {
        metodeGroup.style.display = 'none';
        document.getElementById('formMetode').value = '';
    }
}

// ============================================
// UPDATE SUMMARY
// ============================================

function updateSummary() {
    // === SPJ ===
    const spjPemasukan = allData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const spjPengeluaran = allData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    // === TAKTIS ===
    const taktisPemasukan = allData
        .filter(d => d.kategori === 'TAKTIS' && d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const taktisPengeluaran = allData
        .filter(d => d.kategori === 'TAKTIS' && d.tipe === 'Pengeluaran')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    // === SALDO ===
    const saldoSPJ = spjPemasukan - spjPengeluaran;
    const saldoTAKTIS = taktisPemasukan - taktisPengeluaran;
    const totalSaldo = saldoSPJ + saldoTAKTIS;
    
    // === UPDATE UI ===
    document.getElementById('saldoSPJ').textContent = formatRupiah(saldoSPJ);
    document.getElementById('saldoTAKTIS').textContent = formatRupiah(saldoTAKTIS);
    document.getElementById('totalSaldo').textContent = formatRupiah(totalSaldo);
    document.getElementById('totalTransaksi').textContent = allData.length.toLocaleString();
    
    document.getElementById('detailSPJ').textContent = 
        `Pemasukan: ${formatRupiah(spjPemasukan)} | Pengeluaran: ${formatRupiah(spjPengeluaran)}`;
    document.getElementById('detailTAKTIS').textContent = 
        `Pemasukan: ${formatRupiah(taktisPemasukan)} | Pengeluaran: ${formatRupiah(taktisPengeluaran)}`;
    
    // === METODE SPJ ===
    const tunai = allData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran' && d.metode === 'Tunai')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const nonTunai = allData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran' && d.metode === 'Non Tunai')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    document.getElementById('totalTunai').textContent = formatRupiah(tunai);
    document.getElementById('totalNonTunai').textContent = formatRupiah(nonTunai);
}

// ============================================
// UPDATE TABLE
// ============================================

function updateTable(data = allData) {
    const tbody = document.getElementById('tableBody');
    
    const filtered = filterData(data);
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">📭 Tidak ada data</td></tr>';
        document.getElementById('totalRows').textContent = '0 data';
        return;
    }
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filtered.slice(start, end);
    
    tbody.innerHTML = pageData.map(row => {
        const statusClass = (row.status || 'Valid').toLowerCase();
        const nominal = row.nominal || 0;
        const isPemasukan = row.tipe === 'Pemasukan';
        const kategoriClass = row.kategori === 'SPJ' ? 'spj' : 'taktis';
        const metode = row.metode || '-';
        
        return `
            <tr>
                <td><strong>${row.id || '-'}</strong></td>
                <td>${row.tanggal || '-'}</td>
                <td>${row.bulan || '-'}</td>
                <td title="${row.keterangan || ''}">${truncateText(row.keterangan || '-', 25)}</td>
                <td><span class="badge-kategori ${kategoriClass}">${row.kategori || '-'}</span></td>
                <td>${isPemasukan ? '📈' : '📉'} ${row.tipe || '-'}</td>
                <td>${metode}</td>
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
    if (bulan) filtered = filtered.filter(d => d.bulan === bulan);
    if (kategori) filtered = filtered.filter(d => d.kategori === kategori);
    if (tipe) filtered = filtered.filter(d => d.tipe === tipe);
    
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
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
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

function showAddModal() {
    document.getElementById('modalTitle').textContent = '➕ Tambah Transaksi';
    document.getElementById('editId').value = '';
    document.getElementById('transactionForm').reset();
    document.getElementById('formTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('metodeGroup').style.display = 'none';
    document.getElementById('modal').classList.add('active');
}

async function editTransaction(id) {
    const row = allData.find(d => d.id === id);
    if (!row) {
        Swal.fire('Error', 'Data tidak ditemukan', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = '✏️ Edit Transaksi';
    document.getElementById('editId').value = id;
    document.getElementById('formTanggal').value = row.tanggal || '';
    document.getElementById('formKeterangan').value = row.keterangan || '';
    document.getElementById('formKategori').value = row.kategori || 'SPJ';
    document.getElementById('formTipe').value = row.tipe || 'Pemasukan';
    document.getElementById('formNominal').value = row.nominal || '';
    document.getElementById('formStatus').value = row.status || 'Valid';
    document.getElementById('formMetode').value = row.metode || 'Tunai';
    
    // Toggle metode
    toggleMetode();
    
    document.getElementById('modal').classList.add('active');
}

async function saveTransaction(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const kategori = document.getElementById('formKategori').value;
    const tipe = document.getElementById('formTipe').value;
    
    const data = {
        tanggal: document.getElementById('formTanggal').value,
        keterangan: document.getElementById('formKeterangan').value,
        kategori: kategori,
        tipe: tipe,
        nominal: parseFloat(document.getElementById('formNominal').value),
        status: document.getElementById('formStatus').value,
        tahun: new Date().getFullYear()
    };
    
    // Tambahkan metode hanya jika SPJ + Pengeluaran
    if (kategori === 'SPJ' && tipe === 'Pengeluaran') {
        data.metode = document.getElementById('formMetode').value;
    }
    
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
            body: JSON.stringify({ action: 'delete', id: id })
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
    
    const headers = ['ID', 'Tanggal', 'Bulan', 'Keterangan', 'Kategori', 'Tipe', 'Metode', 'Nominal', 'Status'];
    const rows = filtered.map(d => [
        d.id || '',
        d.tanggal || '',
        d.bulan || '',
        d.keterangan || '',
        d.kategori || '',
        d.tipe || '',
        d.metode || '',
        d.nominal || 0,
        d.status || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = '🕐 ' + now.toLocaleString('id-ID');
}

// ============================================
// AUTO REFRESH (5 menit)
// ============================================

setInterval(refreshData, 5 * 60 * 1000);

// ============================================
// START
// ============================================

document.addEventListener('DOMContentLoaded', loadData);
