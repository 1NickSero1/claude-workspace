import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const ESTADOS = [
  { nombre: 'California', emoji: '🌉', ciudad: 'Los Ángeles · San Francisco · San Diego' },
  { nombre: 'Florida', emoji: '🌴', ciudad: 'Miami · Orlando · Tampa' },
  { nombre: 'Georgia · Mississippi · Alabama · Carolina', emoji: '🌳', ciudad: 'Atlanta · Jackson · Birmingham · Charlotte · Columbia' },
  { nombre: 'New York', emoji: '🗽', ciudad: 'Nueva York · Buffalo · Rochester · Boston' },
  { nombre: 'Texas', emoji: '⭐', ciudad: 'Houston · Dallas · San Antonio' },
  { nombre: '¿Otro estado diferente?', emoji: '🗺️', ciudad: 'Cuéntanos dónde estás', esOtro: true },
];

const OTROS_ESTADOS = [
  { nombre: 'Illinois', emoji: '🏙️', ciudad: 'Chicago · Aurora' },
  { nombre: 'Carolinas', emoji: '🌲', ciudad: 'Charlotte · Raleigh · Columbia' },
  { nombre: 'Nevada', emoji: '✨', ciudad: 'Las Vegas · Reno' },
  { nombre: 'New Jersey', emoji: '🌆', ciudad: 'Newark · Jersey City' },
  { nombre: 'Washington', emoji: '🌲', ciudad: 'Seattle · Tacoma' },
];

export default function EstadoScreen({ navigation, route }) {
  const { nombre, idioma } = route?.params || {};
  const [modalVisible, setModalVisible] = useState(false);
  const [otroEstado, setOtroEstado] = useState('');

  const t = idioma === 'en'
    ? { titulo: 'Which US State are you in? 🇺🇸', sub: 'We will show you resources near you', btn: 'Select state', escribe: 'Or write your state...', confirmar: 'Confirm', otrosTitulo: 'Choose your state' }
    : { titulo: '¿En qué Estado estás? 🇺🇸', sub: 'Te mostraremos recursos cerca de ti', btn: 'Seleccionar estado', escribe: 'O escribe tu estado...', confirmar: 'Confirmar', otrosTitulo: 'Elige tu estado' };

  const irAMenuPrincipal = (estado) => {
    navigation.navigate('MenuPrincipal', { nombre, idioma, estado });
    setModalVisible(false);
    setOtroEstado('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.titulo}>{t.titulo}</Text>
        <Text style={styles.subtitulo}>{t.sub}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.lista}>
          {ESTADOS.map(e => (
            <TouchableOpacity
              key={e.nombre}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => e.esOtro ? setModalVisible(true) : irAMenuPrincipal(e.nombre)}
            >
              <LinearGradient
                colors={e.esOtro ? ['rgba(139,0,69,0.5)', 'rgba(74,14,110,0.5)'] : ['#7b2d50', '#5c1f3c']}
                style={[styles.cardGradient, e.esOtro && styles.cardGradientOtro]}
              >
                <Text style={styles.cardEmoji}>{e.emoji}</Text>
                <View style={styles.cardTexto}>
                  <Text style={[styles.cardNombre, e.esOtro && styles.cardNombreOtro]}>{e.nombre}</Text>
                  <Text style={styles.cardCiudad}>{e.ciudad}</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.nota}>
          {idioma === 'en'
            ? '📍 Your location is not stored'
            : '📍 Tu ubicación no es almacenada'}
        </Text>
      </ScrollView>

      {/* Modal — Otro estado */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <TouchableOpacity activeOpacity={1} style={styles.modalPanel}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitulo}>{t.otrosTitulo}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {OTROS_ESTADOS.map(e => (
                <TouchableOpacity
                  key={e.nombre}
                  style={styles.modalCard}
                  activeOpacity={0.8}
                  onPress={() => irAMenuPrincipal(e.nombre)}
                >
                  <Text style={styles.modalEmoji}>{e.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalNombre}>{e.nombre}</Text>
                    <Text style={styles.modalCiudad}>{e.ciudad}</Text>
                  </View>
                  <Text style={styles.modalArrow}>›</Text>
                </TouchableOpacity>
              ))}

              <TextInput
                style={styles.modalInput}
                placeholder={t.escribe}
                placeholderTextColor="#aaa"
                value={otroEstado}
                onChangeText={setOtroEstado}
                returnKeyType="done"
                onSubmitEditing={() => otroEstado.trim() && irAMenuPrincipal(otroEstado.trim())}
              />

              {otroEstado.length > 0 && (
                <TouchableOpacity
                  style={styles.modalBtn}
                  activeOpacity={0.85}
                  onPress={() => irAMenuPrincipal(otroEstado.trim())}
                >
                  <Text style={styles.modalBtnText}>{t.confirmar}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.watermark}>
        <View style={styles.watermarkLogoWrap}>
          <Image source={require('../assets/ana-laverde-logo.png')} style={styles.watermarkLogo} />
        </View>
        <Text style={styles.watermarkName}>Ana Laverde</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f4ff' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  titulo: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  subtitulo: { fontSize: 15, color: '#888' },
  lista: { paddingHorizontal: 20, gap: 12 },
  card: { borderRadius: 16, overflow: 'hidden' },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  cardEmoji: { fontSize: 32 },
  cardTexto: { flex: 1 },
  cardNombre: { fontSize: 18, fontWeight: '800', color: '#fff' },
  cardCiudad: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardArrow: { color: '#fff', fontSize: 28 },
  scroll: { paddingBottom: 80 },
  nota: { textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 28, paddingHorizontal: 24 },
  cardGradientOtro: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  cardNombreOtro: { fontStyle: 'italic', fontSize: 15 },
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  watermarkLogoWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden' },
  watermarkLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  watermarkName: { fontSize: 10, color: '#888' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitulo: {
    fontSize: 20, fontWeight: '800', color: '#1a1a2e',
    marginBottom: 16,
  },
  modalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  modalEmoji: { fontSize: 24 },
  modalNombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  modalCiudad: { fontSize: 12, color: '#888', marginTop: 1 },
  modalArrow: { fontSize: 22, color: '#C850C0' },
  modalInput: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#e0d0f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
  },
  modalBtn: {
    marginTop: 12,
    backgroundColor: '#C850C0',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
