import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const IDIOMAS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export default function OnboardingScreen({ navigation }) {
  const [idioma, setIdioma] = useState('es');

  const t = idioma === 'es'
    ? {
        bienvenida: 'Aquí no caminas sola 💜',
        tagline: 'Tu red de apoyo para mujeres migrantes.',
        boton: 'Quiero encontrar ayuda →',
        emergencia: 'SOS',
      }
    : {
        bienvenida: "You don't walk alone here 💜",
        tagline: 'Your support network for migrant women.',
        boton: 'I want to find help →',
        emergencia: 'SOS',
      };

  return (
    <LinearGradient colors={['#0d0221', '#4A0E6E', '#8B1A6B']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Barra superior */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.sosMini}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SOS', { idioma, nombre: '', estado: '' })}
            accessibilityRole="button"
            accessibilityLabel={idioma === 'en' ? 'Emergency, go to SOS screen' : 'Emergencia, ir a pantalla SOS'}
          >
            <Text style={styles.sosMiniEmoji}>🚨</Text>
            <Text style={styles.sosMiniLabel}>{t.emergencia}</Text>
          </TouchableOpacity>

          <View style={styles.idiomas}>
            {IDIOMAS.map(i => (
              <TouchableOpacity
                key={i.code}
                style={[styles.idiomaBtn, idioma === i.code && styles.idiomaBtnActivo]}
                onPress={() => setIdioma(i.code)}
              >
                <Text style={[styles.idiomaText, idioma === i.code && styles.idiomaTextActivo]}>
                  {i.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Ícono arriba */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎀</Text>
          </View>

          {/* Espaciador superior — empuja texto hacia el centro */}
          <View style={{ flex: 1 }} />

          {/* Texto centrado */}
          <View style={styles.textGroup}>
            <Text style={styles.bienvenida}>{t.bienvenida}</Text>
            <Text style={styles.title}>Ruta Segura</Text>
            <Text style={styles.tagline}>{t.tagline}</Text>
          </View>

          {/* Botón separado con espacio generoso */}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Registro', { idioma })}
          >
            <Text style={styles.buttonText}>{t.boton}</Text>
          </TouchableOpacity>

          {/* Espaciador inferior igual al superior = texto centrado */}
          <View style={{ flex: 1 }} />
        </View>

        {/* WhatsApp — fondo izquierdo */}
        <TouchableOpacity
          style={styles.whatsappBtn}
          activeOpacity={0.75}
          onPress={() => Linking.openURL('https://wa.me/17542758005?text=Hola%20necesito%20ayuda')}
          accessibilityRole="button"
          accessibilityLabel={idioma === 'en' ? 'Contact us on WhatsApp' : 'Contactar por WhatsApp'}
        >
          <Image
            source={require('../assets/whatsapp-icon.png')}
            style={styles.whatsappIcon}
          />
        </TouchableOpacity>

        {/* Watermark — fondo derecho */}
        <View style={styles.watermark}>
          <View style={styles.watermarkLogoWrap}>
            <Image source={require('../assets/ana-laverde-logo-circle.png')} style={styles.watermarkLogo} />
          </View>
          <Text style={[styles.watermarkName, { color: 'rgba(255,255,255,0.6)' }]}>Ana Laverde</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
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
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  sosMiniEmoji: { fontSize: 14 },
  sosMiniLabel: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  idiomas: { flexDirection: 'row', gap: 8 },
  idiomaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  idiomaBtnActivo: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: '#fff' },
  idiomaText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  idiomaTextActivo: { color: '#fff' },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 140,
    paddingBottom: 90,
  },
  textGroup: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: { fontSize: 40 },
  bienvenida: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 22,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 36,
    marginBottom: 20,
    shadowColor: '#8B1A6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: { color: '#4A0E6E', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  whatsappBtn: { position: 'absolute', bottom: 20, left: 24 },
  whatsappIcon: { width: 52, height: 52, borderRadius: 26 },
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  watermarkLogoWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 2, overflow: 'hidden' },
  watermarkLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  watermarkName: { fontSize: 10 },
});
