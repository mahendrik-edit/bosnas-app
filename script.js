// ============================================
// SCRIPT.JS - BOSNAS APP v3.0 (OPTIMIZED)
// ============================================

let allData = [];
let chartInstance = null;
let currentPage = 1;
const rowsPerPage = 20;

// ============================================
// LOAD DATA - PRIORITASKAN API KEY
// ============================================

async function loadData() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading">⏳ Loading data...</td></tr>';
    
    try {
        // 1. COBA PAKAI API KEY (NO CORS)
        let data = await fetchDataViaAPI();
        
        // 2. Jika API Key gagal, coba Web App
        if (!data || data.length === 0) {
            console.warn('⚠️ API Key gagal, mencoba Web App...');
            data = await fetchDataViaWebApp();
        }
        
        // 3. Jika masih gagal, throw error
        if (!data || data.length === 0) {
            throw new Error('Tidak ada data dari kedua sumber');
        }
        
        // 4. Simpan data
        allData = data;
        console.log(`✅ Berhasil load ${data.length} data`);
        
        // 5. Update UI
        loadBulanDropdown();
        updateSummary();
        updateTable();
        updateChart();
        updateLastUpdated();
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = `
            <tr><td colspan="10" style="color:red;text-align:center;padding:20px;">
                ❌ ${error.message}
                <br><br>
                <button onclick="loadData()" class="btn btn-refresh">🔄 Coba Lagi</button>
                <br><br>
                <small style="color:#999;">Pastikan Google Sheets API sudah diaktifkan</small>
            </td></tr>
        `;
    }
}

// ============================================
// FETCH VIA API KEY (NO CORS - RECOMMENDED)
// ============================================

async function fetchDataViaAPI() {
    try {
        console.log('📡 Fetching data via API Key...');
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/MASTER_DATA!A:I?key=${CONFIG.apiKey}`;
        const response = await fetch(url);
        
        // Debug response
        console.log('API Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('API Result:', result);
        
        const rows = result.values || [];
        
        if (rows.length < 2) {
            console.warn('⚠️ Tidak ada data di spreadsheet');
            return [];
        }
        
        // Parse data
        // Header: ID, Tanggal, Bulan, Keterangan, Kategori, Tipe, Metode, Nominal, Status
        const data = rows.slice(1).map(row => ({
            id: row[0] || '',
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
        return [];
    }
}

// ============================================
// FETCH VIA WEB APP (CORS - mungkin gagal)
// ============================================

async function fetchDataViaWebApp() {
    try {
        console.log('📡 Fetching data via Web App...');
        
        const response = await fetch(`${CONFIG.webAppUrl}?action=all`, {
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Web App Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Loaded ${result.data?.length || 0} rows from Web App`);
        return result.data || [];
        
    } catch (error) {
        console.error('❌ Web App fetch error:', error);
        return [];
    }
}

// ============================================
// LOAD BULAN DROPDOWN
// ============================================

function loadBulanDropdown() {
    const bulanSet = new Set(allData.map(d => d.bulan).filter(Boolean));
    const select = document.getElementById('filterBulan');
    
    // Clear existing options (keep first)
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    const sortedBulan = ['Januari','Februari','Maret','April','Mei','Juni',
                         'Juli','Agustus','September','Oktober','November','Desember'];
    
    let addedCount = 0;
    sortedBulan.forEach(bulan => {
        if (bulanSet.has(bulan)) {
            const option = document.createElement('option');
            option.value = bulan;
            option.textContent = bulan;
            select.appendChild(option);
            addedCount++;
        }
    });
    
    console.log(`📅 Added ${addedCount} bulan to dropdown`);
}

// ============================================
// UPDATE SUMMARY - PASTIKAN DATA VALID
// ============================================

function updateSummary() {
    // Filter data yang valid
    const validData = allData.filter(d => d.kategori && d.tipe);
    
    // === SPJ ===
    const spjPemasukan = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const spjPengeluaran = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    // === TAKTIS ===
    const taktisPemasukan = validData
        .filter(d => d.kategori === 'TAKTIS' && d.tipe === 'Pemasukan')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const taktisPengeluaran = validData
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
    const tunai = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran' && d.metode === 'Tunai')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    const nonTunai = validData
        .filter(d => d.kategori === 'SPJ' && d.tipe === 'Pengeluaran' && d.metode === 'Non Tunai')
        .reduce((sum, d) => sum + (d.nominal || 0), 0);
    
    document.getElementById('totalTunai').textContent = formatRupiah(tunai);
    document.getElementById('totalNonTunai').textContent = formatRupiah(nonTunai);
}

// ============================================
// SISANYA TETAP SAMA...
// ============================================

// ... (fungsi lainnya tetap sama seperti sebelumnya)
// updateTable, filterData, applyFilters, resetFilters, 
// updateChart, showAddModal, editTransaction, 
// saveTransaction, deleteTransaction, closeModal,
// exportData, refreshData, formatRupiah, truncateText,
// updateLastUpdated, toggleMetode

// ============================================
// AUTO REFRESH (5 menit)
// ============================================

setInterval(refreshData, 5 * 60 * 1000);

// ============================================
// START
// ============================================

document.addEventListener('DOMContentLoaded', loadData);
