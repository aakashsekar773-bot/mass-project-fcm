// /api/sendNotification.js
// Vercel Serverless Function (Node.js)

const admin = require('firebase-admin');

// 1. Firebase Admin SDK-ஐத் தொடங்குதல் (Initialization)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                type: process.env.FIREBASE_TYPE,
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                // மிக முக்கியமான திருத்தம்: Private Key-ல் உள்ள \n-களைச் சரியாக மாற்றுதல்
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                auth_uri: process.env.FIREBASE_AUTH_URI,
                token_uri: process.env.FIREBASE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_CERT_URL,
                client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
                universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
            }),
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
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // 2. Notification Message-ஐப் படித்தல்
    const { message } = req.body; 
    
    // 3. அனைத்து Tokens-ஐயும் Firestore-லிருந்து பெறுதல்
    let tokens = [];
    
    // உங்கள் கோரிக்கையின்படி, Collection பெயரை மீண்டும் 'tokens' என்று மாற்றுகிறோம்.
    const COLLECTION_NAME = 'tokens'; 

    try {
        // 'tokens' Collection-ஐப் படித்து, அனைத்து Document-களிலிருந்தும் Token-களைப் பிரித்தெடுக்கவும்.
        const snapshot = await db.collection(COLLECTION_NAME).get(); 
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.token) {
                tokens.push(data.token);
                // Token வெற்றிகரமாகக் கிடைத்ததைக் காட்டுதல்
                console.log(`Token found in Collection ${COLLECTION_NAME}`); 
            }
        });

    } catch (error) {
        console.error('Error fetching tokens from Firestore:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve tokens from database.' });
    }

    // 4. Tokens இல்லை என்றால் திரும்ப அனுப்புதல்
    if (tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No registered devices found to send notification.' });
    }

    // 5. Notification Message-ஐ உருவாக்குதல்
    const payload = {
        notification: {
            title: 'புதிய அறிவிப்பு',
            body: message || 'புதிய செய்தியைப் பார்க்கவும்.',
            icon: 'YOUR_ICON_URL' 
        }
    };

    // 6. Notification அனுப்புதல்
    try {
        // sendAll-ஐப் பயன்படுத்தி Notification அனுப்புதல்
        const response = await admin.messaging().sendAll(tokens.map(token => ({ token, ...payload })));
        
        console.log('Successfully sent message:', response);
        
        // successCount > 0 என்றால், நோட்டிஃபிகேஷன் வெற்றிகரமாக அனுப்பப்பட்டது
        return res.status(200).json({ success: true, message: `${response.successCount} notifications sent successfully.` });
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ success: false, message: 'Failed to send notifications.', details: error.message });
    }
};
                      
