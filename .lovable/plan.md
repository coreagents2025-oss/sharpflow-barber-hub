
## Diagnóstico

O `BookingModal` nunca verifica se há um usuário logado. No passo "Seus dados" (último passo), os campos Nome, Telefone e E-mail estão sempre vazios — mesmo que o cliente já tenha feito login no portal do assinante com todos esses dados disponíveis nas tabelas `profiles` (full_name, phone) e `auth.user` (email).

O fluxo de `PublicCatalog.tsx` também não passa nenhuma informação do usuário logado para o modal.

---

## Solução — Simples e direta

### 1. `PublicCatalog.tsx` — detectar usuário logado

Importar `useAuth` e passar o usuário atual como prop para o `BookingModal`:

```tsx
const { user } = useAuth();
// ...
<BookingModal
  ...
  loggedInUser={user}
/>
```

### 2. `BookingModal.tsx` — aceitar prop `loggedInUser` e pré-carregar os dados

**Nova prop:**
```typescript
loggedInUser?: User | null;
```

**Novo `useEffect`** que roda quando o modal abre e há um usuário logado:
```typescript
useEffect(() => {
  if (isOpen && loggedInUser) {
    // Pre-fill email from auth
    setClientEmail(loggedInUser.email || '');
    
    // Pre-fill name and phone from profiles table
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', loggedInUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setClientName(data.full_name);
        if (data?.phone) setClientPhone(data.phone);
      });
  }
}, [isOpen, loggedInUser]);
```

**UI no passo "Seus dados":** quando o usuário estiver logado, mostrar um pequeno aviso verde "✓ Dados preenchidos da sua conta" em vez de campos em branco. Os campos continuam editáveis caso o cliente queira usar outro nome/telefone.

**Layout proposto no passo final (usuário logado):**
```
┌─────────────────────────────────────────┐
│ ✓ Dados preenchidos da sua conta        │  ← badge verde
│                                          │
│ Seu nome                                 │
│ [João Silva                           ]  │  ← pré-preenchido
│                                          │
│ Telefone / WhatsApp                      │
│ [(11) 99999-9999                      ]  │  ← pré-preenchido
│                                          │
│ E-mail                                   │
│ [joao@email.com                       ]  │  ← pré-preenchido
└─────────────────────────────────────────┘
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/PublicCatalog.tsx` | Importar `useAuth`, passar `loggedInUser={user}` para `<BookingModal>` |
| `src/components/BookingModal.tsx` | Adicionar prop `loggedInUser`, `useEffect` para buscar dados do perfil e pré-preencher os campos, e badge visual indicando que os dados foram carregados |

Nenhuma mudança de banco necessária — os dados já existem em `profiles` e `auth.user`.
