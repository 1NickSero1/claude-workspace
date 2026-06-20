import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from './screens/OnboardingScreen';
import RegistroScreen from './screens/RegistroScreen';
import EstadoScreen from './screens/EstadoScreen';
import MenuPrincipalScreen from './screens/MenuPrincipalScreen';
import CategoriaScreen from './screens/CategoriaScreen';
import MiCasoScreen from './screens/MiCasoScreen';
import SOSScreen from './screens/SOSScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Registro" component={RegistroScreen} />
        <Stack.Screen name="Estado" component={EstadoScreen} />
        <Stack.Screen name="MenuPrincipal" component={MenuPrincipalScreen} />
        <Stack.Screen name="Categoria" component={CategoriaScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="MiCaso" component={MiCasoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
