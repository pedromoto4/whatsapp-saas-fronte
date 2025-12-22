import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal as RNModal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { authFetch, useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api-config';
import { Message, Conversation, CatalogItem } from '@/types';
import ContactInfo from '@/components/ContactInfo';
import { Modal, Button } from '@/components/ui';

export default function ChatPage() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    filename: string;
    original_filename: string;
    media_type: string;
    public_url: string;
  } | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sendingProduct, setSendingProduct] = useState(false);

  const loadConversation = async () => {
    try {
      // Load conversation info
      const convResponse = await authFetch(API_ENDPOINTS.CONVERSATIONS);
      if (convResponse.ok) {
        const conversations = await convResponse.json();
        const conv = conversations.find((c: Conversation) => c.phone_number === phone);
        if (conv) {
          setConversation(conv);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await authFetch(API_ENDPOINTS.CONVERSATION_MESSAGES(phone || ''));
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Mark as read
        await authFetch(API_ENDPOINTS.CONVERSATION_MARK_READ(phone || ''), {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!silent) {
        Alert.alert('Erro', 'Não foi possível carregar as mensagens.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone) {
      loadConversation();
      loadMessages();
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        loadMessages(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [phone]);

  const handleSend = async () => {
    if (!newMessage.trim() || !phone) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await authFetch(API_ENDPOINTS.CONVERSATION_SEND(phone), {
        method: 'POST',
        body: JSON.stringify({ content: messageText }),
      });

      if (response.ok) {
        loadMessages(true);
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Não foi possível enviar a mensagem.');
        setNewMessage(messageText); // Restore message
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro de conexão.');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Validate file size and type
  const validateFile = (file: { size: number; mimeType?: string; type?: string }) => {
    const MAX_SIZE = 16 * 1024 * 1024; // 16MB
    if (file.size > MAX_SIZE) {
      Alert.alert('Erro', 'Ficheiro muito grande. Tamanho máximo: 16MB');
      return false;
    }

    const mimeType = file.mimeType || file.type || '';
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
    ];

    if (mimeType && !allowedTypes.includes(mimeType)) {
      Alert.alert('Erro', 'Tipo de ficheiro não suportado');
      return false;
    }

    return true;
  };

  // Upload file to backend
  const uploadFile = async (file: { uri: string; name: string; type: string; size: number }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      
      // Create file object for FormData (React Native format)
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = file.name || `file.${fileExtension}`;
      
      // @ts-ignore - FormData in React Native requires specific format
      formData.append('file', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: fileName,
        type: file.type,
      } as any);

      // Get fresh token
      let token = useAuthStore.getState().token;
      if (!token) {
        try {
          const auth = require('@react-native-firebase/auth').default;
          const firebaseUser = auth().currentUser;
          if (firebaseUser) {
            token = await firebaseUser.getIdToken();
            useAuthStore.getState().setToken(token);
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
      }

      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`${getApiBaseUrl()}${API_ENDPOINTS.WHATSAPP_UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let fetch set it with boundary
        },
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || 'Erro ao fazer upload' };
        }
        throw new Error(error.detail || 'Erro ao fazer upload');
      }

      const result = await response.json();
      console.log('Upload result:', result);
      console.log('Media type determined by backend:', result.media_type);
      setUploadedFile(result);
      setShowFilePreview(true);
      return result;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      Alert.alert('Erro', error.message || 'Erro ao fazer upload do ficheiro');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle image picker
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      };

      if (validateFile(file)) {
        setSelectedFile(file);
        await uploadFile(file);
      }
    }
  };

  // Handle camera
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'É necessário permitir o acesso à câmara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      };

      if (validateFile(file)) {
        setSelectedFile(file);
        await uploadFile(file);
      }
    }
  };

  // Handle document picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/pdf',
          size: asset.size || 0,
        };

        if (validateFile(file)) {
          setSelectedFile(file);
          await uploadFile(file);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Erro ao selecionar documento');
    }
  };

  // Handle video picker
  const handlePickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || `video_${Date.now()}.mp4`,
        type: asset.mimeType || 'video/mp4',
        size: asset.fileSize || 0,
      };

      if (validateFile(file)) {
        setSelectedFile(file);
        await uploadFile(file);
      }
    }
  };

  // Handle audio picker (using document picker for audio files)
  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'audio/mpeg',
          size: asset.size || 0,
        };

        if (validateFile(file)) {
          setSelectedFile(file);
          await uploadFile(file);
        }
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Erro', 'Erro ao selecionar áudio');
    }
  };

  // Show file picker options
  const handleAttachPress = () => {
    setShowMediaPicker(true);
  };

  const handleMediaOption = async (option: string) => {
    setShowMediaPicker(false);
    switch (option) {
      case 'image':
        await handlePickImage();
        break;
      case 'camera':
        await handleTakePhoto();
        break;
      case 'document':
        await handlePickDocument();
        break;
      case 'video':
        await handlePickVideo();
        break;
      case 'audio':
        await handlePickAudio();
        break;
      case 'product':
        setShowProductPicker(true);
        if (products.length === 0) {
          loadProducts();
        }
        break;
    }
  };

  // Load products from catalog
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await authFetch(API_ENDPOINTS.CATALOG);
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os produtos.');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Send product
  const handleSendProduct = async (product: CatalogItem) => {
    if (!phone || sendingProduct) {
      console.log('[PRODUCT] Cannot send - missing phone or already sending', { phone, sendingProduct });
      return;
    }

    console.log('[PRODUCT] Starting to send product:', {
      phone_number: phone,
      product_id: product.id,
      product_name: product.name,
      has_image: !!product.image_url,
      image_url: product.image_url,
    });

    // Validate image URL if product has image (but don't block - just warn)
    if (product.image_url) {
      try {
        const url = new URL(product.image_url);
        if (url.protocol !== 'https:') {
          console.warn('[PRODUCT] Image URL is not HTTPS:', product.image_url);
          // Don't block - just warn, let backend handle it
        }
      } catch (e) {
        console.warn('[PRODUCT] Image URL validation failed:', e);
        // Don't block - just warn, let backend handle it
      }
    }

    setSendingProduct(true);
    try {
      const endpoint = API_ENDPOINTS.CONVERSATION_SEND_PRODUCT(phone, product.id);
      console.log('[PRODUCT] Calling endpoint:', endpoint);
      console.log('[PRODUCT] Full URL will be:', `${getApiBaseUrl()}${endpoint}`);

      const response = await authFetch(endpoint, {
        method: 'POST',
      });

      console.log('[PRODUCT] Response received, status:', response.status);

      if (response.ok) {
        const result = await response.json().catch((e) => {
          console.error('[PRODUCT] Failed to parse response JSON:', e);
          return {};
        });
        console.log('[PRODUCT] Product send result:', JSON.stringify(result, null, 2));

        // Check what was sent successfully
        const imageSent = result.image_sent === true;
        const descriptionSent = result.description_sent === true;
        const status = result.status || 'unknown';

        // If status is success, at least description was sent
        if (status === 'success') {
          if (product.image_url && !imageSent) {
            // Image failed but description was sent
            Alert.alert(
              'Aviso',
              `A descrição do produto foi enviada, mas a imagem falhou.\n\nPor favor, verifique:\n• Se a URL da imagem é acessível publicamente\n• Se a URL usa HTTPS\n• Se a imagem não é muito grande\n\nO destinatário recebeu a descrição do produto.`
            );
          } else {
            // Both sent successfully (or no image, only text)
            Alert.alert('Sucesso', `Produto "${product.name}" enviado com sucesso!`);
          }
        } else {
          // Status is not success - something went wrong
          Alert.alert('Erro', result.message || 'Não foi possível enviar o produto. Por favor, tente novamente.');
          return;
        }

        setShowProductPicker(false);
        loadMessages(true);
      } else {
        const errorText = await response.text().catch(() => '');
        console.error('[PRODUCT] Error response:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || 'Não foi possível enviar o produto.' };
        }
        Alert.alert('Erro', errorData.detail || 'Não foi possível enviar o produto.');
      }
    } catch (error: any) {
      console.error('[PRODUCT] Exception sending product:', error);
      console.error('[PRODUCT] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      Alert.alert('Erro', error.message || 'Erro de conexão.');
    } finally {
      setSendingProduct(false);
    }
  };

  // Send media message
  const handleSendMedia = async () => {
    if (!uploadedFile || !phone || sending) return;

    setSending(true);
    try {
      console.log('Sending media:', {
        phone_number: phone,
        media_url: uploadedFile.public_url,
        media_type: uploadedFile.media_type,
        caption: newMessage.trim() || '',
      });

      const response = await authFetch(API_ENDPOINTS.WHATSAPP_SEND_MEDIA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phone,
          media_url: uploadedFile.public_url,
          media_type: uploadedFile.media_type,
          caption: newMessage.trim() || '',
        }),
      });

      console.log('Send media response status:', response.status);

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        console.log('Media sent successfully:', result);
        setNewMessage('');
        setSelectedFile(null);
        setUploadedFile(null);
        setShowFilePreview(false);
        loadMessages(true);
        Alert.alert('Sucesso', 'Ficheiro enviado com sucesso!');
      } else {
        const errorText = await response.text().catch(() => '');
        console.error('Send media error response:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || 'Erro ao enviar media' };
        }
        Alert.alert('Erro', errorData.detail || 'Não foi possível enviar o ficheiro.');
      }
    } catch (error: any) {
      console.error('Error sending media:', error);
      Alert.alert('Erro', error.message || 'Erro de conexão.');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return format(date, "d 'de' MMMM", { locale: pt });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOutgoing = item.direction === 'out';
    // With inverted FlatList, index 0 is the last message (most recent) in the array
    // So we need to check the previous message chronologically (next in array)
    // Original array: [antiga, média, recente]
    // With inverted, visually: [recente, média, antiga]
    // Index 0 = recente (last in array), so we check index + 1 for previous chronologically
    const showDate =
      index === messages.length - 1 ||
      new Date(messages[messages.length - 2 - index]?.created_at || '').toDateString() !==
        new Date(item.created_at).toDateString();

    return (
      <>
        {showDate && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View
              style={{
                backgroundColor: '#1F2C33',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: '#8696A0' }}>
                {formatMessageDate(item.created_at)}
              </Text>
            </View>
          </View>
        )}
        <View
          style={{
            alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            marginVertical: 2,
            marginHorizontal: 16,
          }}
        >
          <View
            style={{
              backgroundColor: isOutgoing ? '#005C4B' : '#1F2C33',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              borderTopRightRadius: isOutgoing ? 4 : 12,
              borderTopLeftRadius: isOutgoing ? 12 : 4,
            }}
          >
            {item.media_url && item.media_type === 'image' && (() => {
              // Check if it's a WhatsApp media ID or our uploaded file URL
              let imageUrl: string;
              if (item.media_url.startsWith('http')) {
                // It's already a full URL (our uploaded file)
                imageUrl = item.media_url;
              } else {
                // It's a WhatsApp media ID, use proxy endpoint
                imageUrl = `${getApiBaseUrl()}/whatsapp/media/${item.media_url}`;
              }
              
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedImageUrl(imageUrl)}
                  style={{
                    marginBottom: item.content ? 8 : 0,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#2A373F',
                    maxWidth: 280,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: 280,
                      height: 280,
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })()}
            {item.media_url && item.media_type !== 'image' && (() => {
              // Get media URL - use proxy endpoint if it's a WhatsApp media ID
              let mediaUrl: string;
              if (item.media_url.startsWith('http')) {
                // It's already a full URL (our uploaded file)
                mediaUrl = item.media_url;
              } else {
                // It's a WhatsApp media ID, use proxy endpoint
                mediaUrl = `${getApiBaseUrl()}/whatsapp/media/${item.media_url}`;
              }
              
              const handleOpenMedia = async () => {
                try {
                  const canOpen = await Linking.canOpenURL(mediaUrl);
                  if (canOpen) {
                    await Linking.openURL(mediaUrl);
                  } else {
                    Alert.alert('Erro', 'Não foi possível abrir o ficheiro');
                  }
                } catch (error) {
                  console.error('Error opening media:', error);
                  Alert.alert('Erro', 'Erro ao abrir o ficheiro');
                }
              };
              
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleOpenMedia}
                  style={{
                    backgroundColor: '#2A373F',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: item.content ? 8 : 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#1F2C33',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={
                        item.media_type === 'document'
                          ? 'document-text'
                          : item.media_type === 'video'
                          ? 'videocam'
                          : 'musical-notes'
                      }
                      size={24}
                      color="#25D366"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#E9EDEF', fontSize: 14, fontWeight: '500' }}>
                      {item.media_filename || 'Media'}
                    </Text>
                    <Text style={{ color: '#8696A0', fontSize: 12, marginTop: 2 }}>
                      {item.media_type === 'document'
                        ? 'Documento'
                        : item.media_type === 'video'
                        ? 'Vídeo'
                        : 'Áudio'}
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color="#8696A0" />
                </TouchableOpacity>
              );
            })()}
            {item.content && (
              <Text style={{ fontSize: 16, color: '#E9EDEF', lineHeight: 22 }}>
                {item.content}
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginTop: 4,
                gap: 4,
              }}
            >
              {item.is_automated && (
                <Ionicons name="flash" size={12} color="#8696A0" />
              )}
              <Text style={{ fontSize: 11, color: '#8696A0' }}>
                {formatMessageTime(item.created_at)}
              </Text>
              {isOutgoing && (
                <Ionicons
                  name={
                    item.status === 'read'
                      ? 'checkmark-done'
                      : item.status === 'delivered'
                      ? 'checkmark-done'
                      : 'checkmark'
                  }
                  size={14}
                  color={item.status === 'read' ? '#53BDEB' : '#8696A0'}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B141A' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2A373F',
          backgroundColor: '#111B21',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#E9EDEF" />
        </TouchableOpacity>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#25D36630',
            justifyContent: 'center',
            alignItems: 'center',
            marginHorizontal: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#25D366' }}>
            {(conversation?.contact_name || phone || 'C').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#E9EDEF',
            }}
            numberOfLines={1}
          >
            {conversation?.contact_name || phone}
          </Text>
          <Text style={{ fontSize: 12, color: '#8696A0' }}>
            {phone}
          </Text>
        </View>

        <TouchableOpacity style={{ padding: 8 }}>
          <Ionicons name="call-outline" size={24} color="#E9EDEF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => setShowContactInfo(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#E9EDEF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#25D366" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
            inverted={true}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: 100,
                }}
              >
                <Ionicons name="chatbubble-outline" size={64} color="#2A373F" />
                <Text style={{ fontSize: 16, color: '#8696A0', marginTop: 16 }}>
                  Sem mensagens
                </Text>
                <Text style={{ fontSize: 14, color: '#8696A0', marginTop: 4 }}>
                  Envie uma mensagem para iniciar a conversa
                </Text>
              </View>
            }
          />
        )}

        {/* Input Area */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 8,
            paddingVertical: 8,
            backgroundColor: '#111B21',
            borderTopWidth: 1,
            borderTopColor: '#2A373F',
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={handleAttachPress}
            style={{
              padding: 10,
              backgroundColor: '#1F2C33',
              borderRadius: 20,
            }}
          >
            <Ionicons name="attach" size={22} color="#8696A0" />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'flex-end',
              backgroundColor: '#1F2C33',
              borderRadius: 24,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: '#E9EDEF',
                maxHeight: 100,
                paddingVertical: 4,
              }}
              placeholder="Mensagem"
              placeholderTextColor="#8696A0"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity onPress={handleTakePhoto} style={{ paddingLeft: 8 }}>
              <Ionicons name="camera-outline" size={22} color="#8696A0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={uploadedFile ? handleSendMedia : handleSend}
            disabled={(!newMessage.trim() && !uploadedFile) || sending || uploading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#25D366',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: ((!newMessage.trim() && !uploadedFile) || sending || uploading) ? 0.5 : 1,
            }}
          >
            {(sending || uploading) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Contact Info Modal */}
      {conversation && (
        <ContactInfo
          conversation={conversation}
          messageCount={messages.length}
          visible={showContactInfo}
          onClose={() => setShowContactInfo(false)}
          onContactUpdated={() => {
            loadConversation();
          }}
        />
      )}

      {/* File Preview Modal */}
      <Modal
        visible={showFilePreview}
        onClose={() => {
          setShowFilePreview(false);
          setSelectedFile(null);
          setUploadedFile(null);
        }}
        title="Preview do Ficheiro"
      >
        <View style={{ gap: 16 }}>
          {uploadedFile && (
            <>
              <View style={{ alignItems: 'center', gap: 8 }}>
                {uploadedFile.media_type === 'image' && selectedFile && (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={{ width: '100%', height: 200, borderRadius: 8 }}
                    resizeMode="contain"
                  />
                )}
                {uploadedFile.media_type !== 'image' && (
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: '#1F2C33',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={
                        uploadedFile.media_type === 'document'
                          ? 'document-text'
                          : uploadedFile.media_type === 'video'
                          ? 'videocam'
                          : 'musical-notes'
                      }
                      size={40}
                      color="#25D366"
                    />
                  </View>
                )}
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#E9EDEF' }}>
                  {uploadedFile.original_filename}
                </Text>
                <Text style={{ fontSize: 12, color: '#8696A0' }}>
                  Tipo: {uploadedFile.media_type}
                </Text>
              </View>

              <TextInput
                style={{
                  backgroundColor: '#1F2C33',
                  borderRadius: 8,
                  padding: 12,
                  color: '#E9EDEF',
                  fontSize: 14,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                placeholder="Adicionar legenda (opcional)"
                placeholderTextColor="#8696A0"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setShowFilePreview(false);
                    setSelectedFile(null);
                    setUploadedFile(null);
                  }}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </Button>
                <Button
                  onPress={handleSendMedia}
                  disabled={sending}
                  style={{ flex: 1 }}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    'Enviar'
                  )}
                </Button>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Media Picker Modal */}
      <RNModal
        visible={showMediaPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMediaPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMediaPicker(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#1F2C33',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 20,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#2A373F',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#E9EDEF' }}>
                Selecionar Ficheiro
              </Text>
              <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
                <Ionicons name="close" size={24} color="#8696A0" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleMediaOption('image')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#2A373F',
                  borderRadius: 12,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#25D36620',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="image-outline" size={24} color="#25D366" />
                </View>
                <Text style={{ fontSize: 16, color: '#E9EDEF', flex: 1 }}>Imagem</Text>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMediaOption('camera')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#2A373F',
                  borderRadius: 12,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#25D36620',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="camera-outline" size={24} color="#25D366" />
                </View>
                <Text style={{ fontSize: 16, color: '#E9EDEF', flex: 1 }}>Câmara</Text>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMediaOption('document')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#2A373F',
                  borderRadius: 12,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#25D36620',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="document-text-outline" size={24} color="#25D366" />
                </View>
                <Text style={{ fontSize: 16, color: '#E9EDEF', flex: 1 }}>Documento</Text>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMediaOption('video')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#2A373F',
                  borderRadius: 12,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#25D36620',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="videocam-outline" size={24} color="#25D366" />
                </View>
                <Text style={{ fontSize: 16, color: '#E9EDEF', flex: 1 }}>Vídeo</Text>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMediaOption('audio')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#2A373F',
                  borderRadius: 12,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#25D36620',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="musical-notes-outline" size={24} color="#25D366" />
                </View>
                <Text style={{ fontSize: 16, color: '#E9EDEF', flex: 1 }}>Áudio</Text>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMediaOption('product')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#2A373F',
                  borderRadius: 12,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#25D36620',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="bag-outline" size={24} color="#25D366" />
                </View>
                <Text style={{ fontSize: 16, color: '#E9EDEF', flex: 1 }}>Produto do Catálogo</Text>
                <Ionicons name="chevron-forward" size={20} color="#8696A0" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* Product Picker Modal */}
      <RNModal
        visible={showProductPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#1F2C33',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#2A373F',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#E9EDEF' }}>
                Selecionar Produto
              </Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Ionicons name="close" size={24} color="#8696A0" />
              </TouchableOpacity>
            </View>

            {loadingProducts ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#25D366" />
                <Text style={{ color: '#8696A0', marginTop: 16 }}>Carregando produtos...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="bag-outline" size={64} color="#2A373F" />
                <Text style={{ fontSize: 16, color: '#E9EDEF', marginTop: 16, textAlign: 'center' }}>
                  Nenhum produto disponível
                </Text>
                <Text style={{ fontSize: 14, color: '#8696A0', marginTop: 8, textAlign: 'center' }}>
                  Crie produtos no catálogo primeiro
                </Text>
                <Button
                  variant="outline"
                  onPress={() => {
                    setShowProductPicker(false);
                    router.push('/(tabs)/catalog');
                  }}
                  style={{ marginTop: 24 }}
                >
                  Ir para Catálogo
                </Button>
              </View>
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSendProduct(item)}
                    disabled={sendingProduct}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#2A373F',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      gap: 12,
                      opacity: sendingProduct ? 0.5 : 1,
                    }}
                  >
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          backgroundColor: '#1F2C33',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="image-outline" size={24} color="#8696A0" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#E9EDEF' }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#25D366', marginTop: 4 }}>
                        {item.price}
                      </Text>
                      {item.description && (
                        <Text
                          style={{ fontSize: 12, color: '#8696A0', marginTop: 4 }}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {sendingProduct ? (
                      <ActivityIndicator size="small" color="#25D366" style={{ marginLeft: 8 }} />
                    ) : (
                      <Ionicons name="send" size={20} color="#25D366" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </RNModal>

      {/* Image Viewer Modal */}
      <RNModal
        visible={selectedImageUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedImageUrl(null)}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 1001,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 20,
              padding: 10,
            }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageUrl && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setSelectedImageUrl(null)}
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri: selectedImageUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </RNModal>
    </SafeAreaView>
  );
}

