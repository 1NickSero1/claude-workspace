import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

const CATEGORIAS = [
  {
    id: 'comunidad',
    emoji: '🏘️',
    titulo: 'Ayudas comunitarias',
    desc: 'Foros de apoyo, recursos locales y mentoría',
    color: '#1a6b5a',
    light: '#e6f5f1',
  },
  {
    id: 'alimentacion',
    imagen: require('../assets/gavel-icon.png'),
    titulo: 'Demandas por alimentación',
    desc: 'Bancos de comida, SNAP/WIC y ONGs verificadas',
    color: '#7a5c00',
    light: '#fdf6e3',
  },
  {
    id: 'legal',
    emoji: '⚖️',
    titulo: 'Legal',
    desc: 'Abogadas pro-bono, formularios y traducción',
    color: '#3d3580',
    light: '#eeecf8',
  },
  {
    id: 'social',
    emoji: '🫂',
    titulo: 'Social',
    desc: 'Cápsulas educativas, eventos y embajadoras',
    color: '#6b2050',
    light: '#f9eaf4',
  },
  {
    id: 'violencia',
    emoji: '💜',
    titulo: 'Violencia de género',
    desc: 'SOS 24/7, refugios seguros y apoyo emocional',
    color: '#8B0045',
    light: '#fdf0f5',
  },
];

export default function MenuPrincipalScreen({ navigation, route }) {
  const { nombre, idioma, estado } = route?.params || {};
  const [mujeres, setMujeres] = useState(() => Math.floor(Math.random() * 15) + 8);

  useFocusEffect(
    useCallback(() => {
      setMujeres(Math.floor(Math.random() * 15) + 8);
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Barra superior */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.sosMini}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SOS', { idioma, nombre, estado })}
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
              {cat.imagen
                ? <Image source={cat.imagen} style={styles.cardImage} />
                : <Text style={styles.cardEmoji}>{cat.emoji}</Text>
              }
            </View>
            <View style={styles.cardTexto}>
              <Text style={styles.cardTitulo}>{cat.titulo}</Text>
              <Text style={styles.cardDesc}>{cat.desc}</Text>
            </View>
            <Text style={[styles.cardArrow, { color: cat.color }]}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Módulo comunitario */}
        <View style={styles.comunidad}>
          <View style={styles.dot} />
          <Text style={styles.comunidadText}>{mujeres} mujeres en línea ahora · No estás sola</Text>
        </View>

      </ScrollView>

      <View style={styles.watermark}>
        <View style={styles.watermarkCircle}>
          <Text style={styles.watermarkInitials}>AL</Text>
        </View>
        <Text style={styles.watermarkName}>Ana Laverde</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f4ff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
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
  cardDesc: { fontSize: 12, color: '#888', lineHeight: 16 },
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
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  watermarkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#C850C0', alignItems: 'center', justifyContent: 'center' },
  watermarkInitials: { color: '#fff', fontSize: 9, fontWeight: '800' },
  watermarkName: { fontSize: 10, color: '#888' },
});
