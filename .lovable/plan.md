
## Diagnóstico preciso

O erro "Auth session missing" é um erro nativo do Supabase JS (`AuthSessionMissingError`) que aparece quando qualquer operação autenticada é executada sem uma sessão válida ativa. Ele não é originado no logout — aparece **depois** que a sessão expira ou é invalidada, quando componentes continuam fazendo chamadas ao Supabase.

Há três causas identificadas no código:

**1. `ClientDashboard.handleSignOut` conflita com `signOut`**
```typescript
// ClientDashboard.tsx
const handleSignOut = async () => {
  await signOut();                                    // dispara window.location.href = '/auth'
  navigate(`/${slug}/cliente`, { replace: true });   // tenta navegar depois, mas já redirecionou
};
```
O `signOut` no hook já faz `window.location.href = '/auth'` — então o `navigate()` subsequente é desnecessário e pode causar problemas de race condition.

**2. `useCashFlow.ts` e `useCommission.ts` chamam `supabase.auth.getUser()`**
Esses hooks chamam `supabase.auth.getUser()` diretamente. Se a sessão tiver expirado, isso lança `AuthSessionMissingError` em vez de retornar `null`.

**3. O `onAuthStateChange` no `useAuth` não chama `setLoading(false)` no caso do listener**
Quando a sessão expira (evento `SIGNED_OUT`), o estado `loading` nunca volta para `false` pelo listener — apenas pelo bloco `getSession`. Isso pode deixar componentes em estado inconsistente.

## Solução

### 1. Remover `navigate()` após `signOut()` no ClientDashboard
O `signOut` já gerencia o redirecionamento via `window.location.href`. Chamar `navigate()` depois é redundante e causa conflito.

### 2. Substituir `supabase.auth.getUser()` por `supabase.auth.getSession()` nos hooks
`getSession()` retorna `null` quando não há sessão, enquanto `getUser()` lança exceção. Essa troca previne o "Auth session missing".

### 3. Garantir `setLoading(false)` no listener `onAuthStateChange`
Adicionar `setLoading(false)` no bloco `else` do listener (quando não há sessão), para que o estado de loading seja sempre resolvido.

### 4. Tratar `AuthSessionMissingError` globalmente
Adicionar um handler no listener que, ao receber evento `SIGNED_OUT` ou `TOKEN_REFRESHED` com sessão nula, limpa o estado local — prevenindo que componentes continuem tentando fazer chamadas autenticadas.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.tsx` | Adicionar `setLoading(false)` no listener para evento sem sessão; tratar `SIGNED_OUT` explicitamente |
| `src/pages/ClientDashboard.tsx` | Remover `navigate()` após `signOut()` — o hook já redireciona |
| `src/hooks/useCashFlow.ts` | Trocar `getUser()` por `getSession()` e verificar se sessão existe antes de inserir |
| `src/hooks/useCommission.ts` | Trocar `getUser()` por `getSession()` |
