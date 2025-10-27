import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, PencilSimple, Trash, FileText, CheckCircle, Clock, XCircle, PaperPlane, CloudArrowUp, WarningCircle } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Template {
  id: number
  owner_id: number
  name: string
  category: string
  language: string
  status: string
  header_text?: string
  body_text: string
  footer_text?: string
  buttons?: string
  variables?: string
  whatsapp_template_id?: string
  rejection_reason?: string
  created_at: string
  updated_at?: string
}

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY',
    language: 'pt_BR',
    header_text: '',
    body_text: '',
    footer_text: '',
    variables: ''
  })
  const [sendData, setSendData] = useState({
    phone: '',
    variables: {} as Record<string, string>
  })

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-saas-fronte-production.up.railway.app'

  const getAuthToken = async () => {
    const token = localStorage.getItem('firebase_token')
    if (!token) {
      toast.error('Token de autenticação não encontrado.')
      return null
    }
    return token
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const token = await getAuthToken()
      if (!token) return

      // First, sync status from WhatsApp
      try {
        const syncResponse = await fetch(`${API_BASE_URL}/api/templates/sync-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json()
          if (syncData.synced > 0) {
            toast.success(`Estado de ${syncData.synced} template(s) atualizado`)
          } else if (syncData.message) {
            console.log('Sync result:', syncData.message)
          }
        } else {
          const errorData = await syncResponse.json()
          console.error('Sync failed:', errorData)
        }
      } catch (error) {
        console.log('Sync failed (continuing anyway):', error)
      }

      // Then, load templates
      const response = await fetch(`${API_BASE_URL}/api/templates/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      } else {
        toast.error('Erro ao carregar templates')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!formData.name.trim() || !formData.body_text.trim()) {
      toast.error('Nome e corpo do template são obrigatórios')
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) return

      const url = editingTemplate
        ? `${API_BASE_URL}/api/templates/${editingTemplate.id}`
        : `${API_BASE_URL}/api/templates/`

      const method = editingTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!')
        setIsDialogOpen(false)
        resetForm()
        loadTemplates()
      } else {
        toast.error('Erro ao salvar template')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const deleteTemplate = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) return

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Template deletado!')
        loadTemplates()
      } else {
        toast.error('Erro ao deletar template')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const sendTemplate = async () => {
    if (!sendData.phone.trim() || !selectedTemplate) {
      toast.error('Telefone é obrigatório')
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/templates/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          to: sendData.phone,
          variables: Object.keys(sendData.variables).length > 0 ? sendData.variables : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Template enviado com sucesso!')
        
        // Show warning if template is not approved
        if (data.warning) {
          toast.warning(data.warning, { duration: 5000 })
        }
        if (data.note) {
          toast.info(data.note, { duration: 5000 })
        }
        
        setIsSendDialogOpen(false)
        resetSendForm()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao enviar template')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const submitTemplateForApproval = async (template: Template) => {
    console.log(`📤 Submitting template: ${template.name}, category: ${template.category}, status: ${template.status}`)
    
    if (!confirm(`Submeter template "${template.name}" para aprovação do WhatsApp?\n\nO template será revisado em 24-48 horas.`)) return

    try {
      const token = await getAuthToken()
      if (!token) return

      console.log(`🚀 Calling API: POST /api/templates/${template.id}/submit`)

      const response = await fetch(`${API_BASE_URL}/api/templates/${template.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Template submetido para aprovação!')
        toast.info(data.note || 'WhatsApp revisará em 24-48 horas')
        loadTemplates()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Erro ao submeter template')
      }
    } catch (error) {
      toast.error('Erro de conexão')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'UTILITY',
      language: 'pt_BR',
      header_text: '',
      body_text: '',
      footer_text: '',
      variables: ''
    })
    setEditingTemplate(null)
  }

  const resetSendForm = () => {
    setSendData({ phone: '', variables: {} })
    setSelectedTemplate(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      header_text: template.header_text || '',
      body_text: template.body_text,
      footer_text: template.footer_text || '',
      variables: template.variables || ''
    })
    setIsDialogOpen(true)
  }

  const openSendDialog = (template: Template) => {
    setSelectedTemplate(template)
    
    // Parse variables if they exist
    if (template.variables) {
      try {
        const vars = JSON.parse(template.variables)
        const initialVars: Record<string, string> = {}
        vars.forEach((v: string) => {
          initialVars[v] = ''
        })
        setSendData({ phone: '', variables: initialVars })
      } catch {
        setSendData({ phone: '', variables: {} })
      }
    } else {
      setSendData({ phone: '', variables: {} })
    }
    
    setIsSendDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      'draft': { color: 'bg-gray-500', icon: Clock },
      'pending': { color: 'bg-yellow-500', icon: Clock },
      'approved': { color: 'bg-green-500', icon: CheckCircle },
      'rejected': { color: 'bg-red-500', icon: XCircle }
    }
    
    const config = variants[status] || variants['draft']
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon size={14} className="mr-1" />
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Templates de Mensagem</h2>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie templates para mensagens WhatsApp
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus size={20} className="mr-2" /> Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
              <DialogDescription>
                {editingTemplate ? 'Edite os detalhes do seu template.' : 'Crie um novo template de mensagem.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome do Template *</label>
                <Input
                  placeholder="Ex: boas_vindas"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria *</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">Utilidade</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Idioma</label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                      <SelectItem value="pt_PT">Português (Portugal)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cabeçalho (opcional)</label>
                <Input
                  placeholder="Ex: Olá!"
                  value={formData.header_text}
                  onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Corpo da Mensagem *</label>
                <Textarea
                  placeholder="Ex: Olá {{nome}}, bem-vindo à nossa plataforma!"
                  value={formData.body_text}
                  onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{variável}}'} para variáveis dinâmicas. Ex: {'{{nome}}'}, {'{{data}}'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rodapé (opcional)</label>
                <Input
                  placeholder="Ex: Equipe de Suporte"
                  value={formData.footer_text}
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Variáveis (JSON array)</label>
                <Input
                  placeholder='Ex: ["nome", "data", "valor"]'
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lista de variáveis usadas no template (formato JSON)
                </p>
              </div>

              <Button onClick={saveTemplate} className="w-full">
                {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Send Template Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Template</DialogTitle>
            <DialogDescription>
              Envie o template "{selectedTemplate?.name}" para um contato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Telefone (com código do país) *</label>
              <Input
                placeholder="+351912345678"
                value={sendData.phone}
                onChange={(e) => setSendData({ ...sendData, phone: e.target.value })}
              />
            </div>

            {selectedTemplate && selectedTemplate.variables && (
              <div>
                <label className="text-sm font-medium mb-2 block">Variáveis</label>
                {Object.keys(sendData.variables).map((varName) => (
                  <div key={varName} className="mb-2">
                    <Input
                      placeholder={varName}
                      value={sendData.variables[varName]}
                      onChange={(e) => setSendData({
                        ...sendData,
                        variables: {
                          ...sendData.variables,
                          [varName]: e.target.value
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            )}

            <Button onClick={sendTemplate} className="w-full">
              <PaperPlane size={16} className="mr-2" />
              Enviar Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum template criado ainda
              </p>
              <Button onClick={openCreateDialog} className="mt-4" variant="outline">
                <Plus size={20} className="mr-2" /> Criar Primeiro Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText size={20} />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <Badge variant="outline" className="mr-2">{template.category}</Badge>
                      {getStatusBadge(template.status)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status warnings */}
                {template.status === 'pending' && (
                  <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <WarningCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-xs">
                      Template em revisão. Aguarde aprovação do WhatsApp (24-48h).
                    </AlertDescription>
                  </Alert>
                )}
                
                {template.status === 'rejected' && template.rejection_reason && (
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-xs">
                      <strong>Rejeitado:</strong> {template.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}
                
                {template.header_text && (
                  <div className="text-sm">
                    <strong className="text-primary">Cabeçalho:</strong>
                    <p className="mt-1">{template.header_text}</p>
                  </div>
                )}
                
                <div className="text-sm">
                  <strong className="text-primary">Corpo:</strong>
                  <p className="mt-1 line-clamp-3">{template.body_text}</p>
                </div>

                {template.footer_text && (
                  <div className="text-sm text-muted-foreground italic">
                    {template.footer_text}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  {/* Submit for approval button - only for draft or rejected templates */}
                  {(template.status === 'draft' || template.status === 'rejected') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => submitTemplateForApproval(template)}
                    >
                      <CloudArrowUp size={16} className="mr-2" />
                      {template.status === 'rejected' ? 'Reenviar para Aprovação WhatsApp' : 'Submeter para Aprovação WhatsApp'}
                    </Button>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => openSendDialog(template)}
                    >
                      <PaperPlane size={16} className="mr-1" />
                      Enviar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                      disabled={template.status === 'pending'}
                    >
                      <PencilSimple size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      disabled={template.status === 'approved'}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

