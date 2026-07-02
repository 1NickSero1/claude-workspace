import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const CONTENIDO = {
  comunidad: {
    titulo: 'Ayudas comunitarias',
    subtitulo: 'Aquí hay mujeres que ya pasaron por lo mismo.\nEncontrarás apoyo real, sin juzgarte.',
    emoji: '⚖️',
    color: '#1a6b5a',
    light: '#e6f5f1',
    secciones: [
      {
        emoji: '💬',
        titulo: 'Foros de apoyo',
        sub: 'Por etapa migratoria',
        desc: 'Conecta con mujeres en tu misma etapa: recién llegada, en tránsito o ya establecida. No estás sola.',
        accion: 'Unirme a un foro',
      },
      {
        emoji: '📍',
        titulo: 'Recursos cerca de ti',
        sub: 'Mapa local verificado',
        desc: 'Consulados, clínicas pro-bono, iglesias de ayuda y refugios actualizados en tu estado.',
        accion: 'Ver mapa de recursos',
      },
      {
        emoji: '🌟',
        titulo: 'Mentoría',
        sub: 'Mujer a mujer · Sin costo',
        desc: 'Habla con una mujer que ya pasó por lo mismo. Voluntarias verificadas, disponibles hoy.',
        accion: 'Pedir una mentora',
      },
      {
        emoji: '📚',
        titulo: 'Cursos de inglés',
        sub: 'Gratuitos · En tu área',
        desc: 'Clases de inglés para migrantes. Presenciales y online, sin costo. Certificados reconocidos.',
        accion: 'Ver cursos disponibles',
      },
    ],
  },
  violencia: {
    titulo: 'Violencia de género',
    subtitulo: 'Estás en un lugar seguro.\nAquí encontrarás ayuda real, confidencial y sin juicios.',
    emoji: '💜',
    color: '#8B0045',
    light: '#fdf0f5',
    secciones: [
      {
        emoji: '🚨',
        titulo: 'Botón SOS',
        sub: 'Emergencia 24/7',
        desc: 'Alerta inmediata a voluntarias de turno y línea de emergencia local. Completamente confidencial.',
        accion: 'AYUDA INMEDIATA',
        urgente: true,
      },
      {
        emoji: '🏠',
        titulo: 'Refugios seguros',
        sub: 'Cercanos a ti',
        desc: 'Lista de casas de acogida y refugios verificados en tu estado. Disponibles ahora.',
        accion: 'Ver refugios cerca',
      },
      {
        emoji: '💗',
        titulo: 'Apoyo emocional',
        sub: 'Bilingüe · Sin costo',
        desc: 'Habla con una psicóloga bilingüe. Confidencial. Respuesta en menos de 24 horas.',
        accion: 'Pedir apoyo',
      },
    ],
  },
  alimentacion: {
    titulo: 'Demandas por alimentación',
    subtitulo: 'Sin importar tu estatus migratorio,\ntienes derecho a comer. Aquí encontramos recursos sin preguntas.',
    imagen: require('../assets/gavel-icon.png'),
    color: '#7a5c00',
    light: '#fdf6e3',
    secciones: [
      {
        emoji: '🥫',
        titulo: 'Bancos de comida',
        sub: 'Cerca de ti',
        desc: 'Directorio actualizado de bancos de alimentos, despensas comunitarias y comedores.',
        accion: 'Buscar bancos',
      },
      {
        emoji: '🍎',
        titulo: 'SNAP / WIC',
        sub: 'Guía y aplicación',
        desc: 'Te explicamos paso a paso cómo aplicar a los programas de asistencia alimentaria del gobierno.',
        accion: 'Guía SNAP/WIC',
      },
      {
        emoji: '🏢',
        titulo: 'ONGs',
        sub: 'Por ciudad',
        desc: 'Organizaciones no gubernamentales que ofrecen despensas y comidas calientes sin documentos.',
        accion: 'Ver ONGs',
      },
    ],
  },
  legal: {
    titulo: 'Legal',
    subtitulo: 'Conoce tus derechos.\nAbogadas verificadas, sin costo. Tu situación tiene solución legal.',
    emoji: '⚖️',
    color: '#3d3580',
    light: '#eeecf8',
    secciones: [
      {
        emoji: '👩‍⚖️',
        titulo: 'Abogadas verificadas',
        sub: 'Pro-bono · Sin costo',
        desc: 'Red de abogadas con licencia verificada en el State Bar. Especializadas en inmigración y asilo.',
        accion: 'Encontrar mi abogada',
      },
      {
        emoji: '📋',
        titulo: 'Formularios listos',
        sub: 'Asilo · DACA · Trabajo',
        desc: 'Formularios pre-llenados con instrucciones en español. Asilo, DACA y permisos de trabajo.',
        accion: 'Ver formularios',
      },
      {
        emoji: '🌐',
        titulo: 'Traducción de documentos',
        sub: 'Bilingüe · Confidencial',
        desc: 'Voluntarias bilingües te ayudan a traducir documentos oficiales. Servicio verificado y sin costo.',
        accion: 'Solicitar traducción',
      },
    ],
  },
  social: {
    titulo: 'Social',
    subtitulo: 'Aprende, conéctate y crece.\nAquí tienes herramientas para empoderarte y no depender de nadie.',
    emoji: '🫂',
    color: '#6b2050',
    light: '#f9eaf4',
    secciones: [
      {
        emoji: '🎓',
        titulo: 'Cápsulas educativas',
        sub: 'Aprende a tu ritmo',
        desc: 'Videos cortos sobre tus derechos, cómo navegar el sistema de salud y cómo integrarte.',
        accion: 'Ver cápsulas',
      },
      {
        emoji: '📅',
        titulo: 'Eventos',
        sub: 'Encuentros',
        desc: 'Talleres, ferias de recursos y encuentros comunitarios en tu área.',
        accion: 'Ver eventos',
      },
      {
        emoji: '💜',
        titulo: 'Embajadoras',
        sub: 'Programa',
        desc: '¿Quieres ayudar a otras? Únete al programa de embajadoras y marca la diferencia.',
        accion: 'Ser embajadora',
      },
      {
        emoji: '🏛️',
        titulo: 'Consulados',
        sub: 'Tu país en EE.UU.',
        desc: 'Directorio de consulados latinoamericanos por estado. Documentos, emergencias y servicios consulares.',
        accion: 'Encontrar mi consulado',
      },
      {
        emoji: '👩‍💼',
        titulo: 'Ana Laverde',
        sub: 'Asesora de inmigración',
        desc: 'Recursos especializados de inmigración. Consultas personalizadas disponibles para tu situación.',
        accion: 'Contacta a Ana Laverde →',
        esAna: true,
      },
    ],
  },
};

export default function CategoriaScreen({ navigation, route }) {
  const { id, idioma, estado } = route?.params || {};
  const data = CONTENIDO[id] || CONTENIDO.comunidad;

  const handlePress = (s) => {
    if (s.esAna) return Linking.openURL('https://wa.me/17542758005?text=Hola%20necesito%20ayuda');
    if (s.urgente) return navigation.navigate('SOS', { nombre: route?.params?.nombre, idioma, estado });
    navigation.navigate('MiCaso', { tipo: s.titulo, nombre: route?.params?.nombre, idioma, estado });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: data.color }]}>
      <StatusBar style="light" />

      {/* Header de color */}
      <View style={[styles.header, { backgroundColor: data.color }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRow}>
          {data.imagen
            ? <Image source={data.imagen} style={styles.headerImage} />
            : <Text style={styles.headerEmoji}>{data.emoji}</Text>
          }
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>{data.titulo}</Text>
            {estado && <Text style={styles.headerEstado}>📍 {estado}</Text>}
          </View>
        </View>
        {data.subtitulo && <Text style={styles.headerSub}>{data.subtitulo}</Text>}
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.scroll}>
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
          <View style={styles.watermarkCircle}>
            <Text style={styles.watermarkInitials}>AL</Text>
          </View>
          <Text style={styles.watermarkName}>Ana Laverde</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  watermarkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#C850C0', alignItems: 'center', justifyContent: 'center' },
  watermarkInitials: { color: '#fff', fontSize: 9, fontWeight: '800' },
  watermarkName: { fontSize: 10, color: '#888' },
});
