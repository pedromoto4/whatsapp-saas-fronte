import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Edit, Trash, Question } from '@phosphor-icons/react'

interface FAQ {
  id: number
  question: string
  answer: string
  keywords: string
  created_at: string
}

interface FAQFormData {
  question: string
  answer: string
  keywords: string
}

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null)
  const [formData, setFormData] = useState<FAQFormData>({
    question: '',
    answer: '',
    keywords: ''
  })

  // Backend API URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  // Get auth token
  const getAuthToken = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.idToken || 'demo-token'
  }

  // Load FAQs
  const loadFaqs = async () => {
    try {
      setLoading(true)
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/faqs/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFaqs(data)
      } else {
        toast.error('Erro ao carregar FAQs')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  // Create/Update FAQ
  const saveFaq = async () => {
    try {
      const token = await getAuthToken()
      const url = editingFaq 
        ? `${API_BASE_URL}/api/faqs/${editingFaq.id}`
        : `${API_BASE_URL}/api/faqs/`
      
      const method = editingFaq ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingFaq ? 'FAQ atualizada!' : 'FAQ criada!')
        setIsDialogOpen(false)
        resetForm()
        loadFaqs()
      } else {
        toast.error('Erro ao salvar FAQ')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  // Delete FAQ
  const deleteFaq = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta FAQ?')) return

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/faqs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('FAQ deletada!')
        loadFaqs()
      } else {
        toast.error('Erro ao deletar FAQ')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({ question: '', answer: '', keywords: '' })
    setEditingFaq(null)
  }

  // Open edit dialog
  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords || ''
    })
    setIsDialogOpen(true)
  }

  // Open create dialog
  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  useEffect(() => {
    loadFaqs()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de FAQs</h2>
          <p className="text-muted-foreground">
            Configure perguntas frequentes para resposta automática
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus size={20} />
          Nova FAQ
        </Button>
      </div>

      {/* FAQs List */}
      {loading ? (
        <div className="text-center py-8">Carregando FAQs...</div>
      ) : faqs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Question size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma FAQ criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira FAQ para começar a responder automaticamente
            </p>
            <Button onClick={openCreateDialog}>
              <Plus size={20} className="mr-2" />
              Criar Primeira FAQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                    <CardDescription className="mt-2">
                      {faq.answer}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(faq)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFaq(faq.id)}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
                {faq.keywords && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {faq.keywords.split(',').map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
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
              {editingFaq ? 'Editar FAQ' : 'Nova FAQ'}
            </DialogTitle>
            <DialogDescription>
              Configure a pergunta, resposta e palavras-chave para resposta automática
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pergunta</label>
              <Input
                placeholder="Ex: Qual o horário de funcionamento?"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Resposta</label>
              <Textarea
                placeholder="Ex: Funcionamos de segunda a sexta, das 9h às 18h."
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Palavras-chave</label>
              <Input
                placeholder="Ex: horário, funcionamento, horas, aberto"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe as palavras-chave por vírgula
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveFaq}>
              {editingFaq ? 'Atualizar' : 'Criar'} FAQ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
