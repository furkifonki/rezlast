import React, { useState } from 'react';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

type AuthScreen = 'Login' | 'Register';

export function AuthContainer() {
  const [screen, setScreen] = useState<AuthScreen>('Login');

  const navigation = {
    navigate: (name: string) => {
      if (name === 'Register') setScreen('Register');
      if (name === 'Login') setScreen('Login');
    },
  };

  if (screen === 'Register') {
    return <RegisterScreen navigation={navigation} />;
  }
  return <LoginScreen navigation={navigation} />;
}
