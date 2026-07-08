import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Switch, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const CHIPS = ['Legal', 'Psicológica', 'Documentos', 'Vivienda', 'Salud', 'Otro'];

export default function MiCasoScreen({ navigation, route }) {
  const { tipo, nombre, idioma, estado } = route?.params || {};
  const tipoInicial = tipo?.split(' ')[0] || '';
  const [chipActivo, setChipActivo] = useState(tipoInicial);
  const [descripcion, setDescripcion] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const puedeEnviar = chipActivo && descripcion.length > 10;

  if (enviado) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.exito}>
          <Text style={styles.exitoIcon}>✅</Text>
          <Text style={styles.exitoTitulo}>¡Recibido!</Text>
          <Text style={styles.exitoTexto}>
            Una voluntaria verificada revisará tu caso{'\n'}en menos de 24 horas.
          </Text>
          <TouchableOpacity style={styles.boton} onPress={() => navigation.navigate('MenuPrincipal', { nombre, idioma, estado })}>
            <Text style={styles.botonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>Mi Caso</Text>
          <Text style={styles.subtitulo}>Cuéntanos cómo podemos ayudarte</Text>

          {/* Chips de tipo */}
          <Text style={styles.label}>Tipo de ayuda que necesitas</Text>
          <View style={styles.chips}>
            {CHIPS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, chipActivo === c && styles.chipActivo]}
                onPress={() => setChipActivo(c)}
              >
                <Text style={[styles.chipText, chipActivo === c && styles.chipTextActivo]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Descripción */}
          <Text style={styles.label}>Describe tu situación</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={5}
            placeholder="Cuéntanos qué está pasando. Puedes escribir en tu idioma."
            placeholderTextColor="#aaa"
            value={descripcion}
            onChangeText={setDescripcion}
            textAlignVertical="top"
          />

          {/* Toggle anónimo */}
          <View style={styles.anonimoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.anonimoTitulo}>Modo anónimo</Text>
              <Text style={styles.anonimoDesc}>Tu nombre no será visible para la voluntaria</Text>
            </View>
            <Switch
              value={anonimo}
              onValueChange={setAnonimo}
              trackColor={{ false: '#ddd', true: '#C850C0' }}
              thumbColor="#fff"
            />
          </View>

          {anonimo && (
            <View style={styles.anonimoBanner}>
              <Text style={styles.anonimoBannerText}>🔒 Modo anónimo activado — tu identidad está protegida</Text>
            </View>
          )}

          <View style={styles.compromisoBox}>
            <Text style={styles.compromisoText}>⏱ Respuesta garantizada en menos de 24 horas por una voluntaria verificada</Text>
          </View>

          <TouchableOpacity
            style={[styles.boton, !puedeEnviar && styles.botonDisabled]}
            disabled={!puedeEnviar}
            onPress={() => setEnviado(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.botonText}>Enviar mi caso</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

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
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  back: { paddingTop: 16, marginBottom: 8 },
  backText: { color: '#C850C0', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  subtitulo: { fontSize: 15, color: '#888', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 10, marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActivo: { backgroundColor: '#C850C0', borderColor: '#C850C0' },
  chipText: { color: '#666', fontSize: 14 },
  chipTextActivo: { color: '#fff', fontWeight: '700' },
  textarea: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
    minHeight: 120,
  },
  anonimoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f4ff',
    borderRadius: 14,
  },
  anonimoTitulo: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  anonimoDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  anonimoBanner: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  anonimoBannerText: { color: '#2e7d32', fontSize: 13, textAlign: 'center' },
  compromisoBox: {
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  compromisoText: { color: '#f57f17', fontSize: 13, textAlign: 'center' },
  boton: {
    backgroundColor: '#C850C0',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
  },
  botonDisabled: { backgroundColor: '#ddd' },
  botonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  exito: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  exitoIcon: { fontSize: 72, marginBottom: 24 },
  exitoTitulo: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 12 },
  exitoTexto: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  watermarkLogoWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden' },
  watermarkLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  watermarkName: { fontSize: 10, color: '#888' },
});
