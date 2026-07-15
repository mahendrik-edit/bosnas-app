// ============================================
// KONFIGURASI - BOSNAS APP v3.0
// ============================================

const CONFIG = {
    // ==========================================
    // GOOGLE APPS SCRIPT WEB APP URL
    // Deploy Apps Script dan copy URL-nya di sini
    // ==========================================
    webAppUrl: 'https://script.google.com/macros/s/AKfycbzj70MtoBUvW-pIqJ0rAhOKMGkavgXtbVUMRx5S7e5DslTSyPoNt0xv2UGMKs2aI2KTDQ/exec',
    
    // ==========================================
    // SPREADSHEET ID (Untuk fallback)
    // ==========================================
    spreadsheetId: '1UEamMydVptgCs1YnJIik5fVbFvZXgwY-mv5QyYOHqH4',
    
    // ==========================================
    // API KEY (Untuk fallback)
    // ==========================================
    apiKey: 'AIzaSyAiVL0pz7UD9qYnYTd6cmGey5zkUseTBNE'
};

// ============================================
// JANGAN UBAH DI BAWAH INI
// ============================================

// Helper untuk URL API
function getSheetUrl(sheetName, range) {
    return `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${sheetName}!${range}?key=${CONFIG.apiKey}`;
}

// Export untuk browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
