// ============================================
// KONFIGURASI - BOSNAS APP v3.0
// ============================================

const CONFIG = {
    // ==========================================
    // GOOGLE APPS SCRIPT WEB APP URL (BARU)
    // ==========================================
    webAppUrl: 'https://script.google.com/macros/s/AKfycby9YNXTpcLEckWRMz64-NKiDxqIFZfmErji305dPb9aizB5Cu4VzvauMTl9TJyX1UA5/exec',
    
    // ==========================================
    // PROXY URL (Vercel Serverless Function)
    // ==========================================
    proxyUrl: '/api/proxy',
    
    // ==========================================
    // SPREADSHEET ID
    // ==========================================
    spreadsheetId: '1UEamMydVptgCs1YnJIik5fVbFvZXgwY-mv5QyYOHqH4',
    
    // ==========================================
    // API KEY
    // ==========================================
    apiKey: 'AIzaSyAiVL0pz7UD9qYnYTd6cmGey5zkUseTBNE',
    
    // ==========================================
    // MODE APLIKASI
    // ==========================================
    mode: 'full'
};

// ============================================
// JANGAN UBAH DI BAWAH INI
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
