import { View, Text, Image, StyleSheet } from 'react-native';

export default function Watermark({ opacity = 0.6, textColor = '#888' }) {
  return (
    <View style={[styles.watermark, { opacity }]}>
      <View style={styles.watermarkLogoWrap}>
        <Image source={require('../assets/ana-laverde-logo-circle.png')} style={styles.watermarkLogo} />
      </View>
      <Text style={[styles.watermarkName, { color: textColor }]}>Ana Laverde</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  watermarkLogoWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden' },
  watermarkLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  watermarkName: { fontSize: 10 },
});
