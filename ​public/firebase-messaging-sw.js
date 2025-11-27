// ✅ உங்கள் Firebase Config Details
const firebaseConfig = {
    apiKey: "AIzaSyDdI8IAXnTuml1RG7CPmTjEuuTjktn-KSA",
    projectId: "project-mass-fbd52",
    messagingSenderId: "768930454542",
    appId: "1:768930454542:web:3fe15d047a48bab349f05f"
};

// Initialize Firebase App
// Note: This needs the full Firebase SDK imported in the HTML file to work correctly in Vercel.
// We are using the older SDK version for better Service Worker compatibility.
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Browser மூடப்பட்டிருந்தாலும் நோட்டிஃபிகேஷனைக் கையாளுதல்
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/path/to/your/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
