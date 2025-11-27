// Vercel Serverless Function: api/login.js
const admin = require('firebase-admin');

// Firebase Admin SDK-ஐ initialize செய்தல் (Vercel ENV Variables பயன்படுத்த வேண்டும்)
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
const db = admin.firestore(); // Cloud Firestore Instance

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { phoneNumber, token } = req.body;

    if (!phoneNumber || !token) {
        return res.status(400).json({ success: false, message: 'Missing phone number or token' });
    }

    try {
        // Firestore-இல் 'users' Collection-இல் Phone Number-ஐ Document ID-ஆகப் பயன்படுத்தி சேமிக்கிறோம்.
        await db.collection('users').doc(phoneNumber).set({
            token: token,
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.status(200).json({ success: true, message: 'Phone Number and Token saved successfully.' });

    } catch (error) {
        console.error('Firestore Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', debug: error.message });
    }
};
      
