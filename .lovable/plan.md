

## Plano: Calculadora de Precificacao de Servicos

Adicionar uma nova aba "Precificacao" na pagina Financeiro, onde o barbeiro pode inserir seus custos fixos, custos variaveis e margem de lucro desejada para calcular o preco ideal de cada servico.

### O que sera criado

#### 1. Novo componente: `ServicePricingCalculator`

Uma calculadora client-side (sem necessidade de tabelas novas no banco) com os seguintes campos:

**Custos Fixos (mensais):**
- Aluguel
- Agua/Luz/Internet
- Produtos (shampoo, cera, laminas, etc.)
- Ferramentas/Manutencao
- Marketing
- Outros custos fixos

**Custos Variaveis (por servico):**
- Custo de produto por servico (ex: R$3 de lamina por barba)
- Tempo medio do servico (minutos)

**Parametros:**
- Quantidade estimada de servicos por mes
- Margem de lucro desejada (%)

**Resultado calculado:**
- Custo fixo por servico = Total custos fixos / Qtd servicos por mes
- Custo total por servico = Custo fixo por servico + Custo variavel
- Preco sugerido = Custo total / (1 - margem/100)
- Lucro por servico = Preco sugerido - Custo total

O componente mostrara um card de resumo com o preco sugerido e a composicao visual (custos fixos, variaveis, lucro).

#### 2. Adicionar aba na pagina Financial

Adicionar uma quarta aba "Precificacao" nas tabs existentes (Caixa, Comissoes, Relatorios, **Precificacao**).

### Arquivos a modificar/criar

| Arquivo | Acao |
|---------|------|
| `src/components/financial/ServicePricingCalculator.tsx` | Criar - componente da calculadora |
| `src/pages/Financial.tsx` | Modificar - adicionar 4a aba com o novo componente |

### Detalhes tecnicos

- Calculadora 100% client-side usando useState, sem banco de dados
- Usa componentes existentes: Card, Input, Label, Slider
- Layout responsivo com grid
- Resultado exibido em tempo real conforme o usuario digita
- Formula: `preco_sugerido = (custos_fixos_mensal / qtd_servicos + custo_variavel) / (1 - margem_lucro / 100)`
- TabsList passa de `grid-cols-3` para `grid-cols-4`
