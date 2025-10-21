import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, PencilSimple, Trash, ShoppingCart } from '@phosphor-icons/react'

interface CatalogItem {
  id: number
  name: string
  price: string
  image_url: string | null
  description: string | null
  created_at: string
}

interface CatalogFormData {
  name: string
  price: string
  image_url: string
  description: string
}

export default function CatalogManagement() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    price: '',
    image_url: '',
    description: ''
  })

  // Backend API URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  // Get auth token
  const getAuthToken = async () => {
    const token = localStorage.getItem('firebase_token')
    if (!token) {
      toast.error('Token de autenticação não encontrado. Por favor, faça login novamente.')
      return null
    }
    return token
  }

  // Load catalog items
  const loadItems = async () => {
    try {
      setLoading(true)
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/catalog/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setItems(data)
      } else {
        toast.error('Erro ao carregar catálogo')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  // Create/Update item
  const saveItem = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const url = editingItem
        ? `${API_BASE_URL}/api/catalog/${editingItem.id}`
        : `${API_BASE_URL}/api/catalog/`

      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingItem ? 'Produto atualizado!' : 'Produto criado!')
        setIsDialogOpen(false)
        resetForm()
        loadItems()
      } else {
        toast.error('Erro ao salvar produto')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  // Delete item
  const deleteItem = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/catalog/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Produto deletado!')
        loadItems()
      } else {
        toast.error('Erro ao deletar produto')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', price: '', image_url: '', description: '' })
    setEditingItem(null)
  }

  // Open edit dialog
  const openEditDialog = (item: CatalogItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      price: item.price,
      image_url: item.image_url || '',
      description: item.description || ''
    })
    setIsDialogOpen(true)
  }

  // Open create dialog
  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Catálogo</h2>
          <p className="text-muted-foreground">
            Configure seus produtos para resposta automática
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus size={20} />
          Novo Produto
        </Button>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-8">Carregando catálogo...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro produto para começar
            </p>
            <Button onClick={openCreateDialog}>
              <Plus size={20} className="mr-2" />
              Criar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="text-xl font-bold text-primary mt-2">
                      {item.price}
                    </div>
                    {item.description && (
                      <CardDescription className="mt-2">
                        {item.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <PencilSimple size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              Configure as informações do produto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Produto</label>
              <Input
                placeholder="Ex: Plano Premium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Preço</label>
              <Input
                placeholder="Ex: €50/mês ou R$ 100"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                placeholder="Ex: Inclui suporte 24/7 e todas as funcionalidades premium"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">URL da Imagem (opcional)</label>
              <Input
                placeholder="Ex: https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o link de uma imagem do produto
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveItem}>
              {editingItem ? 'Atualizar' : 'Criar'} Produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

