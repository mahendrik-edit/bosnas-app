// ============================================
// SCRIPT.JS - BOSNAS APP v3.0 (FULL VERSION)
// ============================================

let allData = [];
let chartInstance = null;
let currentPage = 1;
const rowsPerPage = 20;

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
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = '🕐 ' + now.toLocaleString('id-ID');
}

// ============================================
// TOGGLE METODE
// ============================================

function toggleMetode() {
    const kategori = document.getElementById('formKategori');
    const tipe = document.getElementById('formTipe');
    const metodeGroup = document.getElementById('metodeGroup');
    
    if (!kategori || !tipe || !metodeGroup) return;
    
    if (kategori.value === 'SPJ' && tipe.value === 'Pengeluaran') {
        metodeGroup.style.display = 'block';
    } else {
        metodeGroup.style.display = 'none';
        const formMetode = document.getElementById('formMetode');
        if (formMetode) formMetode.value = '';
    }
}

// ============================================
// CHECK MODE
// ============================================

function isReadOnly() {
    return CONFIG.mode === 'readonly';
}

// ============================================
// FETCH VIA API KEY
// ============================================

async function fetchDataViaAPI() {
    try {
        console.log('📡 Fetching data via API Key...');
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/MASTER_DATA!A:I?key=${CONFIG.apiKey}`;
        const response = await fetch(url);
        
        console.log('API Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorMessage;
            } catch (e) {}
            
            throw new Error(`API Error: ${errorMessage}`);
        }
        
        const result = await response.json();
        const rows = result.values || [];
        
        if (rows.length < 2) {
            console.warn('⚠️ Tidak ada data di spreadsheet');
            return [];
        }
        
        const data = rows.slice(1).map((row, index) => ({
            id: row[0] || `AUTO-${index + 1}`,
            tanggal: row[1] || '',
            bulan: row[2] || '',
            keterangan: row[3] || '',
            kategori: row[4] || '',
            tipe: row[5] || '',
            metode: row[6] || '',
            nominal: parseFloat(row[7]) || 0,
            status: row[8] || 'Valid'
        }));
        
        console.log(`✅ Loaded ${data.length} rows from API`);
        return data;
        
    } catch (error) {
        console.error('❌ API Key fetch error:', error);
        throw error;
    }
}

// ============================================
// LOAD DATA
// ============================================

async function loadData() {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">⏳ Loading data...</td></tr>';
    }
    
    try {
        const data = await fetchDataViaAPI();
        
        if (!data || data.length === 0) {
            throw new Error('Tidak ada data dari Google Sheets. Pastikan sheet "MASTER_DATA" terisi.');
        }
        
        allData = data;
        console.log(`✅ Berhasil load ${data.length} data`);
        
        loadBulanDropdown();
        updateSummary();
        updateTable();
        updateChart();
        updateLastUpdated();
        updateModeUI();
        
    } catch (error) {
        console.error('❌ Error:', error);
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="10" style="color:red;text-align:center;padding:20px;">
                    <div style="font-size:24px;margin-bottom:10px;">❌</div>
                    <strong>${error.message}</strong>
                    <br><br>
                    <div style="text-align:left;max-width:500px;margin:0 auto;background:#f8f9fa;padding:15px;border-radius:8px;font-size:13px;color:#666;">
                        <strong>💡 Solusi:</strong><br>
                        1. Pastikan Google Sheets API sudah diaktifkan di Google Cloud Console<br>
                        2. Pastikan API Key valid dan memiliki akses ke spreadsheet<br>
                        3. Pastikan sheet bernama <strong>MASTER_DATA</strong><br>
                        4. Pastikan spreadsheet ID benar di config.js
                    </div>
                    <br>
                    <button onclick="loadData()" class="btn btn-refresh" style="padding:10px 30px;">🔄 Coba Lagi</button>
                </td></tr>
            `;
        }
    }
}

// ============================================
// UPDATE MODE UI
// ============================================

function updateModeUI() {
    const isReadOnlyMode = isReadOnly();
    const btnAdd = document.getElementById('btnAdd');
    const btnSave = document.getElementById('btnSave');
    const modeBadge = document.getElementById('modeBadge');
    const readonlyInfo = document.getElementById('readonlyInfo');
    
    if (btnAdd) {
        btnAdd.disabled = isReadOnlyMode;
        btnAdd.title = isReadOnlyMode ? 'Fitur dinonaktifkan (Read-Only)' : 'Tambah Transaksi';
        btnAdd.style.opacity = isReadOnlyMode ? '0.5' : '1';
        btnAdd.style.cursor = isReadOnlyMode ? 'not-allowed' : 'pointer';
    }
    
    if (btnSave) {
        btnSave.disabled = isReadOnlyMode;
        btnSave.title = isReadOnlyMode ? 'Fitur dinonaktifkan (Read-Only)' : '';
        btnSave.style.opacity = isReadOnlyMode ? '0.5' : '1';
        btnSave.style.cursor = isReadOnlyMode ? 'not-allowed' : 'pointer';
    }
    
    if (modeBadge) {
        if (isReadOnlyMode) {
            modeBadge.textContent = '🔒 Read-Only';
            modeBadge.style.background = '#ef4444';
        } else {
            modeBadge.textContent = '📝 Full Access';
            modeBadge.style.background = '#22c55e';
        }
    }
    
    if (readonlyInfo) {
        readonlyInfo.style.display = isReadOnlyMode ? 'block' : 'none';
    }
}

// ============================================
// LOAD BULAN DROPDOWN
// ============================================

function loadBulanDropdown() {
    const bulanSet = new Set(allData.map(d => d.bulan).filter(Boolean));
    const select = document.getElementById('filterBulan');
    if (!select) return;
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    const sortedBulan = ['Januari','Februari','Maret','April','Mei','Juni',
                         'Juli','Agustus','September','Oktober','November','Desember'];
    
    sortedBulan.forEach(bulan => {
        if (bulanSet.has(bulan)) {
            const option = document.createElement('option');
            option.value = bulan;
            option.textContent = bulan;
            select.appendChild(option);
        }
    });
}

// ============================================
// UPDATE SUMMARY
// ============================================

function updateSummary() {
    const validData = allData.filter(d => d.kategori && d.tipe);
    
    const spjPemasukan = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const spjPengeluaran = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const taktisPemasukan = validData
        .filter(d => d.kategori === 'TAKTIS' && d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const taktisPengeluaran = validData
        .filter(d => d.kategori === 'TAKTIS' && d.tipe === 'Pengeluaran')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const saldoSPJ = spjPemasukan - spjPengeluaran;
    const saldoTAKTIS = taktisPemasukan - taktisPengeluaran;
    const totalSaldo = saldoSPJ + saldoTAKTIS;
    
    const elements = {
        saldoSPJ: document.getElementById('saldoSPJ'),
        saldoTAKTIS: document.getElementById('saldoTAKTIS'),
        totalSaldo: document.getElementById('totalSaldo'),
        totalTransaksi: document.getElementById('totalTransaksi'),
        detailSPJ: document.getElementById('detailSPJ'),
        detailTAKTIS: document.getElementById('detailTAKTIS'),
        totalTunai: document.getElementById('totalTunai'),
        totalNonTunai: document.getElementById('totalNonTunai')
    };
    
    if (elements.saldoSPJ) elements.saldoSPJ.textContent = formatRupiah(saldoSPJ);
    if (elements.saldoTAKTIS) elements.saldoTAKTIS.textContent = formatRupiah(saldoTAKTIS);
    if (elements.totalSaldo) elements.totalSaldo.textContent = formatRupiah(totalSaldo);
    if (elements.totalTransaksi) elements.totalTransaksi.textContent = allData.length.toLocaleString();
    
    if (elements.detailSPJ) {
        elements.detailSPJ.textContent = `Pemasukan: ${formatRupiah(spjPemasukan)} | Pengeluaran: ${formatRupiah(spjPengeluaran)}`;
    }
    if (elements.detailTAKTIS) {
        elements.detailTAKTIS.textContent = `Pemasukan: ${formatRupiah(taktisPemasukan)} | Pengeluaran: ${formatRupiah(taktisPengeluaran)}`;
    }
    
    const tunai = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran' && d.metode === 'Tunai')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const nonTunai = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran' && d.metode === 'Non Tunai')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    if (elements.totalTunai) elements.totalTunai.textContent = formatRupiah(tunai);
    if (elements.totalNonTunai) elements.totalNonTunai.textContent = formatRupiah(nonTunai);
}

// ============================================
// FILTER DATA
// ============================================

function filterData(data) {
    const bulan = document.getElementById('filterBulan');
    const kategori = document.getElementById('filterKategori');
    const tipe = document.getElementById('filterTipe');
    
    let filtered = data;
    if (bulan && bulan.value) filtered = filtered.filter(d => d.bulan === bulan.value);
    if (kategori && kategori.value) filtered = filtered.filter(d => d.kategori === kategori.value);
    if (tipe && tipe.value) filtered = filtered.filter(d => d.tipe === tipe.value);
    
    return filtered;
}

function applyFilters() {
    currentPage = 1;
    updateTable();
}

function resetFilters() {
    const bulan = document.getElementById('filterBulan');
    const kategori = document.getElementById('filterKategori');
    const tipe = document.getElementById('filterTipe');
    
    if (bulan) bulan.value = '';
    if (kategori) kategori.value = '';
    if (tipe) tipe.value = '';
    
    currentPage = 1;
    updateTable();
}

// ============================================
// UPDATE TABLE
// ============================================

function updateTable(data = allData) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const filtered = filterData(data);
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">📭 Tidak ada data</td></tr>';
        const totalRows = document.getElementById('totalRows');
        if (totalRows) totalRows.textContent = '0 data';
        return;
    }
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filtered.slice(start, end);
    
    const isReadOnlyMode = isReadOnly();
    
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
                    ${isReadOnlyMode ? 
                        '<span style="color:#999;font-size:12px;">🔒</span>' :
                        `
                        <button class="btn-action btn-edit" onclick="editTransaction('${row.id}')">✏️</button>
                        <button class="btn-action btn-delete" onclick="deleteTransaction('${row.id}')">🗑️</button>
                        `
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    const totalRows = document.getElementById('totalRows');
    if (totalRows) totalRows.textContent = `${filtered.length} data`;
}

// ============================================
// UPDATE CHART
// ============================================

function updateChart() {
    const canvas = document.getElementById('chartBulanan');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
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
    
    const sortedBulan = ['Januari','Februari','Maret','April','Mei','Juni',
                         'Juli','Agustus','September','Oktober','November','Desember'];
    
    const labels = sortedBulan.filter(b => bulanMap[b]);
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
// CRUD OPERATIONS (Hanya jika bukan Read-Only)
// ============================================

function showAddModal() {
    if (isReadOnly()) {
        Swal.fire('Info', 'Mode Read-Only: Tidak dapat menambah data', 'info');
        return;
    }
    
    document.getElementById('modalTitle').textContent = '➕ Tambah Transaksi';
    document.getElementById('editId').value = '';
    document.getElementById('transactionForm').reset();
    document.getElementById('formTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('metodeGroup').style.display = 'none';
    document.getElementById('modal').classList.add('active');
}

async function editTransaction(id) {
    if (isReadOnly()) {
        Swal.fire('Info', 'Mode Read-Only: Tidak dapat mengedit data', 'info');
        return;
    }
    
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
    
    toggleMetode();
    document.getElementById('modal').classList.add('active');
}

async function saveTransaction(e) {
    e.preventDefault();
    
    if (isReadOnly()) {
        Swal.fire('Info', 'Mode Read-Only: Tidak dapat menyimpan data', 'info');
        return;
    }
    
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
    
    if (kategori === 'SPJ' && tipe === 'Pengeluaran') {
        data.metode = document.getElementById('formMetode').value;
    }
    
    const action = id ? 'update' : 'add';
    if (id) data.id = id;
    
    const btn = document.querySelector('.btn-save');
    btn.textContent = '⏳ Menyimpan...';
    btn.disabled = true;
    
    try {
        // Coba via Web App (akan error CORS)
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
        console.error('Save error:', error);
        
        // Tampilkan pesan yang lebih informatif
        if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
            Swal.fire({
                title: '⚠️ CORS Error',
                html: `
                    <p>Tidak dapat menyimpan data karena <strong>CORS</strong>.</p>
                    <br>
                    <div style="text-align:left;font-size:13px;color:#666;">
                        <strong>Solusi:</strong><br>
                        1. Buka Google Sheets langsung untuk menambah/edit data<br>
                        2. Atau deploy Web App dengan setting "Anyone"<br>
                        3. Atau gunakan Vercel Serverless Function sebagai proxy
                    </div>
                `,
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        } else {
            Swal.fire('Error!', error.message, 'error');
        }
    } finally {
        btn.textContent = '💾 Simpan';
        btn.disabled = false;
    }
}

async function deleteTransaction(id) {
    if (isReadOnly()) {
        Swal.fire('Info', 'Mode Read-Only: Tidak dapat menghapus data', 'info');
        return;
    }
    
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
        console.error('Delete error:', error);
        Swal.fire('Error!', 'Gagal menghapus data. CORS error.', 'error');
    }
}

// ============================================
// MODAL
// ============================================

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
}

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
    if (btn) {
        btn.textContent = '⏳ Loading...';
        btn.disabled = true;
    }
    loadData().finally(() => {
        if (btn) {
            btn.textContent = '🔄 Refresh';
            btn.disabled = false;
        }
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
    
    loadData();
});

// ============================================
// AUTO REFRESH (5 menit)
// ============================================

setInterval(refreshData, 5 * 60 * 1000);
