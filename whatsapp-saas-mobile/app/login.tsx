import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, loading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Erro no Login', error.message || 'Não foi possível fazer login.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível fazer login com Google.');
    }
  };

  // Development quick login
  const handleQuickLogin = async () => {
    try {
      await login('pedro.moto4@gmail.com', 'as4028026');
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Login rápido falhou.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0B141A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={{
            position: 'absolute',
            top: 60,
            left: 24,
            zIndex: 10,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#E9EDEF" />
        </TouchableOpacity>

        <Card>
          <CardHeader>
            <CardTitle style={{ textAlign: 'center', fontSize: 24 }}>
              {isRegistering ? 'Criar Conta' : 'Bem-vindo'}
            </CardTitle>
            <CardDescription style={{ textAlign: 'center' }}>
              {isRegistering
                ? 'Crie sua conta WhatsApp SaaS'
                : 'Entre na sua conta WhatsApp SaaS'}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 16 }}>
            {/* Email Input */}
            <Input
              label="Email"
              placeholder="Digite seu email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon={<Ionicons name="mail-outline" size={20} color="#8696A0" />}
            />

            {/* Password Input */}
            <Input
              label="Password"
              placeholder="Digite sua password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#8696A0" />}
            />

            {/* Login Button */}
            <Button
              onPress={handleEmailLogin}
              loading={loading}
              size="lg"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </Button>

            {/* Separator */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 8,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: '#2A373F' }} />
              <Text style={{ paddingHorizontal: 16, color: '#8696A0', fontSize: 12 }}>
                Ou continue com
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#2A373F' }} />
            </View>

            {/* Google Login */}
            <Button
              variant="outline"
              onPress={handleGoogleLogin}
              disabled={loading}
              leftIcon={<Ionicons name="logo-google" size={20} color="#E9EDEF" />}
            >
              Continuar com Google
            </Button>

            {/* Development Quick Login */}
            {__DEV__ && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginVertical: 8,
                  }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: '#2A373F' }} />
                  <Text style={{ paddingHorizontal: 16, color: '#8696A0', fontSize: 12 }}>
                    Desenvolvimento
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#2A373F' }} />
                </View>

                <Button
                  variant="outline"
                  onPress={handleQuickLogin}
                  disabled={loading}
                  style={{ borderColor: '#F97316' }}
                  leftIcon={<Ionicons name="flash" size={20} color="#F97316" />}
                >
                  <Text style={{ color: '#F97316' }}>Login Rápido (Dev)</Text>
                </Button>
              </>
            )}

            {/* Toggle Register/Login */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#8696A0' }}>
                {isRegistering ? 'Já tem conta? ' : 'Não tem conta? '}
              </Text>
              <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                <Text style={{ color: '#25D366', fontWeight: '600' }}>
                  {isRegistering ? 'Fazer login' : 'Criar conta'}
                </Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

