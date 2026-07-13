import AsyncStorage from '@react-native-async-storage/async-storage';

const K_SESSION = 'rs_session';

export async function getSession() {
  try {
    const raw = await AsyncStorage.getItem(K_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  try {
    await AsyncStorage.setItem(K_SESSION, JSON.stringify(session));
  } catch {
    // best-effort — la sesión simplemente no persiste esta vez
  }
}
