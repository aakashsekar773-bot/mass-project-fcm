// /api/login.js
// Vercel Serverless Function (Node.js)

const admin = require('firebase-admin');

// 1. Firebase Admin SDK-ஐத் தொடங்குதல் (Initialization)
if (!admin.apps.length) {
    try {
        // 🔥 உறுதியான திருத்தம்: Environment Variable-இல் உள்ள '\\n' ஐ '\n' ஆக மாற்றுதல்
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
                universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
            }),
        });
        console.log("🟢 Login Function: Admin SDK initialized."); 
    } catch (error) {
        // Initialization தோல்வியடைந்தால், பிழையின் முழு விவரத்தை Log செய்யவும்
        console.error("🔴 Final Error: Firebase Admin Initialization Error:", error.message);
        throw error;
    }
}

// Init வெற்றிகரமாக நடந்தால் மட்டுமே db ஆப்ஜெக்ட் உருவாக்கப்படும்
const db = admin.apps.length ? admin.firestore() : null;

module.exports = async (req, res) => {
    // 2. Init தோல்வியடைந்தால், கோட்டை உடனடியாக நிறுத்துதல்
    if (!db) {
        return res.status(500).json({ success: false, message: "Server Initialization Failed (DB Not Ready)" });
    }

    // 3. HTTP Method-ஐச் சரிபார்த்தல்
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // 4. Request Body-ஐப் படித்தல் மற்றும் சரிபார்த்தல்
    const { phone, token } = req.body;

    if (!phone || !token) {
        return res.status(400).json({ success: false, message: "Missing phone number or token in request body." });
    }

    try {
        // 5. Token-ஐ Firestore-ல் சேமித்தல்: phone-ஐ Document ID ஆகப் பயன்படுத்துதல்
        const docRef = db.collection('tokens').doc(phone);
        await docRef.set({
            token: token,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 6. வெற்றிச் செய்தி
        return res.status(200).json({ success: true, message: 'Token registered successfully.' });

    } catch (error) {
        console.error('Error saving token:', error);
        return res.status(500).json({ success: false, message: 'Failed to save token on server.', details: error.message });
    }
};
            
