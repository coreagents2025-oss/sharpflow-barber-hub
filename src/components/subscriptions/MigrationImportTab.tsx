import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { parse, isValid, format } from "date-fns";

interface ParsedRow {
  line: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  plan_name: string;
  plan_price: string;
  billing_interval: string;
  credits_remaining: string;
  started_at: string;
  expires_at: string;
  next_billing_date: string;
  status: string;
  notes: string;
  errors: string[];
}

const CSV_TEMPLATE = `client_name,client_phone,client_email,plan_name,plan_price,billing_interval,credits_remaining,started_at,expires_at,next_billing_date,status,notes
João Silva,11999998888,joao@email.com,Plano Mensal,89.90,monthly,3,01/01/2025,01/02/2025,01/02/2025,active,Cliente VIP
Maria Santos,11988887777,,Plano Semanal,29.90,weekly,1,15/01/2025,22/01/2025,22/01/2025,active,`;

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
  const price = parseFloat(row.plan_price);
  if (isNaN(price) || price <= 0) errors.push("Preço inválido");
  if (!["monthly", "weekly", "biweekly"].includes(row.billing_interval?.trim())) errors.push("Intervalo deve ser monthly, weekly ou biweekly");
  const credits = parseInt(row.credits_remaining);
  if (isNaN(credits) || credits < 0) errors.push("Créditos inválidos");
  if (!parseDate(row.started_at)) errors.push("started_at inválida (dd/MM/yyyy)");
  if (!parseDate(row.expires_at)) errors.push("expires_at inválida (dd/MM/yyyy)");
  if (row.next_billing_date && !parseDate(row.next_billing_date)) errors.push("next_billing_date inválida (dd/MM/yyyy)");
  const status = row.status?.trim() || "active";
  if (!["active", "expired", "cancelled"].includes(status)) errors.push("Status deve ser active, expired ou cancelled");
  return errors;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map((line, idx) => {
    const values = line.split(",").map(v => v.trim());
    const get = (key: string) => values[headers.indexOf(key)] || "";
    const row: ParsedRow = {
      line: idx + 2,
      client_name: get("client_name"),
      client_phone: get("client_phone"),
      client_email: get("client_email"),
      plan_name: get("plan_name"),
      plan_price: get("plan_price"),
      billing_interval: get("billing_interval"),
      credits_remaining: get("credits_remaining"),
      started_at: get("started_at"),
      expires_at: get("expires_at"),
      next_billing_date: get("next_billing_date"),
      status: get("status") || "active",
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
      // 1. Deduplicate plans: group by name+price+interval
      const planKeys = new Map<string, string>(); // key -> plan_id
      for (const existingPlan of plans) {
        const key = `${existingPlan.name.toLowerCase()}|${existingPlan.price}|${existingPlan.billing_interval}`;
        planKeys.set(key, existingPlan.id);
      }

      // Create missing plans
      const newPlanKeys = new Set<string>();
      for (const row of validRows) {
        const key = `${row.plan_name.trim().toLowerCase()}|${parseFloat(row.plan_price)}|${row.billing_interval.trim()}`;
        if (!planKeys.has(key) && !newPlanKeys.has(key)) {
          newPlanKeys.add(key);
          const { data, error } = await supabase.from("subscription_plans").insert({
            barbershop_id: barbershopId,
            name: row.plan_name.trim(),
            price: parseFloat(row.plan_price),
            credits_per_month: parseInt(row.credits_remaining) || 0,
            billing_interval: row.billing_interval.trim(),
            billing_method: "pix",
            auto_renew: true,
            reminder_days_before: 3,
          } as any).select("id").single();
          if (data) {
            planKeys.set(key, (data as any).id);
          } else {
            console.error("Error creating plan:", error);
          }
        }
      }

      // 2. Import each valid row
      for (const row of validRows) {
        try {
          // Find or create lead
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

          const planKey = `${row.plan_name.trim().toLowerCase()}|${parseFloat(row.plan_price)}|${row.billing_interval.trim()}`;
          const planId = planKeys.get(planKey);
          if (!planId) {
            errors++;
            continue;
          }

          const startedAt = parseDate(row.started_at)!;
          const expiresAt = parseDate(row.expires_at)!;
          const nextBilling = parseDate(row.next_billing_date);

          const { error: subError } = await supabase.from("client_subscriptions").insert({
            barbershop_id: barbershopId,
            lead_id: leadId,
            plan_id: planId,
            status: row.status.trim() || "active",
            credits_remaining: parseInt(row.credits_remaining),
            started_at: startedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            next_billing_date: nextBilling?.toISOString() || expiresAt.toISOString(),
            billing_interval: row.billing_interval.trim(),
            auto_renew: true,
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Importação em Massa de Assinantes</CardTitle>
          <CardDescription>
            Importe clientes e assinaturas existentes via CSV. Os dados originais (datas, créditos) serão preservados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Download template */}
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

          {/* Step 2: Preview */}
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
                      <TableHead>Créditos</TableHead>
                      <TableHead>Expira em</TableHead>
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
                        <TableCell>{row.credits_remaining}</TableCell>
                        <TableCell>{row.expires_at}</TableCell>
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
