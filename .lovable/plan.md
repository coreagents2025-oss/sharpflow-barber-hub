
## Diagnóstico do Problema

Os logs de autenticação mostram exatamente o erro:

```
"Session not found" - session id doesn't exist
status: 403 on POST /logout
referer: https://www.barberplus.shop/
```

O problema é claro: o código atual em `signOut()` faz `throw error` quando o logout falha. Quando a sessão já expirou ou não existe no servidor (mas o estado local ainda tem dados), o Supabase retorna 403 — e o `throw error` faz o toast aparecer e **interrompe o fluxo**, impedindo que o estado local seja limpo e o usuário seja redirecionado.

## Causa raiz

```typescript
const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;           // ← lança exceção mesmo em "session not found"
    toast.success('Logout realizado');
  } catch (error: any) {
    toast.error(error.message);       // ← mostra erro ao usuário
    throw error;                      // ← relança, nunca limpa o estado
  }
};
```

Quando a sessão não existe no servidor, o `signOut()` falha mas a sessão local no `localStorage` permanece intacta. O usuário fica "preso" logado.

## Solução

### 1. Tornar o logout tolerante a falhas de sessão

Se `signOut()` falhar com "Session not found" (ou qualquer 403), deve:
- Ignorar o erro (sessão já não existe no servidor, está tudo bem)
- Limpar o estado local manualmente: `setUser(null)`, `setSession(null)`, `setUserRole(null)`
- Limpar o localStorage da sessão do Supabase
- Redirecionar normalmente

### 2. Adicionar redirecionamento direto no signOut

O `AuthRedirect` depende de `user` e `userRole` mudando para redirecionar. Mas se o estado não limpa (por causa do throw), o redirect nunca ocorre. Vamos garantir que o redirecionamento aconteça diretamente no `signOut`.

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.tsx` | Refatorar `signOut()` para usar `{ scope: 'local' }` e nunca relançar o erro — mesmo em caso de falha no servidor, limpar estado local e redirecionar |

## Código da correção

```typescript
const signOut = async () => {
  try {
    // scope: 'local' garante que mesmo sem sessão no servidor,
    // o estado local é limpo
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error: any) {
    // Silencia erros de "session not found" — sessão já expirou,
    // basta limpar o estado local
    console.warn('signOut error (ignorado):', error?.message);
  } finally {
    // Sempre limpar estado local independente de erro no servidor
    setUser(null);
    setSession(null);
    setUserRole(null);
    setBarbershopId(null);
  }
  toast.success('Logout realizado com sucesso!');
  window.location.href = '/auth';
};
```

O `scope: 'local'` do Supabase limpa o localStorage e o estado interno do cliente mesmo quando o servidor retorna 403. O `finally` garante que os estados React também sejam zerados. O `window.location.href` força o redirecionamento sem depender do `AuthRedirect`.
