import { auth } from './firebase';

export type NutriAppUser = {
  uid: string;
  email: string;
};

export const simulateNutriAppLogin = async (
  email: string,
  password: string
): Promise<NutriAppUser> => {

  void auth;

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  if (!isEmailValid) {
    throw new Error('El correo no tiene un formato válido.');
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  return {
    uid: 'nutriapp-demo-user-001',
    email,
  };
};
