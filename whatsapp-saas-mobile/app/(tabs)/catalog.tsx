import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authFetch, useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api-config';
import { CatalogItem } from '@/types';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Modal as UIModal,
  Input,
  Textarea,
} from '@/components/ui';

interface CatalogFormData {
  name: string;
  price: string;
  image_url: string;
  description: string;
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    price: '',
    image_url: '',
    description: '',
  });
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load catalog items
  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.CATALOG);

      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Erro', errorData.detail || 'Não foi possível carregar o catálogo.');
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Upload image
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      const fileName = `product_${Date.now()}.jpg`;
      
      // @ts-ignore - FormData in React Native requires specific format
      formData.append('file', {
        uri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${getApiBaseUrl()}${API_ENDPOINTS.WHATSAPP_UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData as any,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload');
      }

      const result = await response.json();
      return result.public_url || null;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Erro', 'Erro ao fazer upload da imagem.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle image picker
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'É necessário permitir o acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      // Upload image automatically
      const uploadedUrl = await uploadImage(asset.uri);
      if (uploadedUrl) {
        setFormData({ ...formData, image_url: uploadedUrl });
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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      // Upload image automatically
      const uploadedUrl = await uploadImage(asset.uri);
      if (uploadedUrl) {
        setFormData({ ...formData, image_url: uploadedUrl });
      }
    }
  };

  // Create/Update item
  const saveItem = async () => {
    if (!formData.name.trim() || !formData.price.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome e o preço do produto.');
      return;
    }

    try {
      const url = editingItem
        ? API_ENDPOINTS.CATALOG_DETAIL(editingItem.id)
        : API_ENDPOINTS.CATALOG;

      const method = editingItem ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          price: formData.price.trim(),
          image_url: formData.image_url.trim() || null,
          description: formData.description.trim() || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', editingItem ? 'Produto atualizado!' : 'Produto criado!');
        setShowModal(false);
        resetForm();
        loadItems();
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Erro', errorData.detail || 'Não foi possível salvar o produto.');
      }
    } catch (error) {
      console.error('Error saving catalog item:', error);
      Alert.alert('Erro', 'Erro de conexão.');
    }
  };

  // Delete item
  const deleteItem = async (id: number) => {
    Alert.alert(
      'Eliminar Produto',
      'Tem certeza que deseja eliminar este produto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch(API_ENDPOINTS.CATALOG_DETAIL(id), {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Sucesso', 'Produto eliminado!');
                loadItems();
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert('Erro', errorData.detail || 'Não foi possível eliminar o produto.');
              }
            } catch (error) {
              console.error('Error deleting catalog item:', error);
              Alert.alert('Erro', 'Erro de conexão.');
            }
          },
        },
      ]
    );
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      image_url: '',
      description: '',
    });
    setEditingItem(null);
    setSelectedImage(null);
  };

  // Open edit dialog
  const openEditDialog = (item: CatalogItem) => {
    setEditingItem(item);
    const imageUrl = item.image_url || '';
    setFormData({
      name: item.name,
      price: item.price,
      image_url: imageUrl,
      description: item.description || '',
    });
    setSelectedImage(imageUrl || null);
    setShowModal(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setShowModal(true);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const renderItem = ({ item }: { item: CatalogItem }) => (
    <Card style={{ marginBottom: 12 }}>
      <CardContent style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: 80, height: 80, borderRadius: 8 }}
              resizeMode="cover"
            />
          )}
          <View style={{ flex: 1 }}>
            <CardTitle style={{ fontSize: 16, marginBottom: 4 }}>{item.name}</CardTitle>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#25D366', marginBottom: 4 }}>
              {item.price}
            </Text>
            {item.description && (
              <CardDescription style={{ fontSize: 14, marginTop: 4 }}>
                {item.description}
              </CardDescription>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => openEditDialog(item)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#2A373F',
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                <Ionicons name="pencil" size={20} color="#E9EDEF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteItem(item.id)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#F15C6D20',
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                <Ionicons name="trash" size={20} color="#F15C6D" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B141A' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#111B21',
          borderBottomWidth: 1,
          borderBottomColor: '#2A373F',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#E9EDEF' }}>
          Catálogo
        </Text>
        <Button
          onPress={openCreateDialog}
          leftIcon={<Ionicons name="add" size={20} color="#FFFFFF" />}
        >
          Novo
        </Button>
      </View>

      {/* List */}
      {loading && items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#8696A0' }}>A carregar...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="bag-outline" size={64} color="#2A373F" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#E9EDEF', marginTop: 16 }}>
            Nenhum produto criado
          </Text>
          <Text style={{ fontSize: 14, color: '#8696A0', marginTop: 8, textAlign: 'center' }}>
            Crie seu primeiro produto para começar
          </Text>
          <Button onPress={openCreateDialog} style={{ marginTop: 24 }}>
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            Criar Primeiro Produto
          </Button>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadItems} tintColor="#25D366" />
          }
        />
      )}

      {/* Create/Edit Modal */}
      <UIModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingItem ? 'Editar Produto' : 'Novo Produto'}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              variant="outline"
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancelar
            </Button>
            <Button onPress={saveItem} style={{ flex: 1 }} disabled={uploading}>
              {editingItem ? 'Atualizar' : 'Criar'}
            </Button>
          </View>
        }
      >
        <View style={{ gap: 16, paddingBottom: 20 }}>
          {/* Image */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#8696A0', marginBottom: 8 }}>
              Imagem do Produto
            </Text>
            {((formData.image_url && formData.image_url.trim()) || (selectedImage && selectedImage.trim())) && (
              <View style={{ marginBottom: 12, alignItems: 'flex-start' }}>
                <Image
                  source={{ uri: (formData.image_url && formData.image_url.trim()) || selectedImage || '' }}
                  style={{ width: 100, height: 100, borderRadius: 8, borderWidth: 1, borderColor: '#2A373F' }}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                variant="outline"
                onPress={handlePickImage}
                style={{ flex: 1 }}
                leftIcon={<Ionicons name="image-outline" size={20} color="#E9EDEF" />}
              >
                Galeria
              </Button>
              <Button
                variant="outline"
                onPress={handleTakePhoto}
                style={{ flex: 1 }}
                leftIcon={<Ionicons name="camera-outline" size={20} color="#E9EDEF" />}
              >
                Câmera
              </Button>
            </View>
            {uploading && (
              <Text style={{ fontSize: 12, color: '#8696A0', marginTop: 8 }}>
                A fazer upload...
              </Text>
            )}
            <Input
              label="Ou cole a URL da imagem"
              placeholder="https://exemplo.com/imagem.jpg"
              value={formData.image_url}
              onChangeText={(text) => setFormData({ ...formData, image_url: text })}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Name */}
          <Input
            label="Nome do Produto *"
            placeholder="Ex: Plano Premium"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />

          {/* Price */}
          <Input
            label="Preço *"
            placeholder="Ex: €50/mês ou R$ 100"
            value={formData.price}
            onChangeText={(text) => setFormData({ ...formData, price: text })}
          />

          {/* Description */}
          <Textarea
            label="Descrição (opcional)"
            placeholder="Ex: Inclui suporte 24/7 e todas as funcionalidades premium"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            numberOfLines={3}
          />
        </View>
      </UIModal>
    </SafeAreaView>
  );
}

