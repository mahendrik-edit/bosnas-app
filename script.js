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
            bulanMap[d.bulan] = { pemasukan: 0, peng
