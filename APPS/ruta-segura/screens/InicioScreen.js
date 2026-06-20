import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const SERVICIOS = [
  { id: 'legal', icon: '⚖️', titulo: 'Asesoría Legal', desc: 'Dudas de asilo y derechos' },
  { id: 'psico', icon: '💜', titulo: 'Apoyo Psicológico', desc: 'Soporte emocional de crisis' },
  { id: 'fraude', icon: '⚠️', titulo: 'Alerta Fraudes', desc: 'Reportes de estafas en ruta' },
  { id: 'edu', icon: '📚', titulo: 'Educación', desc: 'Guías de supervivencia e integración' },
];

export default function InicioScreen({ navigation, route }) {
  const nombre = route?.params?.nombre || 'amiga';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.saludo}>Hola, {nombre} 👋</Text>
            <Text style={styles.subSaludo}>Estás en un lugar seguro</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nombre[0]?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Botón SOS */}
        <TouchableOpacity style={styles.sos} activeOpacity={0.85}>
          <Text style={styles.sosIcon}>🆘</Text>
          <View>
            <Text style={styles.sosTitle}>¿Emergencia?</Text>
            <Text style={styles.sosSubtitle}>Botón de pánico SOS</Text>
          </View>
          <Text style={styles.sosArrow}>›</Text>
        </TouchableOpacity>

        {/* Servicios */}
        <Text style={styles.seccionTitulo}>¿En qué te ayudamos hoy?</Text>
        <View style={styles.grid}>
          {SERVICIOS.map(s => (
            <TouchableOpacity
              key={s.id}
              style={styles.tarjeta}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MiCaso', { tipo: s.titulo })}
            >
              <Text style={styles.tarjetaIcon}>{s.icon}</Text>
              <Text style={styles.tarjetaTitulo}>{s.titulo}</Text>
              <Text style={styles.tarjetaDesc}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Módulo comunitario */}
        <View style={styles.comunidad}>
          <View style={styles.comunidadDot} />
          <Text style={styles.comunidadText}>12 mujeres en línea ahora · No estás sola</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f4ff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 24,
  },
  saludo: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  subSaludo: { fontSize: 14, color: '#888', marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C850C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sos: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  sosIcon: { fontSize: 32 },
  sosTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sosSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  sosArrow: { color: '#fff', fontSize: 28, marginLeft: 'auto' },
  seccionTitulo: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    shadowColor: '#C850C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tarjetaIcon: { fontSize: 32, marginBottom: 8 },
  tarjetaTitulo: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  tarjetaDesc: { fontSize: 12, color: '#888', lineHeight: 16 },
  comunidad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  comunidadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  comunidadText: { color: '#555', fontSize: 14 },
});
