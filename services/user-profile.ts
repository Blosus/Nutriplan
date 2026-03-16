import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { NutriAppUser } from './auth';

export type UserProfile = {
  email: string;
  alarmsCount: number;
};

const USERS_COLLECTION = 'users';

export async function ensureUserProfile(user: NutriAppUser): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(
        userRef,
        {
          email: user.email,
          alarmsCount: 0,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    await setDoc(
      userRef,
      {
        email: user.email,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as Partial<UserProfile>;
    return {
      email: String(data.email ?? ''),
      alarmsCount: Number(data.alarmsCount ?? 0),
    };
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

export async function updateUserAlarmCount(uid: string, alarmsCount: number): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(
      userRef,
      {
        alarmsCount,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating user alarm count:', error);
  }
}