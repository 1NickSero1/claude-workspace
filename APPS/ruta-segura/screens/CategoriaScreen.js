import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getCategoria } from '../data/categorias';

export default function CategoriaScreen({ navigation, route }) {
  const { id, idioma, estado } = route?.params || {};
  const data = getCategoria(id);

  const handlePress = (s) => {
    if (s.esAna) return Linking.openURL('https://wa.me/17542758005?text=Hola%20necesito%20ayuda');
    if (s.urgente) return navigation.navigate('SOS', { nombre: route?.params?.nombre, idioma, estado });
    navigation.navigate('MiCaso', { tipo: s.titulo, nombre: route?.params?.nombre, idioma, estado, color: data.color });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: data.color }]}>
      <StatusBar style="light" />

      {/* Header de color */}
      <View style={[styles.header, { backgroundColor: data.color }]}>
        <View style={styles.maxContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerEmoji}>{data.emoji}</Text>
            <View style={styles.headerTextos}>
              <Text style={styles.headerTitulo}>{data.titulo}</Text>
              {estado && <Text style={styles.headerEstado}>📍 {estado}</Text>}
            </View>
          </View>
          {data.subtitulo && <Text style={styles.headerSub}>{data.subtitulo}</Text>}
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={[styles.scroll, styles.maxContent]}>
          {data.secciones.map((s, i) => (
            <View key={i} style={[styles.card, s.urgente && [styles.cardUrgente, { borderColor: data.color }]]}>
              {s.urgente && (
                <View style={[styles.cardUrgenteHeader, { backgroundColor: data.color }]}>
                  <Text style={styles.cardUrgenteHeaderText}>⚡ AYUDA INMEDIATA DISPONIBLE</Text>
                </View>
              )}
              <View style={[styles.cardBody, s.urgente && styles.cardBodyUrgente]}>
                <View style={[styles.cardIconWrap, { backgroundColor: s.urgente ? `${data.color}18` : data.light }]}>
                  <Text style={styles.cardEmoji}>{s.emoji}</Text>
                </View>
                <Text style={[styles.cardTitulo, s.urgente && { color: data.color, fontSize: 20 }]}>{s.titulo}</Text>
                <Text style={styles.cardSub}>{s.sub}</Text>
                <Text style={styles.cardDesc}>{s.desc}</Text>
                <TouchableOpacity
                  style={[styles.cardBtn, s.esAna ? styles.cardBtnAna : { backgroundColor: data.color }, s.urgente && styles.cardBtnUrgente]}
                  activeOpacity={0.85}
                  onPress={() => handlePress(s)}
                >
                  <Text style={[styles.cardBtnText, s.esAna && styles.cardBtnAnaText]}>{s.accion}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.watermark}>
          <View style={styles.watermarkLogoWrap}>
            <Image source={require('../assets/ana-laverde-logo-circle.png')} style={styles.watermarkLogo} />
          </View>
          <Text style={styles.watermarkName}>Ana Laverde</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  maxContent: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  body: { flex: 1, backgroundColor: '#f8f4ff' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  back: { alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  headerTextos: { flex: 1 },
  headerEmoji: { fontSize: 48 },
  headerImage: { width: 56, height: 56, resizeMode: 'contain', tintColor: '#fff' },
  headerTitulo: { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 32 },
  headerEstado: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 3 },
  headerSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  scroll: { padding: 20, gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardUrgente: {
    borderWidth: 2,
    elevation: 6,
    shadowOpacity: 0.14,
  },
  cardUrgenteHeader: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cardUrgenteHeaderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardBody: { padding: 20 },
  cardBodyUrgente: { paddingTop: 16 },
  cardIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  cardEmoji: { fontSize: 28 },
  cardTitulo: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 2 },
  cardSub: { fontSize: 13, color: '#888', marginBottom: 10 },
  cardDesc: { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 16 },
  cardBtn: {
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: 'center',
  },
  cardBtnUrgente: {
    paddingVertical: 15,
    borderRadius: 14,
  },
  cardBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardBtnAna: { borderWidth: 2, borderColor: '#C850C0', backgroundColor: 'transparent' },
  cardBtnAnaText: { color: '#C850C0' },
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  watermarkLogoWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden' },
  watermarkLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  watermarkName: { fontSize: 10, color: '#888' },
});
