import React, { useState } from 'react';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

type AuthScreen = 'Login' | 'Register' | 'ForgotPassword';

export function AuthContainer() {
  const [screen, setScreen] = useState<AuthScreen>('Login');

  const navigation = {
    navigate: (name: string) => {
      if (name === 'Register') setScreen('Register');
      if (name === 'Login') setScreen('Login');
      if (name === 'ForgotPassword') setScreen('ForgotPassword');
    },
  };

  if (screen === 'Register') {
    return <RegisterScreen navigation={navigation} />;
  }
  if (screen === 'ForgotPassword') {
    return <ForgotPasswordScreen navigation={navigation} />;
  }
  return <LoginScreen navigation={navigation} />;
}
