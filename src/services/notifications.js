import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const createNotification = async (notificationData) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...notificationData,
            createdAt: serverTimestamp(),
            isRead: false,
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};