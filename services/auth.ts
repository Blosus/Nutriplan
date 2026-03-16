import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

export type NutriAppUser = {
  uid: string;
  email: string;
};

const mapFirebaseUser = (user: User): NutriAppUser => {
  return {
    uid: user.uid,
    email: user.email ?? '',
  };
};

const validateCredentials = (email: string, password: string) => {
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  if (!isEmailValid) {
    throw new Error('El correo no tiene un formato válido.');
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
};

const mapFirebaseAuthError = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const code = (error as { code: string }).code;

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Correo o contraseña incorrectos.';
      case 'auth/invalid-email':
        return 'El correo no tiene un formato válido.';
      case 'auth/email-already-in-use':
        return 'Ese correo ya está registrado.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/network-request-failed':
        return 'No se pudo conectar con Firebase. Revisa tu conexión.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta de nuevo más tarde.';
      default:
        return 'No se pudo completar la autenticación.';
    }
  }

  return 'No se pudo completar la autenticación.';
};

export const simulateNutriAppLogin = async (
  email: string,
  password: string
): Promise<NutriAppUser> => {
  validateCredentials(email, password);

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    return mapFirebaseUser(credential.user);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
};

export const simulateNutriAppRegister = async (
  email: string,
  password: string,
  confirmPassword: string
): Promise<NutriAppUser> => {
  validateCredentials(email, password);

  if (password !== confirmPassword) {
    throw new Error('Las contraseñas no coinciden.');
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    return mapFirebaseUser(credential.user);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
};

export const signOutNutriApp = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
};
