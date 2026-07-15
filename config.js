// ============================================
// KONFIGURASI - BOSNAS APP v3.0
// ============================================

const CONFIG = {
    // ==========================================
    // GOOGLE APPS SCRIPT WEB APP URL
    // ==========================================
    webAppUrl: 'https://script.google.com/macros/s/AKfycbxu-nV9OhXGI4W_N6f7WRvjlYfYlHqpvQNEgUx1flXCHvOUoOHIFpJJJKVTaybwQK3_JQ/exec',
    
    // ==========================================
    // SPREADSHEET ID
    // ==========================================
    spreadsheetId: '1UEamMydVptgCs1YnJIik5fVbFvZXgwY-mv5QyYOHqH4',
    
    // ==========================================
    // API KEY - GANTI DENGAN API KEY ANDA
    // Cara dapatkan: Google Cloud Console > Credentials > API Key
    // ==========================================
    apiKey: 'AIzaSyAiVL0pz7UD9qYnYTd6cmGey5zkUseTBNE'
};

// ============================================
// JANGAN UBAH DI BAWAH INI
// ============================================

// Export untuk browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
