import { StyleSheet, Text, View, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Watermark from '../components/Watermark';

const LINEAS = [
  {
    emoji: '🚨',
    titulo: 'Llamar al 911',
    sub: 'Policía · Bomberos · Ambulancia',
    numero: '911',
    urgente: true,
  },
  {
    emoji: '💜',
    titulo: 'Línea Nacional — Violencia Doméstica',
    sub: '1-800-799-7233 · 24/7 · En español',
    numero: '18007997233',
  },
  {
    emoji: '🤝',
    titulo: 'RAINN — Agresión Sexual',
    sub: '1-800-656-4673 · 24/7 · Confidencial',
    numero: '18006564673',
  },
  {
    emoji: '💬',
    titulo: 'Crisis Text Line',
    sub: 'Envía HOME al 741741 · En español · Texto',
    numero: '741741',
    esTexto: true,
  },
  {
    emoji: '🌐',
    titulo: 'ICE / Detención migratoria',
    sub: '1-888-498-3511 · ACLU línea de reportes',
    numero: '18884983511',
  },
];

export default function SOSScreen({ navigation, route }) {
  const { nombre, idioma, estado } = route?.params || {};

  const contactar = (l) => {
    if (l.esTexto) {
      Linking.openURL(`sms:${l.numero}?body=HOME`);
    } else {
      Linking.openURL(`tel:${l.numero}`);
    }
  };

  return (
    <LinearGradient colors={['#0d0008', '#6b0030', '#8B0045']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.headerBox, styles.maxContent]}>
          <Text style={styles.sosEmoji}>☎️</Text>
          <Text style={styles.titulo}>EMERGENCIA</Text>
          <Text style={styles.subtitulo}>
            {idioma === 'en'
              ? 'You are safe here.\nChoose who to call right now.'
              : 'Estás en un lugar seguro.\nElige a quién llamar ahora mismo.'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, styles.maxContent]} showsVerticalScrollIndicator={false}>
          {LINEAS.map((l, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.linea, l.urgente && styles.lineaUrgente]}
              activeOpacity={0.82}
              onPress={() => contactar(l)}
              accessibilityRole="button"
              accessibilityLabel={`${l.titulo}. ${l.sub}. ${l.esTexto ? (idioma === 'en' ? 'Send text message' : 'Enviar mensaje de texto') : (idioma === 'en' ? 'Call' : 'Llamar')}`}
            >
              <Text style={styles.lineaEmoji}>{l.emoji}</Text>
              <View style={styles.lineaTexto}>
                <Text style={[styles.lineaTitulo, l.urgente && styles.lineaTituloUrgente]}>
                  {l.titulo}
                </Text>
                <Text style={styles.lineaSub}>{l.sub}</Text>
              </View>
              <View style={[styles.lineaAccionBox, l.urgente && styles.lineaAccionBoxUrgente]}>
                <Text style={styles.lineaAccionText}>{l.esTexto ? '✉️' : '📞'}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.privacyBox}>
            <Text style={styles.privacyText}>
              🔒 {idioma === 'en'
                ? 'These calls are not stored in Ruta Segura'
                : 'Estas llamadas no quedan guardadas en Ruta Segura'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.registrarCaso}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('MiCaso', { nombre, idioma, estado })}
            accessibilityRole="button"
            accessibilityLabel={idioma === 'en' ? 'Register my case' : 'Registrar mi caso'}
          >
            <Text style={styles.registrarCasoText}>
              📝 {idioma === 'en' ? 'Register my case' : 'Registrar mi caso'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <Watermark opacity={0.85} textColor="rgba(255,255,255,0.8)" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  maxContent: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 4,
  },
  back: { paddingVertical: 8 },
  backText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
  headerBox: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 },
  sosEmoji: { fontSize: 52, marginBottom: 8 },
  titulo: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 10 },
  linea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lineaUrgente: {
    backgroundColor: '#c0392b',
    borderColor: '#e74c3c',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lineaEmoji: { fontSize: 28 },
  lineaTexto: { flex: 1 },
  lineaTitulo: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  lineaTituloUrgente: { fontSize: 16 },
  lineaSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 16 },
  lineaAccionBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  lineaAccionBoxUrgente: { backgroundColor: 'rgba(255,255,255,0.25)' },
  lineaAccionText: { fontSize: 20 },
  privacyBox: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  privacyText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' },
  registrarCaso: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  registrarCasoText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
