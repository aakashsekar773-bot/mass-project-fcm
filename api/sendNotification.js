// /api/sendNotification.js
// Vercel Serverless Function (Node.js)

const admin = require('firebase-admin');

// 1. Firebase Admin SDK-ஐத் தொடங்குதல் (Initialization)
if (!admin.apps.length) {
    try {
        // Private Key வாசித்தல் மற்றும் சரிசெய்தல்
        const privateKey = process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined;

        if (!privateKey) {
             console.error("🔴 Fatal: FIREBASE_PRIVATE_KEY environment variable is missing.");
             throw new Error("Initialization Failed: Missing Private Key.");
        }

        // 🔥 முக்கிய மாற்றம்: databaseURL நீக்கப்பட்டுள்ளது
        admin.initializeApp({
            credential: admin.credential.cert({
                type: process.env.FIREBASE_TYPE,
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: privateKey, 
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
            }),
            // ❌ முன்னர் இருந்த databaseURL இங்கு இல்லை. 
            // FCM API-ஐ அணுக இது தேவையில்லை மற்றும் 404 பிழையை ஏற்படுத்தியது.
        });
        console.log("🟢 Notification Function: Admin SDK initialized successfully."); 
    } catch (error) {
        console.error("🔴 Final Error: Firebase Admin Initialization Error:", error.message);
        throw error;
    }
}

// DB Instance-ஐ Initialization செய்த பின் பெறுகிறோம்.
const db = admin.apps.length ? admin.firestore() : null;

module.exports = async (req, res) => {
    // 2. Initialization சரிபார்ப்பு
    if (!db) {
        return res.status(500).json({ success: false, message: "Server Initialization Failed (DB Not Ready). Check environment variables." });
    }

    // 3. HTTP Method சரிபார்ப்பு
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST.' });
    }

    const { message } = req.body; 
    
    let tokens = [];
    const COLLECTION_NAME = 'tokens'; // நீங்கள் பயன்படுத்தும் Collection Name

    // 4. Firestore-லிருந்து Tokens பெறுதல்
    try {
        const snapshot = await db.collection(COLLECTION_NAME).get(); 
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.token) {
                tokens.push(data.token);
            }
        });
        console.log(`Total registration tokens found: ${tokens.length}`); 

    } catch (error) {
        console.error('Error fetching tokens from Firestore:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve tokens from database.' });
    }

    // 5. Tokens இல்லாதபோது பதில் அனுப்புதல்
    if (tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No registered devices found to send notification.' });
    }

    // 6. Notification Payload
    const payload = {
        notification: {
            title: 'புதிய அறிவிப்பு',
            body: message || 'புதிய செய்தியைப் பார்க்கவும்.',
            icon: 'YOUR_ICON_URL' // உங்கள் ஆப் ஐகான் URL-ஐ சேர்க்கவும்
        },
        data: { 
            key_message: message || 'புதிய செய்தியைப் பார்க்கவும்.',
            click_action: 'FLUTTER_NOTIFICATION_CLICK' // உங்கள் ஆப்-இன் click_action
        }
    };
    
    // 7. Notification அனுப்புதல் (sendAll)
    try {
        const messages = tokens.map(token => ({ token, ...payload }));
        const response = await admin.messaging().sendAll(messages);
        
        console.log(`Successfully attempted to send message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
        
        // தோல்வியடைந்த டோக்கன்களைப் பதிவுசெய்தல்
        response.responses.forEach((result, index) => {
            if (!result.success && result.error) {
                const tokenFailed = tokens[index];
                console.error(`🔴 FCM FAILURE for Token ${tokenFailed.substring(0, 10)}...: Message: ${result.error.message}, Code: ${result.error.code}`);
            }
        });

        return res.status(200).json({ success: true, message: `${response.successCount} notifications sent successfully.`, failureCount: response.failureCount });
    } catch (error) {
        // 404 பிழை இப்போது இந்த Catch Block-க்கு வரக்கூடாது.
        console.error('Final Error sending message:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to send notifications due to server error.', details: error.message });
    }
};
            
