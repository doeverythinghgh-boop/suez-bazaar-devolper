
import admin from 'firebase-admin';

export const config = {
  runtime: 'nodejs', // Firebase Admin requires Node.js runtime
};

// Hardcoded credentials from notification-credentials.js (Server-side safe)
const serviceAccount = {
  "type": "service_account",
  "project_id": "suze-bazaar-notifications",
  "private_key_id": "d247ab66b9b5effc3b3258ca95c84ee236aad33a",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCxQVFEzRhC5ht0\nM+evWwzCXZ4NpXdEHQQsPd7oZLIDZVJtZKr4tvMm2C+dfnzda1zIZ1LTWztdIpR7\n0/27ulpbBaN9uNUl885R6mwCz1XcjDk3ykw+nUCAfvWAP1J6j8wYXyiYw9QUoMXv\nzxzM9A3PhlW6n92kQDH1ILTsuDzghbw7wgOQoiuE908d3ytTHaX2gQ26rtNoKOww\n2y2pmDxe92+iBoIrmc7qoIrOQz40EP20FxoqOXKPCiwI3VISECdoduGdBQlPieSe\nr9DG2yeSt0XyfF8zV7qAX2xivAeUnEfBgYJLKsOZL4P6dxilJyTomGVS/fBplBN/\n/wHVk7cnAgMBAAECggEAIv6Et2MQT6DTOblHm9CLb9IAsqwApFNgMAXU/Kdol5AI\n2mz97hVcYsZafCrtJt+b1TrE2NJRoX0CuIGtPcM4NHEkCl2TwybjjDuOMG3TgzOx\n1ihbrh7ojZXDDRszQtwhzIv43VQICjyFZ2dJxdLG6ToZsbr/DH7Z/g2DepqS9jZM\nyyGNdD+UsH2WKxYxMmqyUBz4fM4mJct6irtG6a9XrgPxtgzo7e9WR8FJXGxzv57S\n92iWpF4+yNopgx0CrBZe284ZDkibWvf5lc9Ghqyr07SBApksIU9Hke4Ty+xfNfrJ\nPknhg7/OWIpHoKzCr3s0oFWLQX3AL2aqiNqTs88RrQKBgQDVw+qgCYfSzoLatrGO\nauo6K+7b1y6Ce1WzvFLnDSxQ/0V2hQZJmvRogTrnuKkozgDouHFIm1ks60eiA3bY\npzYWhl6clF90o9tpG54dny9QSxPqUWInwuvWxDre7NnwX1QTBTn6ApMi6ko9iY3J\nNYNt7omgs6IpyxCBJlGyEHjSEwKBgQDURr7kYy5PzsGlcun6pAA9gYQQ1LLcMwDS\nBPaRzFkOZc59cQoD8ATQNwzqK8aUJVJnEfSLtG6URFfqYgcPnDySOF9Dpq78d00+\nWR2p5WoK+RTdjSykgmOK1StGen/1tCEsg1A2XgisLo1DnNGKUG3stGNcZkapKjSW\nbQFwr6HJHQKBgEmeIS1gWuBksnf0Nw3fEC9cdfRMFP5mz0sI7lwYE00JvLhmc5Xh\nwY5EAy9OTyN4XqPG8WyZ44outQq8uq8+VshHGko+ZulajPOTyU5WRgsW8BLgWDdt\nT581ETk4xI2dpuyt/ht1y4pYuZybxLKotUyku80WUCCoiFSSB8yVE6b1AoGABV0k\nRbEb4nhe/EdDEkpCl0tGgwZc3qOLScNGV7jKJ0r7RMAueJsABCLf+KrSgbvPsTsK\n6tzMToLLleiUNRjFjwxNm/ACS+7XzNODpF9fppdUp6SBlEaXLVLlnQpLYXIDxJQs\n2rLVlUQ33ZWA1fXiUTDdseADuRKP8Z0fhDFr7SECgYBPd5OhRMyg/+wnPdfpskpt\nc4OxIZxwy//5BIlNCFTQnP54qFm5aP2m+skUKF+nSqifkPgwm2MlV9peTY3+Lv8q\n9UEZ27rHPwKyJ+OK9y1LV+KLaghE7XxntXX/SiEEtRuUN6IEKMWpIZbjGEwCnQ19\ntXuaimWKIIt4hKZGKiIfaw==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@suze-bazaar-notifications.iam.gserviceaccount.com"
};

/**
 * Initialize Firebase Admin if not already initialized
 */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      res.status(400).json({ error: 'Missing required fields: token, title, body' });
      return;
    }

    console.log(`[API] Sending notification via Server to: ${token.substring(0, 10)}...`);

    const message = {
      token: token,
      // We use 'data' payload primarily as per Android project conventions
      data: {
        title: title,
        body: body,
        platform: 'server-windows-bridge',
        timestamp: Date.now().toString(),
        ...data // Merge any additional data
      },
      // Optional: Android specific config
      android: {
        priority: 'high',
        data: {
          title: title,
          body: body
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('[API] Notification sent successfully:', response);

    res.status(200).json({ success: true, messageId: response });

  } catch (error) {
    console.error('[API] Error sending notification:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}