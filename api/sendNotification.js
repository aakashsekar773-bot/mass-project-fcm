// Vercel Serverless Function: api/sendNotification.js
const admin = require('firebase-admin');

// Firebase Admin SDK-ஐ initialize செய்தல் (login.js-இல் உள்ள அதே குறியீடு)
if (!admin.apps.length) {
    const serviceAccount = {
        "type": process.env.FIREBASE_TYPE,
        "project_id": process.env.FIREBASE_PROJECT_ID,
        "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
        "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Newline fix
        "client_email": process.env.FIREBASE_CLIENT_EMAIL,
        "auth_uri": process.env.FIREBASE_AUTH_URI,
        "token_uri": process.env.FIREBASE_TOKEN_URI,
        "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_CERT_URL,
        "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL,
        "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
    };
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { messageBody } = req.body;

    try {
        // 1. Database-இல் உள்ள அனைத்து Token-களையும் பெறுதல்
        const snapshot = await db.collection('users').get();
        const tokens = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.token) {
                tokens.push(userData.token);
            }
        });
        
        if (tokens.length === 0) {
             return res.status(200).json({ success: true, message: 'No registered devices found to send notification.' });
        }

        // 2. Notification Message-ஐ வடிவமைத்தல்
        const message = {
            notification: {
                title: 'புதிய அறிவிப்பு!',
                body: messageBody,
            },
            webpush: {
                headers: { Urgency: 'high' },
                notification: { requireInteraction: 'true' }
            },
            tokens: tokens,
        };

        // 3. FCM மூலம் நோட்டிஃபிகேஷன் அனுப்புதல்
        const response = await admin.messaging().sendMulticast(message);
        
        res.status(200).json({ 
            success: true, 
            message: `Notification sent successfully. Success: ${response.successCount}, Failure: ${response.failureCount}` 
        });

    } catch (error) {
        console.error('Notification Sending Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', debug: error.message });
    }
};
