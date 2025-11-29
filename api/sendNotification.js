// /api/sendNotification.js
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

        // 🔥 இறுதித் தீர்வு: Init கன்ஃபிகரேஷனை எளிதாக்கி, FCM URL-ஐ சரியாகக் கட்டமைக்கிறோம்.
        admin.initializeApp({
            credential: admin.credential.cert({
                type: process.env.FIREBASE_TYPE,
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: privateKey, 
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                // மற்ற URI-களை நீக்குகிறோம், இதுவே 404-ஐத் தடுக்கும்.
            }),
            // Manual FCM URL configuration using project ID
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` 
        });
        console.log("🟢 Notification Function: Admin SDK initialized."); 
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

    const { message } = req.body; 
    
    let tokens = [];
    const COLLECTION_NAME = 'tokens'; 

    try {
        // Firestore Access Verification
        const snapshot = await db.collection(COLLECTION_NAME).get(); 
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.token) {
                tokens.push(data.token);
            }
        });
        console.log(`Total tokens found: ${tokens.length}`); 

    } catch (error) {
        console.error('Error fetching tokens from Firestore:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve tokens from database.' });
    }

    if (tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No registered devices found to send notification.' });
    }

    const payload = {
        notification: {
            title: 'புதிய அறிவிப்பு',
            body: message || 'புதிய செய்தியைப் பார்க்கவும்.',
            icon: 'YOUR_ICON_URL' 
        },
        data: { 
            key_message: message || 'புதிய செய்தியைப் பார்க்கவும்.',
            click_action: 'FLUTTER_NOTIFICATION_CLICK' 
        }
    };

    try {
        // நோட்டிஃபிகேஷனை அனுப்புகிறது. இனி இது சரியான FCM URL-ஐப் பயன்படுத்தும்.
        const response = await admin.messaging().sendAll(tokens.map(token => ({ token, ...payload })));
        
        console.log(`Successfully attempted to send message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
        
        // பிழைகளைக் கண்டறிதல்
        response.responses.forEach((result, index) => {
            if (!result.success && result.error) {
                const tokenFailed = tokens[index];
                console.error(`🔴 FCM FAILURE for Token ${tokenFailed.substring(0, 10)}...: Message: ${result.error.message}, Code: ${result.error.code}`);
            }
        });

        return res.status(200).json({ success: true, message: `${response.successCount} notifications sent successfully.` });
    } catch (error) {
        console.error('Final Error sending message:', error);
        return res.status(500).json({ success: false, message: 'Failed to send notifications due to server error.', details: error.message });
    }
};
                
