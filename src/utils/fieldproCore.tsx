// ======================================================================
// Tipos (TypeScript) — definem a estrutura das entidades do app
// ======================================================================
export type Perfil = "campo" | "escritorio";
export type Status = "Andamento" | "Concluída (Campo)" | "Finalizada";

// Objeto principal da operação: uma solicitação/demanda no sistema
export interface Solicitacao {
  id: number;
  solicitacao: string;
  cliente: string;
  regional: string;
  municipio: string;
  detalhes: string;
  prazo: string; // formato exibido dd/mm/yyyy (ou qualquer texto), não ISO
  lat: number;
  lng: number;
  emergencial: boolean;
  equipe: string; // vazio quando desatribuída
  fotos: string[];// URLs (ou ObjectURLs no fluxo local)
  status: Status;
}

// Estrutura do formulário de criação (Escritório)
export interface FormEscritorio {
  nomeSolicitacao: string;
  nomeCliente: string;
  regional: string;
  municipio: string;
  povoado: string;
  telefone: string;
  detalhes: string;
  lat: string; // armazenado como texto para validar digitação
  lng: string; // armazenado como texto para validar digitação
  prioridade: "normal" | "emergencial";
  equipe: string;
  fotos: (File | string)[]
  prazo: string;// "YYYY-MM-DD" no input (date) -> convertido para "dd/mm/yyyy"
}

import React from "react";
import { supabase } from "@/lib/supabase";


// ======================================================================
// registrarProducao — grava uma linha de produção no Supabase
// Tabela: producao (equipe, solicitacao, cliente, municipio, finished_at)
// ======================================================================
export async function registrarProducao(args: {
  equipe: string; solicitacao: string; cliente?: string; municipio?: string;
}) {
  const { error } = await supabase
    .from("producao")
    .insert([{
      equipe: args.equipe,
      solicitacao: args.solicitacao,
      cliente: args.cliente ?? null,
      municipio: args.municipio ?? null,
      finished_at: new Date().toISOString(),
    }]);
  if (error) console.error("Erro ao gravar produção:", error);
}


  // Sobe imagens para o Storage e devolve URLs públicas
  export async function uploadImagensSolicitacao(
    files: (File | string)[],
    solicitacaoId: string // pode ser o nº da solicitação
  ): Promise<string[]> {
    const urls: string[] = [];

    for (const f of files) {
      // Se já for string (URL antiga), só reaproveita
      if (typeof f === "string") {
        urls.push(f);
        continue;
      }

      // Descobre extensão do arquivo (jpg, png, etc.)
      const ext = f.name.split(".").pop() || "jpg";

      // Gera um nome único
      const fileName = `${solicitacaoId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      // Pasta opcional dentro do bucket
      const filePath = `solicitacoes/${fileName}`;

      // Upload para o bucket
      const { error } = await supabase
        .storage
        .from("fieldpro-fotos") // <-- nome do bucket
        .upload(filePath, f, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Erro ao fazer upload da imagem:", error);
        continue;
      }

      // Pega URL pública
      const { data } = supabase
        .storage
        .from("fieldpro-fotos")
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        urls.push(data.publicUrl);
      }
    }

    return urls;
  }


export type TipoAcesso = "campo" | "escritorio";

export interface AcessoRow {
  id: number;
  codigo: string;
  tipo: TipoAcesso;
  equipe: string | null;
  ativo: boolean;
}


export async function loginUsuario(username: string, senha: string) {
  const { data, error } = await supabase
    .from("Usuarios")
    .select("id, username, senha, tipo, equipe, ativo")
    .eq("username", username)
    .eq("ativo", true)
    .single();

  if (error || !data) {
    return { ok: false as const, error: "Usuário não encontrado ou inativo." };
  }

  if (data.senha !== senha) {
    return { ok: false as const, error: "Senha incorreta." };
  }

  return {
    ok: true as const,
    usuario: {
      id: data.id,
      username: data.username,
      tipo: data.tipo,
      equipe: data.equipe,
    },
  };
}


// ===================================================================
// registrarSolicitacao – grava uma nova solicitação no Supabase
// ===================================================================
export async function registrarSolicitacao(args: {
  solicitacao: string;
  cliente: string;
  regional: string;
  municipio: string;
  detalhes: string;
  prazo: string;
  lat: number;
  lng: number;
  emergencial: boolean;
  equipe: string;
  status: string;   // "Andamento", "Concluída (Campo)", etc
  fotos: string[];
}) {
  const { data, error } = await supabase
    .from("Solicitacao")   // <== MESMO NOME DA TABELA DO SELECT
    .insert([
      {
        solicitacao: args.solicitacao,
        cliente: args.cliente,
        regional: args.regional,
        municipio: args.municipio,
        detalhes: args.detalhes,
        prazo: args.prazo,
        lat: args.lat,
        lng: args.lng,
        emergencial: args.emergencial,
        equipe: args.equipe,
        status: args.status,
        fotos: args.fotos,
      }
    ])
    .select()
    .single(); // pega o registro inserido

  if (error) {
    console.error(
      "Erro ao gravar solicitação:",
      error.message,
      error.details,
      error.hint
    );
    alert("Erro ao gravar solicitação. Veja o console.");
    return { ok: false as const, error };
  }

  console.log("Solicitação salva no Supabase com sucesso!", data);
  return { ok: true as const, data };
}

export async function atualizarSolicitacao(
  id: number,
  patch: {
    solicitacao?: string;
    cliente?: string;
    regional?: string;
    municipio?: string;
    detalhes?: string;
    prazo?: string;
    lat?: number;
    lng?: number;
    emergencial?: boolean;
    equipe?: string;
    status?: string;
    fotos?: string[];
  }
) {
  const { data, error } = await supabase
    .from("Solicitacao")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "Erro ao atualizar solicitação:",
      error.message,
      error.details,
      error.hint
    );
    alert("Erro ao atualizar solicitação. Veja o console.");
    return { ok: false as const, error };
  }

  console.log("Solicitação atualizada no Supabase!", data);
  return { ok: true as const, data };
}


// ======================================================================
// Geolocalização contínua (watchPosition) para trilha
// Salva pontos de GPS na tabela "trilha_pontos" (Supabase)
// ======================================================================
export let watchId: number | null = null;

// Inicia o tracking contínuo do GPS para a equipe informada
export function iniciarTrilha(equipe: string) {
  if (!navigator.geolocation) return;
  if (!equipe) return;
  if (watchId !== null) return; // evita iniciar duas vezes

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      // Insere ponto na trilha no Supabase
      const { error } = await supabase
        .from("trilha_pontos")
        .insert([{ equipe, lat, lng, ts: new Date().toISOString() }]);

      if (error) console.error("Erro trilha:", error);
    },
    (err) => console.warn("GPS error:", err),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}

// Encerra o tracking se estiver ativo
export function pararTrilha() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// ======================================================================
// Funções puras — facilitam testes (não causam efeitos colaterais)
// ======================================================================

// Marca como "Concluída (Campo)"
export function concluirCampoPure(list: Solicitacao[], id: number): Solicitacao[] {
  return list.map((s) => (s.id === id ? { ...s, status: "Concluída (Campo)" as Status } : s));
}

// Marca como "Finalizada" e zera equipe
export function finalizarEscritorioPure(list: Solicitacao[], id: number): Solicitacao[] {
  return list.map((s) => (s.id === id ? { ...s, status: "Finalizada" as Status, equipe: "" } : s));
}

// Devolve para "Andamento" (se não for "Finalizada")
export function devolverParaCampoPure(list: Solicitacao[], id: number): Solicitacao[] {
  return list.map((s) => {
    if (s.id !== id) return s;
    if (s.status === "Finalizada") return s; // regra: não pode devolver após finalizar
    return { ...s, status: "Andamento" as Status };
  });
}

// Altera a equipe de uma solicitação
export function reatribuirEquipePure(list: Solicitacao[], id: number, equipeNova: string): Solicitacao[] {
  return list.map((s) => (s.id === id ? { ...s, equipe: equipeNova } : s));
}

// ======================================================================
// CSV — parser simples (',' ou ';') e conversores
// ======================================================================
export function parseCSV(text: string): string[][] {
  const sep = text.includes(";") && !text.includes(",") ? ";" : ",";
  // parser simples (sem aspas aninhadas)
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split(sep).map(x => x.trim()));
}

// Cabeçalhos esperados (podem vir em qualquer ordem)
export type CsvRow = {
  solicitacao:string; cliente:string; regional:string; municipio:string;
  povoado?:string; telefone?:string; detalhes?:string;
  lat:string; lng:string; prazo:string; prioridade?:string; equipe:string;
};

// Converte linhas CSV para objetos Solicitacao (normalizando campos)
export function rowsToSolicitacoes(rows: CsvRow[]): Solicitacao[] {
  return rows.map((r) => {
    const latNum = parseFloat(String(r.lat).replace(",", "."));
    const lngNum = parseFloat(String(r.lng).replace(",", "."));
    const emerg = (r.prioridade || "").toLowerCase().startsWith("emer");
    return {
      id: Date.now() + Math.floor(Math.random() * 100000),
      solicitacao: String(r.solicitacao || "").trim().toUpperCase(),
      cliente: String(r.cliente || "").trim().toUpperCase(),
      regional: String(r.regional || ""),
      municipio: String(r.municipio || ""),
      detalhes: String(r.detalhes || r.povoado || "").trim().toUpperCase(),
      prazo: normalizePrazo(String(r.prazo || "")),
      lat: latNum,
      lng: lngNum,
      emergencial: emerg,
      equipe: String(r.equipe || ""),
      fotos: [],
      status: "Andamento" as Status,
    };
  });
}

// Normaliza "YYYY-MM-DD" -> "dd/mm/yyyy"; mantém string como veio se não casar
export function normalizePrazo(p: string){
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
    const [y,m,d] = p.split("-");
    return `${d}/${m}/${y}`;
  }
  return p;
}

// Editar: aplica um patch parcial no item indicado
export function editarSolicitacaoPure(
  list: Solicitacao[],
  id: number,
  patch: Partial<Omit<Solicitacao, "id">>
): Solicitacao[] {
  return list.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

// Validação simples de latitude/longitude
export function isLatLngValid(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ======================================================================
// Prazo — utilitários de data para priorização/etiquetas
// ======================================================================
export const DAY_MS = 24 * 60 * 60 * 1000;

// Zera horas/min/seg para comparar apenas datas
export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
// Diferença (em dias) entre o prazo (dd/mm/yyyy) e a data de hoje
export function prazoDiffDays(prazoStr: string): number | null {
  const m = prazoStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (isNaN(d.getTime())) return null;
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  return Math.floor((target.getTime() - today.getTime()) / DAY_MS);
}

// Ordenação por urgência do prazo (vencidos/mais próximos primeiro),
// depois emergência e depois status
export function comparePorPrazo(a: Solicitacao, b: Solicitacao) {
  const da = prazoDiffDays(a.prazo);
  const db = prazoDiffDays(b.prazo);
  if (da === null && db === null) return 0;
  if (da === null) return 1;   // sem prazo válido vai pro final
  if (db === null) return -1;

  if (da !== db) return da - db; // menor diff (mais urgente) primeiro

  // Empates: emergencial > normal
  if (a.emergencial !== b.emergencial) return a.emergencial ? -1 : 1;

  // Depois, status: Andamento > Concluída (Campo) > Finalizada
  const rank = (s: Status) =>
    s === "Andamento" ? 0 : s === "Concluída (Campo)" ? 1 : 2;
  return rank(a.status) - rank(b.status);
}
// Retorna info do prazo (ou null se formato inválido)
export function prazoInfo(prazoStr: string): null | {
  kind: "overdue" | "today" | "tomorrow" | "future";
  days: number;
  text: string;
  className: string;
} {
  // esperado: dd/mm/yyyy
  const m = prazoStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (isNaN(d.getTime())) return null;

  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.floor((target.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return {
      kind: "overdue",
      days: n,
      text: `Vencido há ${n} dia${n > 1 ? "s" : ""}`,
      className: "text-red-700",
    };
  }
  if (diffDays === 0) {
    return { kind: "today", days: 0, text: "Vence hoje", className: "text-orange-600" };
  }
  if (diffDays === 1) {
    return { kind: "tomorrow", days: 1, text: "Vence amanhã", className: "text-yellow-600" };
  }
  return {
    kind: "future",
    days: diffDays,
    text: `Vence em ${diffDays} dia${diffDays > 1 ? "s" : ""}`,
    className: "text-gray-600",
  };
}
// Normaliza para comparação: remove espaços extras, trim e deixa minúsculo
export function normalizeSolic(str: string) {
  return str.replace(/\s+/g, " ").trim().toLowerCase();
}

// Exporta a lista para CSV (com cabeçalho)
export function toCSV(items: Solicitacao[]): string {
  const header = ["solicitacao","cliente","regional","municipio","povoado","telefone","detalhes","lat","lng","prazo","prioridade","equipe","status"];
  const rows = items.map(s => [
    s.solicitacao, s.cliente, s.regional, s.municipio, "", "", s.detalhes,
    String(s.lat).replace(".", ","), String(s.lng).replace(".", ","),
    s.prazo, s.emergencial?"emergencial":"normal", s.equipe, s.status
  ]);
  return [header, ...rows].map(r => r.map(x => String(x).replace(/;/g, ",")).join(",")).join("\n");
}

// Dispara download de um conteúdo (CSV, txt, etc.)
export function download(filename: string, content: string, mime="text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ======================================================================
// Hook auxiliar — cria ObjectURLs para pré-visualizar (File|string)
// Limpa URLs temporárias no unmount/mudança para evitar vazamento de memória
// ======================================================================
export function useObjectUrls(filesOrStrings: (File | string)[]) {
  const [urls, setUrls] = React.useState<string[]>([]);
  React.useEffect(() => {
    const created = filesOrStrings.map(f => typeof f === "string" ? f : URL.createObjectURL(f));
    setUrls(created);
    return () => {
      created.forEach((u, i) => {
        if (typeof filesOrStrings[i] !== "string") URL.revokeObjectURL(u);
      });
    };
  }, [filesOrStrings]);
  return urls;
}

// ======================================================================
// Persistência local — salva/recupera solicitações do localStorage
// (com versionamento simples)
// ======================================================================
const STORAGE_KEY = "fieldpro:solicitacoes:v1";
const STORAGE_META_KEY = "fieldpro:meta";
const APP_DATA_VERSION = 1;

export function loadPersistedSolicitacoes(): Solicitacao[] | null {
  try {
    const meta = JSON.parse(localStorage.getItem(STORAGE_META_KEY) || "null");
    if (!meta || meta.version !== APP_DATA_VERSION) return null; // versão antiga, ignora
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as Solicitacao[];
    // sanity check mínimo
    if (!Array.isArray(arr)) return null;
    return arr;
  } catch { return null; }
}

export function persistSolicitacoes(data: Solicitacao[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ version: APP_DATA_VERSION, savedAt: Date.now() }));
}

// ======================================================================
// Utilitários para trilha diária local (opcional, não usados diretamente)
// ======================================================================
type TrackPoint = { t:number; lat:number; lng:number; acc?: number };
type DayTrack = { km:number; points: TrackPoint[] };

export function isoDateLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
export function trackKey(equipe:string, ymd:string) {
  return `fieldpro:gps:${equipe}:${ymd}`;
}
export function loadDayTrack(equipe:string, ymd:string): DayTrack {
  try {
    const raw = localStorage.getItem(trackKey(equipe, ymd));
    if (!raw) return { km:0, points:[] };
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.km !== "number" || !Array.isArray(obj.points)) {
      return { km:0, points:[] };
    }
    return obj as DayTrack;
  } catch {
    return { km:0, points:[] };
  }
}

// ======================================================================
// Distância entre dois pontos (Haversine)
// (Existe uma versão local duplicada dentro do componente, usada no mapa)
// ======================================================================
export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
