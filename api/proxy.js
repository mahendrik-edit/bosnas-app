// ============================================
// API PROXY - BOSNAS APP v3.0
// Vercel Serverless Function untuk menghindari CORS
// ============================================

export default async function handler(req, res) {
    // ==========================================
    // 1. SET CORS HEADERS
    // ==========================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // ==========================================
    // 2. HANDLE PREFLIGHT (OPTIONS)
    // ==========================================
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // ==========================================
    // 3. GOOGLE APPS SCRIPT URL (YANG BARU DARI ANDA)
    // ==========================================
    const targetUrl = 'https://script.google.com/macros/s/AKfycby9YNXTpcLEckWRMz64-NKiDxqIFZfmErji305dPb9aizB5Cu4VzvauMTl9TJyX1UA5/exec';
    
    try {
        console.log('📡 Proxy: Forwarding to Google Apps Script');
        console.log('📡 Action:', req.body?.action);
        
        // ==========================================
        // 4. FORWARD REQUEST KE GOOGLE APPS SCRIPT
        // ==========================================
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });
        
        // ==========================================
        // 5. BACA RESPONSE
        // ==========================================
        const data = await response.json();
        console.log('📡 Proxy Response:', data);
        
        // ==========================================
        // 6. KIRIM RESPONSE KEMBALI
        // ==========================================
        res.status(response.status).json(data);
        
    } catch (error) {
        console.error('❌ Proxy Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal Server Error' 
        });
    }
}

// ============================================
// KONFIGURASI VERCEL
// ============================================

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};
