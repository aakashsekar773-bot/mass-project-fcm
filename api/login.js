// /api/login.js
// Vercel Serverless Function (Node.js)

const admin = require('firebase-admin');

// 1. Firebase Admin SDK-ஐத் தொடங்குதல் (Initialization)
// Environment Variables-லிருந்து Service Account-ஐப் பயன்படுத்துதல்
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                type: process.env.FIREBASE_TYPE,
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Private Key-ல் உள்ள \n-களை சரியாக மாற்றுதல்
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: process.env.FIREBASE_AUTH_URI,
                token_uri: process.env.FIREBASE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_CERT_URL,
                client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
                universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
            }),
            // Database URL தேவையில்லை
        });
    } catch (error) {
        console.error("Firebase Admin Initialization Error:", error);
        return (req, res) => {
            res.status(500).json({ success: false, message: "Server Initialization Failed" });
        };
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    // 2. HTTP Method-ஐச் சரிபார்த்தல்
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // 3. Request Body-ஐப் படித்தல்
    const { phone, token } = req.body;

    // 4. உள்ளீட்டு மதிப்புகளைச் சரிபார்த்தல் (The Fix for the "Missing" Error)
    if (!phone || !token) {
        // உங்கள் index.html-ல் இருந்து வரும் பிழைச் செய்தியைச் சரியாக அனுப்பும்
        console.error("Missing data:", { phone, token });
        return res.status(400).json({ success: false, message: "Missing phone number or token in request body." });
    }

    try {
        // 5. Token-ஐ Firestore-ல் சேமித்தல்
        const docRef = db.collection('tokens').doc(phone);
        await docRef.set({
            token: token,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 6. வெற்றிச் செய்தி
        return res.status(200).json({ success: true, message: 'Token registered successfully.' });

    } catch (error) {
        console.error('Error saving token:', error);
        return res.status(500).json({ success: false, message: 'Failed to save token on server.' });
    }
};
    
