import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  name: string;
};

export default function InAppMap({ latitude, longitude, name }: Props) {
  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        scrollEnabled
        zoomEnabled
      >
        <Marker coordinate={{ latitude, longitude }} title={name} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
