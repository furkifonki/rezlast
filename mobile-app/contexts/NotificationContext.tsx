import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastOptions = {
  type?: ToastType;
  duration?: number;
  message: string;
  title?: string;
};

type ToastState = {
  visible: boolean;
  message: string;
  title?: string;
  type: ToastType;
};

const TOAST_DURATION = 4000;
const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  error: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  info: { bg: '#f0f9ff', border: '#0ea5e9', text: '#0369a1' },
};

const NotificationContext = createContext<{
  show: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useToast must be used within NotificationProvider');
  return ctx;
}

function ToastOverlay({ state, onHide }: { state: ToastState; onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!state.visible) {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    const duration = TOAST_DURATION;
    hideTimer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide());
    }, duration);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [state.visible, state.message]);

  if (!state.visible) return null;

  const colors = COLORS[state.type];
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] });
  const opacity = anim;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          top: insets.top + 8,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {state.title ? <Text style={[styles.title, { color: colors.text }]}>{state.title}</Text> : null}
      <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
        {state.message}
      </Text>
    </Animated.View>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const hide = useCallback(() => setState((s) => ({ ...s, visible: false })), []);

  const show = useCallback(
    (options: ToastOptions) => {
      const { message, title, type = 'info' } = options;
      setState({
        visible: true,
        message,
        title,
        type,
      });
    },
    []
  );

  const success = useCallback((message: string, title?: string) => show({ type: 'success', message, title }), [show]);
  const error = useCallback((message: string, title?: string) => show({ type: 'error', message, title }), [show]);
  const warning = useCallback((message: string, title?: string) => show({ type: 'warning', message, title }), [show]);
  const info = useCallback((message: string, title?: string) => show({ type: 'info', message, title }), [show]);

  return (
    <NotificationContext.Provider value={{ show, success, error, warning, info }}>
      {children}
      <ToastOverlay state={state} onHide={hide} />
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
  },
});
