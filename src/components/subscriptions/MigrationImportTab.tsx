import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { parse, isValid } from "date-fns";

interface ParsedRow {
  line: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  plan_name: string;
  plan_price: string;
  billing_interval: string;
  billing_method: string;
  credits_remaining: string;
  started_at: string;
  expires_at: string;
  next_billing_date: string;
  auto_renew: string;
  status: string;
  notes: string;
  errors: string[];
}

// Column mapping: PT-BR header -> internal key
const COLUMN_MAP: Record<string, string> = {
  nome_cliente: "client_name",
  telefone: "client_phone",
  email: "client_email",
  nome_plano: "plan_name",
  preco: "plan_price",
  recorrencia: "billing_interval",
  metodo_cobranca: "billing_method",
  creditos_restantes: "credits_remaining",
  data_inicio: "started_at",
  data_vencimento: "expires_at",
  proxima_cobranca: "next_billing_date",
  renovacao_auto: "auto_renew",
  status: "status",
  observacoes: "notes",
  // Legacy english support
  client_name: "client_name",
  client_phone: "client_phone",
  plan_name: "plan_name",
  plan_price: "plan_price",
  billing_interval: "billing_interval",
  credits_remaining: "credits_remaining",
  started_at: "started_at",
  expires_at: "expires_at",
  next_billing_date: "next_billing_date",
  notes: "notes",
};

const RECURRENCE_MAP: Record<string, string> = {
  mensal: "monthly",
  semanal: "weekly",
  quinzenal: "biweekly",
  monthly: "monthly",
  weekly: "weekly",
  biweekly: "biweekly",
};

const BILLING_METHOD_MAP: Record<string, string> = {
  pix: "pix",
  cartao: "card",
  cartão: "card",
  card: "card",
  boleto: "boleto",
  dinheiro: "cash",
  cash: "cash",
};

const CSV_TEMPLATE = `nome_cliente,telefone,email,nome_plano,preco,recorrencia,metodo_cobranca,creditos_restantes,data_inicio,data_vencimento,proxima_cobranca,renovacao_auto,status,observacoes
João Silva,11999998888,joao@email.com,Plano Mensal,89.90,mensal,pix,3,01/01/2025,01/02/2025,01/02/2025,sim,ativo,Cliente VIP
Maria Santos,11988887777,,Plano Semanal,29.90,semanal,cartao,1,15/01/2025,22/01/2025,22/01/2025,sim,ativo,
Carlos Oliveira,11977776666,carlos@email.com,Plano Quinzenal,49.90,quinzenal,dinheiro,2,10/01/2025,24/01/2025,24/01/2025,nao,ativo,Prefere sábado`;

const STATUS_MAP: Record<string, string> = {
  ativo: "active",
  active: "active",
  expirado: "expired",
  expired: "expired",
  cancelado: "cancelled",
  cancelled: "cancelled",
};

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = parse(value.trim(), "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}

function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  if (!row.client_name.trim()) errors.push("Nome obrigatório");
  if (!row.client_phone.trim() || row.client_phone.replace(/\D/g, "").length < 8) errors.push("Telefone inválido");
  if (!row.plan_name.trim()) errors.push("Nome do plano obrigatório");
  const price = parseFloat(row.plan_price.replace(",", "."));
  if (isNaN(price) || price <= 0) errors.push("Preço inválido");
  const interval = RECURRENCE_MAP[row.billing_interval?.trim().toLowerCase()];
  if (!interval) errors.push("Recorrência: mensal, semanal ou quinzenal");
  if (row.billing_method.trim()) {
    const method = BILLING_METHOD_MAP[row.billing_method.trim().toLowerCase()];
    if (!method) errors.push("Método: pix, cartao, boleto ou dinheiro");
  }
  const credits = parseInt(row.credits_remaining);
  if (isNaN(credits) || credits < 0) errors.push("Créditos inválidos");
  if (!parseDate(row.started_at)) errors.push("Data início inválida (dd/MM/aaaa)");
  if (!parseDate(row.expires_at)) errors.push("Data vencimento inválida (dd/MM/aaaa)");
  if (row.next_billing_date && !parseDate(row.next_billing_date)) errors.push("Próxima cobrança inválida (dd/MM/aaaa)");
  const status = STATUS_MAP[row.status?.trim().toLowerCase() || "ativo"];
  if (!status) errors.push("Status: ativo, expirado ou cancelado");
  return errors;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const rawHeaders = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[""]/g, ""));
  const headers = rawHeaders.map(h => COLUMN_MAP[h] || h);

  return lines.slice(1).map((line, idx) => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const get = (key: string) => values[headers.indexOf(key)] || "";
    const row: ParsedRow = {
      line: idx + 2,
      client_name: get("client_name"),
      client_phone: get("client_phone"),
      client_email: get("client_email"),
      plan_name: get("plan_name"),
      plan_price: get("plan_price"),
      billing_interval: get("billing_interval"),
      billing_method: get("billing_method"),
      credits_remaining: get("credits_remaining"),
      started_at: get("started_at"),
      expires_at: get("expires_at"),
      next_billing_date: get("next_billing_date"),
      auto_renew: get("auto_renew"),
      status: get("status") || "ativo",
      notes: get("notes"),
      errors: [],
    };
    row.errors = validateRow(row);
    return row;
  });
}

interface Props {
  plans: { id: string; name: string; price: number; billing_interval: string }[];
  onImportComplete: () => void;
}

export function MigrationImportTab({ plans, onImportComplete }: Props) {
  const { barbershopId } = useAuth();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_migracao_assinaturas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!barbershopId || validRows.length === 0) return;
    setImporting(true);

    let imported = 0;
    let errors = 0;

    try {
      const planKeys = new Map<string, string>();
      for (const existingPlan of plans) {
        const key = `${existingPlan.name.toLowerCase()}|${existingPlan.price}|${existingPlan.billing_interval}`;
        planKeys.set(key, existingPlan.id);
      }

      const newPlanKeys = new Set<string>();
      for (const row of validRows) {
        const interval = RECURRENCE_MAP[row.billing_interval.trim().toLowerCase()] || "monthly";
        const price = parseFloat(row.plan_price.replace(",", "."));
        const key = `${row.plan_name.trim().toLowerCase()}|${price}|${interval}`;
        if (!planKeys.has(key) && !newPlanKeys.has(key)) {
          newPlanKeys.add(key);
          const method = BILLING_METHOD_MAP[row.billing_method?.trim().toLowerCase()] || "pix";
          const autoRenew = !["nao", "não", "no", "false", "0"].includes(row.auto_renew?.trim().toLowerCase());
          const { data, error } = await supabase.from("subscription_plans").insert({
            barbershop_id: barbershopId,
            name: row.plan_name.trim(),
            price,
            credits_per_month: parseInt(row.credits_remaining) || 0,
            billing_interval: interval,
            billing_method: method,
            auto_renew: autoRenew,
            reminder_days_before: 3,
          } as any).select("id").single();
          if (data) {
            planKeys.set(key, (data as any).id);
          } else {
            console.error("Error creating plan:", error);
          }
        }
      }

      for (const row of validRows) {
        try {
          const { data: leadId, error: leadError } = await supabase.rpc("find_or_create_lead", {
            _barbershop_id: barbershopId,
            _phone: row.client_phone.trim(),
            _full_name: row.client_name.trim(),
            _email: row.client_email.trim() || null,
            _source: "migration",
          });

          if (leadError || !leadId) {
            console.error("Lead error:", leadError);
            errors++;
            continue;
          }

          const interval = RECURRENCE_MAP[row.billing_interval.trim().toLowerCase()] || "monthly";
          const price = parseFloat(row.plan_price.replace(",", "."));
          const planKey = `${row.plan_name.trim().toLowerCase()}|${price}|${interval}`;
          const planId = planKeys.get(planKey);
          if (!planId) { errors++; continue; }

          const startedAt = parseDate(row.started_at)!;
          const expiresAt = parseDate(row.expires_at)!;
          const nextBilling = parseDate(row.next_billing_date);
          const autoRenew = !["nao", "não", "no", "false", "0"].includes(row.auto_renew?.trim().toLowerCase());
          const status = STATUS_MAP[row.status.trim().toLowerCase()] || "active";

          const { error: subError } = await supabase.from("client_subscriptions").insert({
            barbershop_id: barbershopId,
            lead_id: leadId,
            plan_id: planId,
            status,
            credits_remaining: parseInt(row.credits_remaining),
            started_at: startedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            next_billing_date: nextBilling?.toISOString() || expiresAt.toISOString(),
            billing_interval: interval,
            auto_renew: autoRenew,
          } as any);

          if (subError) {
            console.error("Subscription error:", subError);
            errors++;
          } else {
            imported++;
          }
        } catch (err) {
          console.error("Row import error:", err);
          errors++;
        }
      }

      toast.success(`Importação concluída: ${imported} registros importados${errors > 0 ? `, ${errors} erros` : ""}`);
      onImportComplete();
      setRows([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Erro durante a importação");
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setRows([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Instructions Card */}
      <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
        <Card className="border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Como preencher a planilha</CardTitle>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {showInstructions ? "Ocultar" : "Ver instruções"}
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">Colunas obrigatórias</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <code className="bg-muted px-1 rounded text-xs">nome_cliente</code> — Nome completo</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">telefone</code> — Mínimo 8 dígitos</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">nome_plano</code> — Ex: Plano Mensal</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">preco</code> — Ex: 89.90</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">recorrencia</code> — mensal, semanal, quinzenal</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">creditos_restantes</code> — Número inteiro</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">data_inicio</code> — dd/MM/aaaa</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">data_vencimento</code> — dd/MM/aaaa</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">Colunas opcionais</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <code className="bg-muted px-1 rounded text-xs">email</code> — Email do cliente</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">metodo_cobranca</code> — pix, cartao, boleto, dinheiro</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">proxima_cobranca</code> — dd/MM/aaaa</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">renovacao_auto</code> — sim ou nao</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">status</code> — ativo, expirado, cancelado</li>
                    <li>• <code className="bg-muted px-1 rounded text-xs">observacoes</code> — Texto livre</li>
                  </ul>
                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    <strong>Dica:</strong> Datas no formato dd/MM/aaaa (ex: 15/03/2025). Use vírgula como separador de colunas.
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Importação em Massa de Assinantes</CardTitle>
          <CardDescription>
            Importe clientes e assinaturas existentes via CSV. Os dados originais (datas, créditos) serão preservados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download Template CSV
            </Button>
            <div className="relative">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" /> {fileName || "Upload CSV"}
              </Button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {validRows.length} válidos
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {errorRows.length} com erro
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" /> {fileName}
                </Badge>
              </div>

              <div className="border rounded-md overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Recorrência</TableHead>
                      <TableHead>Créditos</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className={row.errors.length > 0 ? "bg-destructive/10" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{row.line}</TableCell>
                        <TableCell className="font-medium">{row.client_name}</TableCell>
                        <TableCell>{row.client_phone}</TableCell>
                        <TableCell>{row.plan_name}</TableCell>
                        <TableCell>R$ {row.plan_price}</TableCell>
                        <TableCell className="text-xs">{row.billing_interval}</TableCell>
                        <TableCell>{row.credits_remaining}</TableCell>
                        <TableCell className="text-xs">{row.started_at}</TableCell>
                        <TableCell className="text-xs">{row.expires_at}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <span className="text-xs text-destructive">{row.errors.join("; ")}</span>
                          ) : (
                            <Badge variant="outline" className="text-xs">{row.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClear} disabled={importing}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                  ) : (
                    `Importar ${validRows.length} Registros`
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
