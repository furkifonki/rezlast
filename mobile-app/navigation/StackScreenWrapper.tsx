import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EDGE_WIDTH = 28;
const SWIPE_THRESHOLD = 50;

type StackScreenWrapperProps = {
  children: React.ReactNode;
  onGoBack: () => void;
  noTopPadding?: boolean;
};

export function StackScreenWrapper({ children, onGoBack, noTopPadding = false }: StackScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const startX = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: (evt) => {
          startX.current = evt.nativeEvent.pageX ?? 0;
          return false;
        },
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          const startXVal = startX.current;
          if (startXVal <= EDGE_WIDTH && gestureState.dx > 20) return true;
          return false;
        },
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
          const startXVal = startX.current;
          if (startXVal <= EDGE_WIDTH && gestureState.dx > 20) return true;
          return false;
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (startX.current <= EDGE_WIDTH && gestureState.dx > SWIPE_THRESHOLD) {
            onGoBack();
          }
        },
      }),
    [onGoBack]
  );

  return (
    <View style={[styles.wrapper, !noTopPadding && { paddingTop: insets.top }]} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8fafc' },
});
