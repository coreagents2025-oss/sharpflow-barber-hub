

## Ajuste no painel do assinante — histórico completo de agendamentos

### Problema atual

O `ClientDashboard` já tem abas "Próximos" e "Histórico", mas existem **3 limitações**:

1. **Agendamentos via CRM não aparecem**: A query filtra por `client_id = user.id`, mas agendamentos criados manualmente pelo barbeiro usam `lead_id` (não `client_id`). Resultado: o cliente não vê agendamentos feitos para ele via CRM.

2. **Limite baixo**: Apenas 20 agendamentos passados são carregados — clientes frequentes não veem o histórico completo.

3. **Multi-serviço não exibido**: Com a nova estrutura `appointment_services`, um agendamento pode ter vários serviços, mas o dashboard só mostra o serviço principal (`service_id`).

---

### Plano de implementação

**Arquivo 1 — `src/hooks/useClientPortal.ts`**

- Buscar o `lead_id` vinculado ao cliente (já disponível em `client_barbershop_links.lead_id`)
- Usar filtro OR: `client_id.eq.{userId},lead_id.eq.{leadId}` nas queries de appointments (mesmo padrão já usado para subscriptions)
- Aumentar limite de histórico para 50
- Adicionar join com `appointment_services` para trazer todos os serviços de cada agendamento

**Arquivo 2 — `src/pages/ClientDashboard.tsx`**

- Exibir lista de serviços do agendamento (quando multi-serviço) em vez de apenas o serviço principal
- Mostrar duração total do agendamento
- Adicionar contador de "Total de atendimentos" no topo da seção de histórico como resumo

---

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useClientPortal.ts` | Query OR com lead_id; join appointment_services; limite 50 |
| `src/pages/ClientDashboard.tsx` | Exibir multi-serviços; contador de atendimentos no histórico |

