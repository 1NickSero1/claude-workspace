import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const PAISES = ['México', 'Guatemala', 'Honduras', 'El Salvador', 'Colombia', 'Venezuela', 'Otro'];

export default function RegistroScreen({ navigation, route }) {
  const idioma = route?.params?.idioma || 'es';
  const [vista, setVista] = useState(null); // null=selección | 'registro' | 'login'
  const [form, setForm] = useState({ nombre: '', correo: '', pais: '', contrasena: '' });
  const [paisOpen, setPaisOpen] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const puedeRegistrar = form.nombre && form.correo && form.pais && form.contrasena;
  const puedeLogin = form.correo && form.contrasena;

  const irASiguiente = (nombre) => navigation.navigate('Estado', { nombre, idioma });

  const es = idioma === 'es';

  /* ── Pantalla de selección ─────────────────────────────── */
  if (!vista) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scroll}>

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {es ? 'Volver' : 'Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>
            {es ? '¿Cómo quieres continuar?' : 'How do you want to continue?'}
          </Text>
          <Text style={styles.subtitulo}>
            {es ? 'Elige la opción que más te convenga' : 'Choose the option that works best for you'}
          </Text>

          {/* Crear cuenta */}
          <TouchableOpacity style={styles.opcionCard} activeOpacity={0.85} onPress={() => setVista('registro')}>
            <View style={[styles.opcionIcon, { backgroundColor: '#f0e6ff' }]}>
              <Text style={styles.opcionEmoji}>👤</Text>
            </View>
            <View style={styles.opcionTexto}>
              <Text style={styles.opcionTitulo}>{es ? 'Crear cuenta' : 'Create account'}</Text>
              <Text style={styles.opcionDesc}>{es ? 'Guarda tu historial y preferencias' : 'Save your history and preferences'}</Text>
            </View>
            <Text style={styles.opcionArrow}>›</Text>
          </TouchableOpacity>

          {/* Iniciar sesión */}
          <TouchableOpacity style={styles.opcionCard} activeOpacity={0.85} onPress={() => setVista('login')}>
            <View style={[styles.opcionIcon, { backgroundColor: '#e6f0ff' }]}>
              <Text style={styles.opcionEmoji}>🔑</Text>
            </View>
            <View style={styles.opcionTexto}>
              <Text style={styles.opcionTitulo}>{es ? 'Iniciar sesión' : 'Log in'}</Text>
              <Text style={styles.opcionDesc}>{es ? 'Ya tienes una cuenta con nosotras' : 'You already have an account with us'}</Text>
            </View>
            <Text style={styles.opcionArrow}>›</Text>
          </TouchableOpacity>

          {/* Separador */}
          <View style={styles.separador}>
            <View style={styles.separadorLinea} />
            <Text style={styles.separadorTexto}>{es ? 'o continúa sin cuenta' : 'or continue without account'}</Text>
            <View style={styles.separadorLinea} />
          </View>

          {/* Modo anónimo */}
          <TouchableOpacity
            style={styles.anonimoCard}
            activeOpacity={0.85}
            onPress={() => irASiguiente('Usuaria')}
          >
            <Text style={styles.anonimoEmoji}>🔒</Text>
            <View style={styles.opcionTexto}>
              <Text style={styles.anonimoTitulo}>{es ? 'Modo anónimo' : 'Anonymous mode'}</Text>
              <Text style={styles.opcionDesc}>{es ? 'Sin nombre ni correo · Privacidad total' : 'No name or email · Full privacy'}</Text>
            </View>
            <Text style={[styles.opcionArrow, { color: '#C850C0' }]}>›</Text>
          </TouchableOpacity>

        </ScrollView>

        <View style={styles.watermark}>
          <View style={styles.watermarkCircle}><Text style={styles.watermarkInitials}>AL</Text></View>
          <Text style={styles.watermarkName}>Ana Laverde</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Formulario crear cuenta / iniciar sesión ──────────── */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.back} onPress={() => setVista(null)}>
            <Text style={styles.backText}>← {es ? 'Volver' : 'Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>
            {vista === 'registro'
              ? (es ? 'Crear cuenta' : 'Create account')
              : (es ? 'Iniciar sesión' : 'Log in')}
          </Text>

          <View style={styles.privacyBanner}>
            <Text style={styles.privacyText}>
              🔒 {es ? 'Tus datos están protegidos y nunca se comparten' : 'Your data is protected and never shared'}
            </Text>
          </View>

          {/* Nombre — solo en registro */}
          {vista === 'registro' && (
            <>
              <Text style={styles.label}>{es ? 'Nombre' : 'Name'}</Text>
              <TextInput
                style={styles.input}
                placeholder={es ? '¿Cómo te llamas?' : 'Your name'}
                placeholderTextColor="#aaa"
                value={form.nombre}
                onChangeText={v => update('nombre', v)}
              />
            </>
          )}

          <Text style={styles.label}>{es ? 'Correo electrónico' : 'Email'}</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.correo}
            onChangeText={v => update('correo', v)}
          />

          {/* País — solo en registro */}
          {vista === 'registro' && (
            <>
              <Text style={styles.label}>{es ? 'País de origen' : 'Country of origin'}</Text>
              <TouchableOpacity style={styles.input} onPress={() => setPaisOpen(!paisOpen)}>
                <Text style={form.pais ? styles.inputText : styles.placeholder}>
                  {form.pais || (es ? 'Selecciona tu país' : 'Select your country')}
                </Text>
              </TouchableOpacity>
              {paisOpen && (
                <View style={styles.dropdown}>
                  {PAISES.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={styles.dropdownItem}
                      onPress={() => { update('pais', p); setPaisOpen(false); }}
                    >
                      <Text style={styles.dropdownText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>{es ? 'Contraseña' : 'Password'}</Text>
          <TextInput
            style={styles.input}
            placeholder={es ? 'Mínimo 6 caracteres' : 'Minimum 6 characters'}
            placeholderTextColor="#aaa"
            secureTextEntry
            value={form.contrasena}
            onChangeText={v => update('contrasena', v)}
          />

          <TouchableOpacity
            style={[styles.boton, !(vista === 'registro' ? puedeRegistrar : puedeLogin) && styles.botonDisabled]}
            disabled={!(vista === 'registro' ? puedeRegistrar : puedeLogin)}
            onPress={() => irASiguiente(form.nombre || 'Usuaria')}
            activeOpacity={0.85}
          >
            <Text style={styles.botonText}>
              {vista === 'registro'
                ? (es ? 'Crear mi cuenta' : 'Create my account')
                : (es ? 'Entrar' : 'Log in')}
            </Text>
          </TouchableOpacity>

          {/* Cambiar entre registro y login */}
          <TouchableOpacity style={styles.switchModo} onPress={() => setVista(vista === 'registro' ? 'login' : 'registro')}>
            <Text style={styles.switchModoText}>
              {vista === 'registro'
                ? (es ? '¿Ya tienes cuenta? Iniciar sesión' : 'Already have an account? Log in')
                : (es ? '¿No tienes cuenta? Crear una' : "Don't have an account? Create one")}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.watermark}>
        <View style={styles.watermarkCircle}><Text style={styles.watermarkInitials}>AL</Text></View>
        <Text style={styles.watermarkName}>Ana Laverde</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 80 },
  back: { paddingTop: 16, marginBottom: 8 },
  backText: { color: '#C850C0', fontSize: 16 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  subtitulo: { fontSize: 14, color: '#888', marginBottom: 28 },
  opcionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#f0e0ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#C850C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  opcionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  opcionEmoji: { fontSize: 24 },
  opcionTexto: { flex: 1 },
  opcionTitulo: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  opcionDesc: { fontSize: 12, color: '#888' },
  opcionArrow: { fontSize: 24, color: '#C850C0', fontWeight: '300' },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  separadorLinea: { flex: 1, height: 1, backgroundColor: '#eee' },
  separadorTexto: { color: '#aaa', fontSize: 12 },
  anonimoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f4ff',
    borderWidth: 1.5,
    borderColor: '#e0d0f8',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  anonimoEmoji: { fontSize: 24 },
  anonimoTitulo: { fontSize: 16, fontWeight: '700', color: '#4A0E6E', marginBottom: 2 },
  privacyBanner: {
    backgroundColor: '#f0e6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  privacyText: { color: '#7b2d8b', fontSize: 13, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
  },
  inputText: { fontSize: 16, color: '#1a1a2e' },
  placeholder: { fontSize: 16, color: '#aaa' },
  dropdown: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownText: { fontSize: 16, color: '#1a1a2e' },
  boton: {
    backgroundColor: '#C850C0',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
  },
  botonDisabled: { backgroundColor: '#ddd' },
  botonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  switchModo: { alignItems: 'center', marginTop: 20 },
  switchModoText: { color: '#C850C0', fontSize: 14, fontWeight: '600' },
  watermark: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  watermarkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#C850C0', alignItems: 'center', justifyContent: 'center' },
  watermarkInitials: { color: '#fff', fontSize: 9, fontWeight: '800' },
  watermarkName: { fontSize: 10, color: '#888' },
});
