import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CATEGORIAS } from '../data/categorias';
import Watermark from '../components/Watermark';

export default function MenuPrincipalScreen({ navigation, route }) {
  const { nombre, idioma, estado } = route?.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.scroll, styles.maxContent]}>

        {/* Barra superior */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.sosMini}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SOS', { idioma, nombre, estado })}
            accessibilityRole="button"
            accessibilityLabel={idioma === 'en' ? 'Emergency, go to SOS screen' : 'Emergencia, ir a pantalla SOS'}
          >
            <Text style={styles.sosMiniEmoji}>🚨</Text>
            <Text style={styles.sosMiniLabel}>SOS</Text>
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(nombre || 'A')[0].toUpperCase()}</Text>
          </View>
        </View>

        {/* Saludo */}
        <View style={styles.saludo}>
          <Text style={styles.saludoTexto}>Hola, {nombre || 'amiga'}</Text>
          <Text style={styles.estadoTexto}>📍 {estado}</Text>
        </View>

        {/* Categorías */}
        <Text style={styles.seccion}>
          {idioma === 'en' ? '5 areas of help' : '5 áreas de ayuda'}
        </Text>

        {CATEGORIAS.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Categoria', { id: cat.id, idioma, estado, nombre })}
          >
            <View style={[styles.cardIcon, { backgroundColor: cat.light }]}>
              <Text style={styles.cardEmoji}>{cat.emoji}</Text>
            </View>
            <View style={styles.cardTexto}>
              <Text style={styles.cardTitulo}>{cat.titulo}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{cat.desc}</Text>
            </View>
            <Text style={[styles.cardArrow, { color: cat.color }]}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Módulo comunitario */}
        <View style={styles.comunidad}>
          <View style={styles.dot} />
          <Text style={styles.comunidadText}>Estás en un espacio seguro · No estás sola</Text>
        </View>

      </ScrollView>

      <Watermark />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f4ff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  maxContent: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 16,
  },
  sosMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8B0045',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 44,
    borderRadius: 22,
    shadowColor: '#8B0045',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  sosMiniEmoji: { fontSize: 14 },
  sosMiniLabel: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C850C0',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  saludo: { marginBottom: 20 },
  saludoTexto: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  estadoTexto: { fontSize: 13, color: '#888', marginTop: 4 },
  seccion: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 26 },
  cardImage: { width: 34, height: 34, resizeMode: 'contain' },
  cardTexto: { flex: 1 },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#888', lineHeight: 16, minHeight: 32 },
  cardArrow: { fontSize: 24, fontWeight: '300' },
  comunidad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  comunidadText: { color: '#555', fontSize: 14 },
});
