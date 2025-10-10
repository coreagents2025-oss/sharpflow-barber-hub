# Contribuindo para o Sistema de Gestão de Barbearia

Obrigado por considerar contribuir com este projeto! 🎉

## Como Contribuir

### Reportando Bugs

Se você encontrou um bug, por favor crie uma issue incluindo:

- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs comportamento atual
- Screenshots (se aplicável)
- Versão do navegador/sistema operacional

### Sugerindo Melhorias

Para sugerir uma nova funcionalidade:

- Descreva claramente a funcionalidade
- Explique o problema que ela resolve
- Forneça exemplos de uso
- Se possível, inclua mockups ou wireframes

### Pull Requests

1. **Fork o repositório**

2. **Clone seu fork**
   ```bash
   git clone https://github.com/seu-usuario/nome-do-projeto.git
   ```

3. **Crie uma branch**
   ```bash
   git checkout -b feature/minha-feature
   # ou
   git checkout -b fix/meu-bugfix
   ```

4. **Faça suas alterações**
   - Siga o estilo de código existente
   - Adicione comentários quando necessário
   - Teste suas mudanças

5. **Commit suas mudanças**
   ```bash
   git commit -m "feat: adiciona nova funcionalidade X"
   # ou
   git commit -m "fix: corrige problema Y"
   ```

   **Convenção de Commits:**
   - `feat:` Nova funcionalidade
   - `fix:` Correção de bug
   - `docs:` Mudanças na documentação
   - `style:` Formatação, ponto e vírgula, etc
   - `refactor:` Refatoração de código
   - `test:` Adição ou modificação de testes
   - `chore:` Atualizações de build, configs, etc

6. **Push para o GitHub**
   ```bash
   git push origin feature/minha-feature
   ```

7. **Abra um Pull Request**
   - Descreva suas mudanças
   - Referencie issues relacionadas
   - Adicione screenshots se aplicável

## Padrões de Código

### TypeScript
- Use tipos explícitos sempre que possível
- Evite `any`, prefira `unknown` quando necessário
- Crie interfaces para estruturas de dados complexas

### React
- Use componentes funcionais com hooks
- Mantenha componentes pequenos e focados
- Extraia lógica complexa para custom hooks

### Estilização
- Use Tailwind CSS classes
- Prefira tokens do design system (definidos em `index.css`)
- Não use cores diretas, use as variáveis CSS

### Nomenclatura
- Componentes: PascalCase (`BookingModal.tsx`)
- Hooks: camelCase com prefixo `use` (`useBooking.ts`)
- Funções: camelCase (`fetchBarbers`)
- Constantes: UPPER_SNAKE_CASE (`API_URL`)

## Estrutura de Componentes

```typescript
// Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Interfaces/Types
interface MyComponentProps {
  title: string;
  onSave: () => void;
}

// Component
export const MyComponent = ({ title, onSave }: MyComponentProps) => {
  // Hooks
  const [isOpen, setIsOpen] = useState(false);

  // Handlers
  const handleClick = () => {
    // logic
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

## Testes

Antes de submeter um PR, certifique-se de:

- [ ] O código compila sem erros (`npm run build`)
- [ ] Não há erros de TypeScript
- [ ] A funcionalidade foi testada manualmente
- [ ] O código segue os padrões do projeto

## Banco de Dados

Ao adicionar/modificar tabelas:

- Crie uma migration em `supabase/migrations/`
- Documente a estrutura no README.md
- Adicione políticas RLS apropriadas
- Teste as permissões

## Dúvidas?

Não hesite em:
- Abrir uma issue para discussão
- Comentar em PRs existentes
- Pedir ajuda na comunidade

---

Obrigado pela sua contribuição! 🚀
