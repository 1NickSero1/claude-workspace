import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

// ── PDF HTML content ──────────────────────────────────────────────────────────

const buildPdfHtml = (): string => `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fff;
    color: #1A1A2E;
    padding: 40px;
    font-size: 14px;
    line-height: 1.6;
  }
  .cover {
    text-align: center;
    padding: 60px 20px 40px;
    border-bottom: 3px solid #6C5CE7;
    margin-bottom: 40px;
  }
  .cover .logo { font-size: 52px; margin-bottom: 12px; }
  .cover h1 { font-size: 34px; font-weight: 900; color: #6C5CE7; margin-bottom: 8px; }
  .cover .subtitle { font-size: 16px; color: #6B7280; }
  .cover .version { margin-top: 16px; font-size: 12px; color: #B0B7C3; }

  h2 {
    font-size: 20px;
    font-weight: 800;
    color: #6C5CE7;
    margin: 32px 0 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #EDE9FF;
  }
  h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1A1A2E;
    margin: 20px 0 8px;
  }
  p { margin-bottom: 10px; color: #374151; }

  .step {
    background: #F9FAFB;
    border-left: 4px solid #6C5CE7;
    border-radius: 0 8px 8px 0;
    padding: 14px 18px;
    margin: 10px 0;
  }
  .step .num {
    display: inline-block;
    background: #6C5CE7;
    color: #fff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    text-align: center;
    line-height: 24px;
    font-weight: 800;
    font-size: 13px;
    margin-right: 10px;
  }
  .step .label { font-weight: 600; }

  .tip {
    background: #E3FAF4;
    border: 1px solid #00C896;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 10px 0;
    font-size: 13px;
    color: #065F46;
  }
  .tip::before { content: "💡 "; }

  .warn {
    background: #FFF8E3;
    border: 1px solid #F59E0B;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 10px 0;
    font-size: 13px;
    color: #92400E;
  }
  .warn::before { content: "⚠️ "; }

  .chat-example {
    background: #F3F0FF;
    border-radius: 12px;
    padding: 16px 20px;
    margin: 12px 0;
    font-family: monospace;
    font-size: 13px;
    color: #4C1D95;
    border: 1px solid #DDD6FE;
  }
  .chat-example .prefix { font-weight: 700; }

  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #EDE9FF; color: #6C5CE7; padding: 10px 14px; text-align: left; font-size: 13px; }
  td { padding: 9px 14px; border-bottom: 1px solid #F3F4F6; font-size: 13px; }
  tr:last-child td { border-bottom: none; }

  .footer {
    margin-top: 60px;
    padding-top: 20px;
    border-top: 1px solid #E4E7EF;
    text-align: center;
    color: #B0B7C3;
    font-size: 12px;
  }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- ── PORTADA ── -->
<div class="cover">
  <div class="logo">💼</div>
  <h1>Wallet Control</h1>
  <div class="subtitle">Guía completa de uso — Tu asesor financiero personal</div>
  <div class="version">Versión 1.0 · Generado desde la app</div>
</div>

<!-- ── INTRODUCCIÓN ── -->
<h2>¿Qué es Wallet Control?</h2>
<p>
  Wallet Control es tu asesor financiero personal para Android. Registra tus gastos
  en lenguaje natural hablando con <strong>Finando IA</strong>, visualiza tus finanzas
  del mes en gráficas coloridas y controla tus tarjetas, cuentas y metas de ahorro —
  todo guardado en tu dispositivo, sin servidores ni suscripciones.
</p>

<table>
  <tr><th>Sección</th><th>Qué hace</th></tr>
  <tr><td>💬 Finando</td><td>Chat IA para registrar gastos e ingresos en lenguaje natural</td></tr>
  <tr><td>📊 Resumen</td><td>Gráficas, categorías, metas de ahorro y flujo de efectivo</td></tr>
  <tr><td>💳 Tarjetas</td><td>Gestiona cuentas débito y tarjetas de crédito</td></tr>
  <tr><td>📅 Historial</td><td>Revisa los gastos de meses anteriores</td></tr>
</table>

<!-- ── PRIMEROS PASOS ── -->
<h2>1. Primeros Pasos — Crear tu cuenta</h2>
<p>La primera vez que abres la app verás la pantalla de bienvenida.</p>

<div class="step"><span class="num">1</span> <span class="label">Toca "Crear mi cuenta"</span> en la pantalla de bienvenida.</div>
<div class="step"><span class="num">2</span> <span class="label">Elige tu color de avatar</span> — este será el color de tu perfil en la app.</div>
<div class="step"><span class="num">3</span> <span class="label">Escribe tu nombre</span> (mínimo 2 caracteres).</div>
<div class="step"><span class="num">4</span> <span class="label">Ingresa tu correo electrónico</span> — la app verifica el formato.</div>
<div class="step"><span class="num">5</span> <span class="label">Toca "Crear cuenta"</span> — el botón se habilita cuando todo es válido.</div>
<div class="step"><span class="num">6</span> <span class="label">¡Listo!</span> Toca "Ir a Wallet Control" para empezar.</div>

<div class="tip">Tus datos se guardan SOLO en este dispositivo. No hay servidores involucrados.</div>

<!-- ── FINANDO ── -->
<div class="page-break"></div>
<h2>2. Finando — Tu Asesor IA</h2>
<p>
  Finando es la pantalla principal. Habla con ella como si le dijeras a un amigo
  tus gastos. Ella los entiende, los categoriza y los guarda automáticamente.
</p>

<h3>Registrar gastos</h3>
<p>Simplemente escribe lo que gastaste, en lenguaje natural:</p>

<div class="chat-example">
  <div class="prefix">Tú:</div>
  "Gasté $47.500 en el mercado esta mañana"
</div>
<div class="chat-example">
  <div class="prefix">Tú:</div>
  "Pagué el arriendo $850.000, el Netflix $32.000 y la gasolina $120.000"
</div>
<div class="chat-example">
  <div class="prefix">Tú:</div>
  "Almuerzo $22.000, taxi $15.000, café $8.500"
</div>

<div class="tip">Puedes registrar varios gastos en un solo mensaje. Finando los separa automáticamente.</div>

<h3>Registrar ingresos</h3>
<div class="chat-example">
  <div class="prefix">Tú:</div>
  "Recibí mi quincena $1.800.000"
</div>
<div class="chat-example">
  <div class="prefix">Tú:</div>
  "Me consignaron $350.000 de un cliente"
</div>

<h3>Pedir análisis financiero</h3>
<p>Toca el botón <strong>"Analizar"</strong> (o escribe "analizar mis gastos") para que
Finando te dé un resumen inteligente de tus finanzas del mes.</p>

<h3>Chips de acceso rápido</h3>
<p>Cuando el chat está vacío, aparecen botones rápidos para las acciones más comunes:
"Registrar gasto", "Ver resumen", "Agregar ingreso" y "Analizar gastos".</p>

<div class="warn">Si no tienes API key configurada, la app funciona en modo demo con respuestas simuladas.</div>

<!-- ── RESUMEN ── -->
<div class="page-break"></div>
<h2>3. Resumen — Visualiza tus Finanzas</h2>
<p>La pestaña Resumen muestra todo en un vistazo.</p>

<h3>Gráfica de torta</h3>
<p>Muestra la distribución de tus gastos del mes en tres segmentos: Débito, Crédito y Ahorro.</p>

<h3>Tarjeta de flujo de efectivo</h3>
<p>Muestra ingresos totales, gastos totales y cuánto has ahorrado. La barra de ahorro
se pone verde cuando estás ahorrando y roja cuando gastas más de lo que ganas.</p>

<h3>Tarjetas de resumen (Débito / Crédito)</h3>
<p>Dos tarjetas muestran el total gastado en cuentas débito y en tarjetas de crédito.
<strong>Tócalas</strong> para ir directamente a la sección de Tarjetas.</p>

<h3>Categorías de gastos</h3>
<p>Cada categoría aparece con su ícono, nombre y monto gastado.</p>
<div class="step"><span class="num">→</span> <span class="label">Toca</span> una categoría para ver el detalle de sus gastos.</div>
<div class="step"><span class="num">→</span> <span class="label">Mantén presionado</span> para editar el nombre/color o eliminar la categoría.</div>

<h3>Agregar categoría personalizada</h3>
<div class="step"><span class="num">1</span> Toca el botón <strong>"+ Categoría"</strong> al final de la lista.</div>
<div class="step"><span class="num">2</span> Escribe el nombre, elige un ícono y un color.</div>
<div class="step"><span class="num">3</span> Toca "Guardar".</div>

<h3>Metas de ahorro</h3>
<p>En la sección "Mis Metas" puedes crear objetivos de ahorro con fecha límite.</p>
<div class="step"><span class="num">→</span> <span class="label">Toca</span> una meta para ver su historial de aportes y agregar uno nuevo.</div>
<div class="step"><span class="num">→</span> <span class="label">Mantén presionado</span> para editar o eliminar la meta.</div>

<h4 style="margin: 14px 0 6px; font-size: 14px; color: #6B7280;">Agregar aporte a una meta:</h4>
<div class="step"><span class="num">1</span> Toca la meta que quieres alimentar.</div>
<div class="step"><span class="num">2</span> En el modal, escribe el monto, la fecha y una nota opcional.</div>
<div class="step"><span class="num">3</span> Toca "Agregar aporte".</div>

<!-- ── TARJETAS ── -->
<div class="page-break"></div>
<h2>4. Tarjetas — Cuentas y Créditos</h2>
<p>En esta sección gestionas tus cuentas bancarias y tarjetas de crédito.</p>

<h3>Sub-pestañas</h3>
<table>
  <tr><th>Sub-pestaña</th><th>Qué muestra</th></tr>
  <tr><td>🏦 Cuentas</td><td>Cuentas débito, ahorros, Nequi, etc.</td></tr>
  <tr><td>💳 Tarjetas</td><td>Tarjetas de crédito con cupo disponible</td></tr>
</table>

<h3>Agregar una cuenta o tarjeta</h3>
<div class="step"><span class="num">1</span> Toca el botón <strong>"+"</strong> en la esquina superior derecha.</div>
<div class="step"><span class="num">2</span> Selecciona el tipo: <strong>🏦 Cuenta</strong> (débito/ahorros) o <strong>💳 Tarjeta</strong> (crédito).</div>
<div class="step"><span class="num">3</span> Escribe el nombre (Ej: "Bancolombia Ahorros") y el banco.</div>
<div class="step"><span class="num">4</span> Para cuentas: puedes ingresar el saldo actual.</div>
<div class="step"><span class="num">5</span> Para crédito: ingresa el cupo total.</div>
<div class="step"><span class="num">6</span> Elige un color y toca "Guardar".</div>

<div class="tip">El número de los últimos 4 dígitos se genera automáticamente para identificar la tarjeta.</div>

<h3>Ver gastos de una tarjeta</h3>
<p>Toca cualquier tarjeta o cuenta para ver los gastos asignados a ella.
<strong>Toca un gasto</strong> para editarlo o eliminarlo.</p>

<h3>Asignar gastos a una tarjeta</h3>
<p>Cuando Finando registra gastos, puedes asignarlos a una tarjeta tocando
"Asignar tarjeta" en la confirmación del chat.</p>

<!-- ── HISTORIAL ── -->
<h2>5. Historial — Meses Anteriores</h2>
<p>La pestaña Historial guarda automáticamente todos tus meses anteriores.</p>

<div class="step"><span class="num">→</span> Toca un mes para <strong>expandirlo</strong> y ver el resumen.</div>
<div class="step"><span class="num">→</span> Cada mes muestra: ingresos, gastos, ahorro y el top 5 de categorías.</div>

<div class="tip">El historial se genera automáticamente. No necesitas hacer nada especial para guardarlo.</div>

<!-- ── TIPS AVANZADOS ── -->
<div class="page-break"></div>
<h2>6. Tips y Trucos</h2>

<h3>Hablar con Finando como un humano</h3>
<p>Finando entiende contexto. Puedes decirle:</p>
<div class="chat-example">"El fin de semana gasté como $200.000 entre comida, uber y cine"</div>
<div class="chat-example">"Págame el domicilio que costó 35 lucas"</div>
<div class="chat-example">"¿Cuánto llevo gastado este mes?"</div>

<h3>Primera y Segunda Quincena</h3>
<p>Los gastos se separan automáticamente en primera (días 1–15) y segunda quincena (días 16–31)
según la fecha en que los registres.</p>

<h3>Presupuesto mensual</h3>
<p>Puedes pedirle a Finando que establezca un presupuesto:</p>
<div class="chat-example">"Pon mi presupuesto del mes en $2.500.000"</div>

<h3>Metas inteligentes</h3>
<p>Usa las metas para objetivos concretos: "Fondo de emergencia", "Vacaciones diciembre",
"Cambiar el celular". Cada aporte queda registrado con fecha para ver tu progreso.</p>

<div class="warn">
  El análisis de IA real de Finando se activa automáticamente al crear una cuenta o iniciar
  sesión — no necesitas configurar ninguna API key. En modo anónimo, Finando queda en modo demo.
</div>

<!-- ── PRIVACIDAD ── -->
<h2>7. Privacidad y Seguridad</h2>
<table>
  <tr><th>Pregunta</th><th>Respuesta</th></tr>
  <tr><td>¿Mis datos van a la nube?</td><td>Tu perfil de cuenta sí, de forma segura. Tus tarjetas, gastos y metas quedan solo en este dispositivo (AsyncStorage)</td></tr>
  <tr><td>¿Necesita internet?</td><td>Solo para el chat con IA y para iniciar sesión. El resto funciona offline</td></tr>
  <tr><td>¿Qué pasa si desinstalo la app?</td><td>Tus tarjetas, gastos y metas se borran junto con la app. Tu cuenta (si creaste una) sigue disponible al reinstalar e iniciar sesión</td></tr>
  <tr><td>¿Puedo hacer backup?</td><td>Sí — desde Resumen puedes exportar un extracto de tu cuenta en PDF con todos tus movimientos del mes, y un reporte financiero con tus gastos por categoría</td></tr>
  <tr><td>¿Necesito una contraseña?</td><td>Solo si creas una cuenta (para poder entrar desde otro dispositivo). El modo anónimo no la pide</td></tr>
</table>

<div class="footer">
  <p>Wallet Control · Guía de usuario v1.0</p>
  <p>Generado automáticamente desde la app · Todos los derechos reservados</p>
</div>

</body>
</html>
`;

// ── Screen ────────────────────────────────────────────────────────────────────

type Section = {
  icon: string;
  title: string;
  items: string[];
};

const SECTIONS: Section[] = [
  {
    icon: '👤',
    title: 'Crear cuenta',
    items: [
      'Toca "Crear mi cuenta" en la bienvenida',
      'Elige tu color de avatar',
      'Ingresa tu nombre y correo',
      'Toca "Crear cuenta" para comenzar',
    ],
  },
  {
    icon: '💬',
    title: 'Finando — Registrar gastos',
    items: [
      'Escribe tus gastos en lenguaje natural',
      'Puedes registrar varios gastos a la vez',
      'También puedes registrar ingresos',
      'Toca "Analizar" para resumen con IA',
    ],
  },
  {
    icon: '📊',
    title: 'Resumen — Ver tus finanzas',
    items: [
      'Gráfica de torta por tipo de gasto',
      'Toca una categoría para ver su detalle',
      'Toca una meta para agregar aportes',
      'Presiona largo para editar o eliminar',
    ],
  },
  {
    icon: '💳',
    title: 'Tarjetas — Cuentas y créditos',
    items: [
      'Agrega cuentas débito o tarjetas de crédito',
      'Toca "+" para crear una nueva',
      'Toca una tarjeta para ver sus gastos',
      'Edita o elimina gastos individuales',
    ],
  },
  {
    icon: '📅',
    title: 'Historial de meses',
    items: [
      'Ver gastos de meses anteriores',
      'Toca un mes para expandir su resumen',
      'Se guarda automáticamente cada mes',
    ],
  },
];

export default function AyudaScreen() {
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const COLORS = useColors();
  const { moderateScale } = useResponsive();
  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { padding: 16, paddingBottom: 40 },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    pdfBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    },
    pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },

    introCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: COLORS.primaryBg, borderRadius: 16, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: COLORS.primary + '44',
    },
    introEmoji: { fontSize: 36 },
    introText: { flex: 1 },
    introTitle: { color: COLORS.primary, fontWeight: '800', fontSize: FONT.lg, marginBottom: 4 },
    introSub: { color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18 },

    section: {
      backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 10,
      overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16,
    },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionEmoji: { fontSize: 22 },
    sectionTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    sectionBody: {
      padding: 16, paddingTop: 4,
      borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10,
    },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    stepNum: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
      marginTop: 1, flexShrink: 0,
    },
    stepNumText: { color: COLORS.primary, fontWeight: '800', fontSize: 11 },
    stepText: { flex: 1, color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 20 },

    tipsCard: {
      backgroundColor: COLORS.debitBg, borderRadius: 14, padding: 16,
      marginTop: 6, marginBottom: 16, borderWidth: 1, borderColor: COLORS.debit + '44',
    },
    tipsTitle: { color: COLORS.debit, fontWeight: '800', fontSize: FONT.base, marginBottom: 12 },
    tipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
    tipDot: { color: COLORS.debit, fontWeight: '900', fontSize: 18, lineHeight: 20 },
    tipText: { flex: 1, color: COLORS.text, fontSize: FONT.sm, lineHeight: 18 },

    pdfCta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
      borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
    },
    pdfCtaText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.base },
  }, moderateScale)), [COLORS, moderateScale]);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildPdfHtml(),
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guía Wallet Control',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Generado', `Guardado en:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cómo usar la app</Text>
        <TouchableOpacity onPress={handleGeneratePDF} disabled={generating} style={styles.pdfBtn}>
          {generating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="document-text-outline" size={16} color="#fff" />
          }
          <Text style={styles.pdfBtnText}>{generating ? '...' : 'PDF'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro card */}
        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>💼</Text>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Wallet Control</Text>
            <Text style={styles.introSub}>Toca cualquier sección para ver el paso a paso. Descarga el PDF completo con el botón de arriba.</Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((sec, i) => (
          <View key={i} style={styles.section}>
            <TouchableOpacity
              onPress={() => setExpanded(expanded === i ? null : i)}
              style={styles.sectionHeader}
              activeOpacity={0.7}
            >
              <View style={styles.sectionLeft}>
                <Text style={styles.sectionEmoji}>{sec.icon}</Text>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
              </View>
              <Ionicons
                name={expanded === i ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            {expanded === i && (
              <View style={styles.sectionBody}>
                {sec.items.map((item, j) => (
                  <View key={j} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{j + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips rápidos</Text>
          {[
            'Puedes registrar varios gastos en un solo mensaje',
            'Di "analizar" para que Finando revise tus finanzas',
            'Presiona largo en categorías y metas para editarlas',
            'El historial se guarda automáticamente cada mes',
            'Tus datos nunca salen de este dispositivo',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>·</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* PDF CTA */}
        <TouchableOpacity onPress={handleGeneratePDF} disabled={generating} style={styles.pdfCta}>
          {generating
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          }
          <Text style={styles.pdfCtaText}>
            {generating ? 'Generando PDF...' : 'Descargar guía completa en PDF'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

