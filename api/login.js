// /api/login.js
// Vercel Serverless Function (Node.js)

const admin = require('firebase-admin');

// 1. Firebase Admin SDK-ஐத் தொடங்குதல் (Initialization)
if (!admin.apps.length) {
    try {
        // 🔥 உறுதியான திருத்தம் 1: Environment Variable-இல் உள்ள '\\n' ஐ '\n' ஆக மாற்றுதல்
        const privateKey = process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined;

        if (!privateKey) {
             console.error("🔴 Fatal: FIREBASE_PRIVATE_KEY environment variable is missing.");
             throw new Error("Initialization Failed: Missing Private Key.");
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                type: process.env.FIREBASE_TYPE,
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: privateKey, // திருத்தப்பட்ட சாவியைப் பயன்படுத்துதல்
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: process.env.FIREBASE_AUTH_URI,
                token_uri: process.env.FIREBASE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_CERT_URL,
                client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
                // 🔥 உறுதியான திருத்தம் 2: universe_domain-ஐ நீக்கிவிட்டோம்
            }),
        });
        console.log("🟢 Login Function: Admin SDK initialized."); 
    } catch (error) {
        console.error("🔴 Final Error: Firebase Admin Initialization Error:", error.message);
        throw error;
    }
}

const db = admin.apps.length ? admin.firestore() : null;

module.exports = async (req, res) => {
    if (!db) {
        return res.status(500).json({ success: false, message: "Server Initialization Failed (DB Not Ready)" });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { phone, token } = req.body;

    if (!phone || !token) {
        return res.status(400).json({ success: false, message: "Missing phone number or token in request body." });
    }

    try {
        const docRef = db.collection('tokens').doc(phone);
        await docRef.set({
            token: token,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true, message: 'Token registered successfully.' });

    } catch (error) {
        console.error('Error saving token:', error);
        return res.status(500).json({ success: false, message: 'Failed to save token on server.', details: error.message });
    }
};
                
