"use client";
import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MapPin, ClipboardList, CheckCircle, AlertTriangle, Undo2 } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { supabase } from "@/lib/supabase";
import {ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,} from "recharts";
import {
  registrarProducao, iniciarTrilha, pararTrilha,
  concluirCampoPure, finalizarEscritorioPure, devolverParaCampoPure, reatribuirEquipePure, editarSolicitacaoPure,
  parseCSV, rowsToSolicitacoes, normalizePrazo,
  isLatLngValid, comparePorPrazo, prazoInfo, normalizeSolic,
  toCSV, download, useObjectUrls,
  loadPersistedSolicitacoes, persistSolicitacoes, distKm, isoDateLocal, registrarSolicitacao, atualizarSolicitacao,loginUsuario
} from "../utils/fieldproCore";
import type {
  Perfil,
  Status,
  Solicitacao,
  FormEscritorio,
  CsvRow,
} from "../utils/fieldproCore";
import { uploadImagensSolicitacao } from "@/utils/fieldproCore";

// ======================================================================
// Componente principal — FieldPro
// Contém: login -> credenciais -> dashboard (Campo) / escritório / relatórios
// Mapa Leaflet + CRUD de solicitações + import/export CSV
// ======================================================================
export default function FieldPro() {
  
  // --------------------------------------------------------------------
  // Constantes e listas
  // --------------------------------------------------------------------
  // Lista completa de municípios do Piauí (ordenada). Usada em filtros e formulários
  const MUNICIPIOS_PIAUI = useMemo(
    () =>
      [
        "Acauã","Agricolândia","Água Branca","Alagoinha do Piauí","Alegrete do Piauí",
        "Alto Longá","Altos","Alvorada do Gurguéia","Amarante","Angical do Piauí",
        "Anísio de Abreu","Antônio Almeida","Aroazes","Aroeiras do Itaim","Arraial",
        "Assunção do Piauí","Avelino Lopes","Baixa Grande do Ribeiro","Barra D’Alcântara",
        "Barras","Barreiras do Piauí","Barro Duro","Batalha","Bela Vista do Piauí",
        "Belém do Piauí","Beneditinos","Bertolínia","Betânia do Piauí","Boa Hora",
        "Bocaina","Bom Jesus","Bom Princípio do Piauí","Bonfim do Piauí",
        "Boqueirão do Piauí","Brasileira","Brejo do Piauí","Buriti dos Lopes",
        "Buriti dos Montes","Cabeceiras do Piauí","Cajazeiras do Piauí","Cajueiro da Praia",
        "Caldeirão Grande do Piauí","Campinas do Piauí","Campo Alegre do Fidalgo",
        "Campo Grande do Piauí","Campo Largo do Piauí","Campo Maior","Canavieira",
        "Canto do Buriti","Capitão de Campos","Capitão Gervásio Oliveira",
        "Caracol","Caraúbas do Piauí","Caridade do Piauí","Castelo do Piauí",
        "Caxingó","Cocal","Cocal de Telha","Cocal dos Alves","Coivaras",
        "Colônia do Gurguéia","Colônia do Piauí","Conceição do Canindé","Coronel José Dias",
        "Corrente","Cristalândia do Piauí","Cristino Castro","Curimatá","Currais",
        "Curral Novo do Piauí","Curralinhos","Demerval Lobão","Dirceu Arcoverde",
        "Dom Expedito Lopes","Dom Inocêncio","Domingos Mourão","Elesbão Veloso",
        "Eliseu Martins","Esperantina","Fartura do Piauí","Flores do Piauí",
        "Floresta do Piauí","Floriano","Francinópolis","Francisco Ayres",
        "Francisco Macedo","Francisco Santos","Fronteiras","Geminiano",
        "Gilbués","Guadalupe","Guaribas","Hugo Napoleão","Ilha Grande",
        "Inhuma","Ipiranga do Piauí","Isaías Coelho","Itainópolis",
        "Itaueira","Jacobina do Piauí","Jaicós","Jardim do Mulato",
        "Jatobá do Piauí","Jerumenha","João Costa","Joaquim Pires",
        "Joca Marques","José de Freitas","Juazeiro do Piauí","Júlio Borges",
        "Jurema","Lagoa Alegre","Lagoa de São Francisco","Lagoa do Barro do Piauí",
        "Lagoa do Piauí","Lagoa do Sítio","Lagoinha do Piauí","Landri Sales",
        "Luís Correia","Luzilândia","Madeiro","Manoel Emídio","Marcolândia",
        "Marcos Parente","Massapê do Piauí","Matias Olímpio","Miguel Alves",
        "Miguel Leão","Milton Brandão","Monsenhor Gil","Monsenhor Hipólito",
        "Monte Alegre do Piauí","Morro Cabeça no Tempo","Morro do Chapéu do Piauí",
        "Murici dos Portelas","Nazaré do Piauí","Nazária","Nossa Senhora de Nazaré",
        "Nossa Senhora dos Remédios","Nova Santa Rita","Novo Oriente do Piauí",
        "Novo Santo Antônio","Oeiras","Olho D Água do Piauí","Padre Marcos",
        "Paes Landim","Pajeú do Piauí","Palmeira do Piauí","Palmeirais",
        "Paquetá","Parnaguá","Parnaíba","Passagem Franca do Piauí","Patos do Piauí",
        "Pau D Arco do Piauí","Paulistana","Pavussu","Pedro II","Pedro Laurentino",
        "Picos","Pimenteiras","Pio IX","Piracuruca","Piripiri","Porto",
        "Porto Alegre do Piauí","Prata do Piauí","Queimada Nova","Redenção do Gurguéia",
        "Regeneração","Riacho Frio","Ribeira do Piauí","Ribeiro Gonçalves",
        "Rio Grande do Piauí","Santa Cruz do Piauí","Santa Cruz dos Milagres",
        "Santa Filomena","Santa Luz","Santana do Piauí","Santa Rosa do Piauí",
        "Santo Antônio de Lisboa","Santo Antônio dos Milagres","Santo Inácio do Piauí",
        "São Braz do Piauí","São Félix do Piauí","São Francisco de Assis do Piauí",
        "São Francisco do Piauí","São Gonçalo do Gurguéia","São Gonçalo do Piauí",
        "São João da Canabrava","São João da Fronteira","São João da Serra",
        "São João da Varjota","São João do Arraial","São João do Piauí",
        "São José do Divino","São José do Peixe","São José do Piauí",
        "São Julião","São Lourenço do Piauí","São Luis do Piauí","São Miguel da Baixa Grande",
        "São Miguel do Fidalgo","São Miguel do Tapuio","São Pedro do Piauí",
        "São Raimundo Nonato","Sebastião Barros","Sebastião Leal","Sigefredo Pacheco",
        "Simões","Simplício Mendes","Socorro do Piauí","Sussuapara","Tamboril do Piauí",
        "Tanque do Piauí","Teresina","União","Uruçuí","Valença do Piauí",
        "Várzea Branca","Várzea Grande","Vera Mendes","Vila Nova do Piauí",
        "Wall Ferraz",
      ].sort(),
    []
  );

  // Referência do mapa Leaflet (para flyTo/fitBounds
  const [map, setMap] = useState<L.Map | null>(null);

  // Lista de equipes EPI01..EPI60 (gerada dinamicamente)
  const EQUIPES = useMemo(() => {
    const base = Array.from({ length: 60 }, (_, i) => `EQP${String(i + 1).padStart(2, "0")}`);
    return [...base, "EQP-Teste"];
  }, []);

  // Regiões para filtro no Escritório
  const REGIOES = ["Metropolitana", "Picos", "Floriano", "Parnaiba"] as const;
  type Regional = (typeof REGIOES)[number];

  // --------------------------------------------------------------------
  // Estado de navegação e contexto do usuário
  // --------------------------------------------------------------------
  const [page, setPage] = useState<"login" | "credenciais" | "dashboard" | "detalhes" | "escritorio" | "relatorios">("login");
  const [perfil, setPerfil] = useState<Perfil>("campo");
  const [equipeCampo, setEquipeCampo] = useState<string>("");  // selecionada no login (Campo)
  const [modoPrincipal, setModoPrincipal] = useState<
  "campo" | "escritorio" | "producao"
  >("campo");


  const [loginUser, setLoginUser] = React.useState("");
  const [loginPass, setLoginPass] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginErro, setLoginErro] = React.useState<string | null>(null);


  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");

  const [selecionada, setSelecionada] = useState<number | null>(null);

  const [salvandoProducao, setSalvandoProducao] = React.useState(false);

  // Estado para exibir fotos e imagem em tela cheia
  const [showPhotos, setShowPhotos] = useState<boolean>(false);
  const [fullImgSrc, setFullImgSrc] = useState<string | null>(null);
  const abrirTelaCheia = (src: string) => setFullImgSrc(src);
  const fecharTelaCheia = () => setFullImgSrc(null);

  // --------------------------------------------------------------------
  // Estado de edição (overlay do Escritório)
  // --------------------------------------------------------------------
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    solicitacao: "",
    cliente: "",
    regional:"",
    municipio: "",
    detalhes: "",
    prazo: "",
    lat: "",
    lng: "",
    emergencial: false,
    equipe: "",
    status: "Andamento" as Status,
  });

  // Fotos no editor (pode misturar strings e Files)
  const [editFotos, setEditFotos] = useState<(string | File)[]>([])
  const editPreviewUrls = useObjectUrls(editFotos);

  // Ref para limpar input de arquivos após submit
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [solicitacoes, setSolicitacoes] = React.useState<Solicitacao[]>([]);

  // Persiste em localStorage sempre que as solicitações mudam

  
  React.useEffect(() => {
    async function carregarDoSupabase() {
      const { data, error } = await supabase
        .from("Solicitacao")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error("Erro ao carregar solicitações do Supabase:", error);
        return;
      }

      if (!data) return;

      const lista: Solicitacao[] = data.map((row:any) => ({
        id: row.id,
        solicitacao: row.solicitacao,
        cliente: row.cliente,
        regional: row.regional,
        municipio: row.municipio,
        detalhes: row.detalhes,
        prazo: row.prazo,
        lat: row.lat,
        lng: row.lng,
        emergencial: row.emergencial,
        equipe: row.equipe,
        fotos: row.fotos ??[],
        status: row.status as Status,
      }));

      setSolicitacoes(lista);
    }

    carregarDoSupabase();
  }, []);





  async function handleLogin() {
    if (!loginUser || !loginPass) {
      setLoginErro("Informe usuário e senha.");
      return;
    }

    setLoginLoading(true);
    setLoginErro(null);

    const res = await loginUsuario(loginUser, loginPass);

    if (!res.ok) {
      setLoginErro(res.error);
      setLoginLoading(false);
      return;
    }

    const u = res.usuario;

    if (u.tipo === "campo") {
      if (!u.equipe) {
        setLoginErro("Usuário de campo sem equipe vinculada.");
        setLoginLoading(false);
        return;
      }

      setPerfil("campo");
      setEquipeCampo(u.equipe);
      setPage("dashboard");
    } else {
      setPerfil("escritorio");
      setPage("escritorio");
    }

    // limpa campos
    setLoginUser("");
    setLoginPass("");
    setLoginErro(null);
    setLoginLoading(false);
  }





  // --------------------------------------------------------------------
  // Gate de segurança: Campo não acessa "relatórios"
  // Se for forçado a ir, redireciona de volta
  // --------------------------------------------------------------------
  React.useEffect(() => {
    if (page === "relatorios" && perfil !== "escritorio") {
      // 🔔 Mensagem opcional para alertar
      // alert("Acesso restrito: apenas liderança (Escritório).");

      // 🔄 Redireciona o usuário para onde ele deveria estar
      setPage(perfil === "campo" ? "dashboard" : "login");
    }
  }, [page, perfil]);

  // Carrega do localStorage ao montar (se versão bater)
  React.useEffect(() => {
    const fromStore = loadPersistedSolicitacoes();
    if (fromStore && fromStore.length) {
      setSolicitacoes(fromStore);
    }
  }, []);

  React.useEffect(() => {
  async function testarConexao() {
    const { data, error } = await supabase.auth.getSession();
    console.log("TESTE DE CONEXÃO SUPABASE →", { data, error });
  }
  testarConexao();
}, []);



  // salva sempre que as solicitações mudarem
  React.useEffect(() => {
    persistSolicitacoes(solicitacoes);
  }, [solicitacoes]);


  // liga/desliga a trilha conforme a página do Campo
  React.useEffect(() => {
    const emCampo = page === "dashboard" && perfil === "campo";
    if (emCampo && equipeCampo) {
      iniciarTrilha(equipeCampo);
    } else {
      pararTrilha();
    }
    return () => { pararTrilha(); };
  }, [page, perfil, equipeCampo]);

  // --------------------------------------------------------------------
  // Filtros e controles do Campo
  // --------------------------------------------------------------------
  const [filtroMunicipioCampo, setFiltroMunicipioCampo] = useState<string>("");
  // Busca rápida (Campo): nº da solicitação ou nome do cliente
  const [buscaCampo, setBuscaCampo] = useState<string>("");

  // Geolocalização
  const [myPos, setMyPos] = useState<{lat:number; lng:number} | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [raioKm, setRaioKm] = useState<number>(5);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Seleção de múltiplos pontos para montar rota no Google
  const [selecionadasRota, setSelecionadasRota] = useState<number[]>([]);

  function toggleSelecionadaRota(id: number) {
    setSelecionadasRota((prev) =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function limparSelecaoRota() {
    setSelecionadasRota([]);
  }

  // Haversine local (duplicado proposital para escopo)
  function distKm(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI/180;
    const dLng = (b.lng - a.lng) * Math.PI/180;
    const la1 = a.lat * Math.PI/180, la2 = b.lat * Math.PI/180;
    const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  // Obtém posição atual do navegador (uma vez)
  function localizar() {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada pelo navegador.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED ? 'Permissão negada para acessar sua localização.' :
          err.code === err.POSITION_UNAVAILABLE ? 'Posição indisponível.' :
          err.code === err.TIMEOUT ? 'Tempo esgotado ao tentar obter a posição.' :
          'Não foi possível obter sua localização.';
        setGpsError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  }

  // Abre rota individual no Google Maps (origem = localização atual se disponível)
  function rotaGoogle(dest:{lat:number;lng:number}) {
    const s = myPos ? `${myPos.lat},${myPos.lng}` : 'Current+Location';
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${dest.lat},${dest.lng}&travelmode=driving`, '_blank');
  }

  // Monta rota com múltiplos pontos selecionados (waypoints otimizados)
  function abrirRotaGoogleSelecionadas() {
    const pontos = selecionadasRota
      .map(id => solicitacoes.find(s => s.id === id))
      .filter((s): s is Solicitacao => !!s)
      .map(s => ({ lat: s.lat, lng: s.lng }));

    if (pontos.length === 0) {
      alert("Selecione ao menos uma solicitação no mapa (clique no alfinete e 'Adicionar à rota').");
      return;
    }

    // Origem = GPS da equipe se disponível; senão, o primeiro ponto
    const origem = myPos ? `${myPos.lat},${myPos.lng}` : `${pontos[0].lat},${pontos[0].lng}`;

    // Destino = último ponto selecionado
    const destinoPt = pontos[pontos.length - 1];
    const destino = `${destinoPt.lat},${destinoPt.lng}`;

    // Waypoints = pontos intermediários (exclui origem quando origem = 1º ponto)
    const intermedios = myPos ? pontos : pontos.slice(1);
    let waypoints = intermedios.slice(0, Math.max(0, intermedios.length - 1)) // tudo menos o destino
      .map(p => `${p.lat},${p.lng}`)
      .join("|");

    // Se tiver 2+ paradas intermediárias, peça otimização
    if (waypoints && intermedios.length > 2) {
      waypoints = `optimize:true|${waypoints}`;
    }

    
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("travelmode", "driving");
    url.searchParams.set("origin", origem);
    url.searchParams.set("destination", destino);
    if (waypoints) url.searchParams.set("waypoints", waypoints);
    // Em celulares, abre já no modo navegação:
    // url.searchParams.set("dir_action", "navigate");

    window.open(url.toString(), "_blank");
  }

  // --------------------------------------------------------------------
  // Filtros do Escritório + formulário
  // --------------------------------------------------------------------
  const [filtroRegionalEscr, setFiltroRegionalEscr] = useState<"Todas" | Regional>("Todas"); // <<< NOVO
  const [filtroMunicipioEscr, setFiltroMunicipioEscr] = useState<string>("");
  const [filtroEquipeEscr, setFiltroEquipeEscr] = useState<string>("Todas");
  const [filtroStatusEscr, setFiltroStatusEscr] = useState<"Todos" | Status>("Todos");
  const [somenteEmergenciaisEscr, setSomenteEmergenciaisEscr] = useState<boolean>(false);
  // Busca rápida (Escritório): nº da solicitação ou nome do cliente
  const [buscaEscr, setBuscaEscr] = useState<string>("");
  const initialForm: FormEscritorio = {
    nomeSolicitacao: "",
    nomeCliente: "",
    regional:"",
    municipio: "",
    povoado: "",
    telefone: "",
    detalhes: "",
    lat: "",
    lng: "",
    prioridade: "normal",  // normal | emergencial
    equipe: EQUIPES[0],
    fotos: [],
    prazo: "",
  };
  const [form, setForm] = useState<FormEscritorio>(initialForm);

  // Detecta duplicidade (mesmo nº de solicitação) em tempo real
  const solicitacaoDuplicada = React.useMemo(() => {
    const alvo = normalizeSolic(form.nomeSolicitacao);
    if (!alvo) return false;
    return solicitacoes.some(s => normalizeSolic(s.solicitacao) === alvo);
  }, [form.nomeSolicitacao, solicitacoes]);

  
  const previewUrls = useObjectUrls(form.fotos);

  // --------------------------------------------------------------------
  // Derivados: item atual, filtrados/ordenados e contadores
  // -------------------------------------------------------------------
  const atual = solicitacoes.find((s) => s.id === selecionada) || null;

  // Filtra lista conforme tela ativa e critérios
  const filtered = useMemo(() => {
    return solicitacoes.filter((s) => {
      if (page === "dashboard") {
        if (equipeCampo && s.equipe !== equipeCampo) return false;
        if (filtroMunicipioCampo && s.municipio !== filtroMunicipioCampo) return false;
        if (!atendeBuscaBasica(s, buscaCampo)) return false;
      }
      if (page === "escritorio") {
        if (filtroRegionalEscr !== "Todas" && s.regional !== filtroRegionalEscr) return false; // <<< NOVO
        if (filtroMunicipioEscr && s.municipio !== filtroMunicipioEscr) return false;
        if (filtroEquipeEscr !== "Todas" && s.equipe !== filtroEquipeEscr) return false;
        if (somenteEmergenciaisEscr && !s.emergencial) return false;
        if (filtroStatusEscr !== "Todos" && s.status !== filtroStatusEscr) return false;
        if (!atendeBuscaBasica(s, buscaEscr)) return false;
      }
      return true;
    });
  }, [
    solicitacoes, page,
    equipeCampo, filtroMunicipioCampo, buscaCampo,filtroRegionalEscr,
    filtroMunicipioEscr, filtroEquipeEscr, filtroStatusEscr, somenteEmergenciaisEscr, buscaEscr
  ]);

  // Ordena filtrados por prioridade de prazo/emergência/status
  const filteredSorted = useMemo(() => {
    return [...filtered].sort(comparePorPrazo);
  }, [filtered]);

  // KPIs rápidos para o Resumo
  const counts = useMemo(() => ({
    andamento: filtered.filter(s => s.status === "Andamento").length,
    concluidasCampo: filtered.filter(s => s.status === "Concluída (Campo)").length,
    finalizadas: filtered.filter(s => s.status === "Finalizada").length,
    emergenciaisAtivas: filtered.filter(s => s.emergencial && s.status === "Andamento").length,
  }), [filtered]);

  // Coordenadas de partida do mapa (Teresina/PI)
  const posicaoInicial = useMemo(() => ({ lat: -5.0949, lng: -42.8041 }), []); // Teresina/PI

  // Gera badge visual do status
  function badge(status: Status) {
    if (status === "Andamento")
      return <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">Andamento</span>;
    if (status === "Concluída (Campo)")
      return <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">Concluída (Campo)</span>;
    return <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Finalizada</span>;
  }

  // Abre coordenada no Google Maps (visualização)
  function openInGoogleMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
  }

  // Anexos — criação
  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setForm((prev) => ({ ...prev, fotos: [...prev.fotos, ...arr] }));
  }

  // Anexos — edição
  function addFilesEdit(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!arr.length) return;
    setEditFotos(prev => [...prev, ...arr]);
  }

  // Remove 1 anexo do editor
  function removeFotoEditAt(index: number) {
    setEditFotos(prev => prev.filter((_, i) => i !== index));
  }

  // Permite colar (Ctrl+V) imagens direto no overlay de edição
  function handlePasteImagesEdit(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const it of Array.from(items)) {
      if (it.kind === "file") {
        const f = it.getAsFile?.();
        if (f && f.type.startsWith("image/")) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      addFilesEdit(files);
    }
  }

// Remove 1 anexo do formulário de criação
function removeFotoAt(index: number) {
  setForm((prev) => ({
    ...prev,
    fotos: prev.fotos.filter((_, i) => i !== index),
  }));
}

// Permite colar (Ctrl+V) imagens no formulário de criação
function handlePasteImages(e: React.ClipboardEvent<HTMLDivElement>) {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files: File[] = [];
  for (const it of Array.from(items)) {
    if (it.kind === "file") {
      const f = it.getAsFile?.();
      if (f && f.type.startsWith("image/")) files.push(f);
    }
  }
  if (files.length) {
    e.preventDefault(); // evita colar texto
    addFiles(files);
  }
}

  // --------------------------------------------------------------------
  // Ações do Campo
  // --------------------------------------------------------------------
  async function concluirCampo(id: number) {
    const s = solicitacoes.find(x => x.id === id);
    if (!s) return;

    const titulo = `${s.solicitacao} — ${s.cliente}`;

    if (salvandoProducao) return; // evita clique duplo

    if (!window.confirm(`Deseja concluir a solicitação?\n\n${titulo}`)) return;

    setSalvandoProducao(true); // ativa carregamento

    // muda status local
    setSolicitacoes(prev => concluirCampoPure(prev, id));

    try {
      await registrarProducao({
        equipe: s.equipe,
        solicitacao: s.solicitacao,
        cliente: s.cliente,
        municipio: s.municipio,
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar produção.");
    } finally {
      // libera botão depois de 0.8s só pra dar sensação visual
      setTimeout(() => setSalvandoProducao(false), 800);
    }
  }
  
  // --------------------------------------------------------------------
  // Ações do Escritório
  // --------------------------------------------------------------------
  function finalizarEscritorio(id: number) {
    const s = solicitacoes.find(x => x.id === id);
    const titulo = s ? `${s.solicitacao} — ${s.cliente}` : `ID ${id}`;

    if (!window.confirm(
      `Deseja FINALIZAR a solicitação?\n\n${titulo}\n\nApós finalizar não poderá devolver ao campo.`
    )) return;

    setSolicitacoes((prev) => finalizarEscritorioPure(prev, id));
    alert("Solicitação finalizada.");
  }

    // Salva edição do overlay (valida lat/lng/município e aplica patch)
  async function salvarEdicao() {
    if (!editId) return;

    const latNum = parseFloat(editForm.lat);
    const lngNum = parseFloat(editForm.lng);

    if (!isLatLngValid(latNum, lngNum)) {
      alert("Latitude deve estar entre -90..90 e Longitude entre -180..180.");
      return;
    }

    if (!editForm.municipio) {
      alert("Selecione o município.");
      return;
    }

    // 1) sobe / reaproveita as imagens (strings passam direto, Files sobem)
    const fotosUrls = await uploadImagensSolicitacao(
      editFotos,
      editForm.solicitacao || String(editId)
    );

    // 2) monta o patch
    const patch = {
      solicitacao: editForm.solicitacao,
      cliente: editForm.cliente,
      regional: editForm.regional,
      municipio: editForm.municipio,
      detalhes: editForm.detalhes,
      prazo: editForm.prazo,
      lat: latNum,
      lng: lngNum,
      emergencial: editForm.emergencial,
      equipe: editForm.equipe,
      status: editForm.status as Status,
      fotos: fotosUrls,
    };

    // 3) atualiza no Supabase
    const res = await atualizarSolicitacao(editId, patch);
    if (!res.ok) {
      return; // já mostrou alerta dentro da função
    }

    // 4) atualiza no estado local
    setSolicitacoes((prev) => editarSolicitacaoPure(prev, editId, {
      ...patch,
      fotos: fotosUrls,
    }));

    setEditId(null);
    setEditFotos([]);
  }

  // “Devolver a Campo” (não pode após finalizar)
  function devolverParaCampo(id: number) {
    const s = solicitacoes.find(x => x.id === id);
    const titulo = s ? `${s.solicitacao} — ${s.cliente}` : `ID ${id}`;

    if (!window.confirm(`Deseja devolver a solicitação para o Campo?\n\n${titulo}`)) return;

    setSolicitacoes((prev) => devolverParaCampoPure(prev, id));
    alert("Solicitação devolvida ao Campo.");
  }

  // Reatribui equipe (bloqueia se Finalizada)
  function reatribuirEquipe(id: number, equipeNova: string) {
    const s = solicitacoes.find(x => x.id === id);
    if (!s) return;
    if (s.status === "Finalizada") return; // ← ADICIONADO: impede troca via código
    setSolicitacoes((prev) => reatribuirEquipePure(prev, id, equipeNova));
  }
  // Abre editor preenchendo os dados atuais
  function abrirEditor(s: Solicitacao) {
    setEditId(s.id);
    setEditForm({
      solicitacao: s.solicitacao,
      cliente: s.cliente,
      regional:s.regional,
      municipio: s.municipio,
      detalhes: s.detalhes,
      prazo: s.prazo,
      lat: String(s.lat),
      lng: String(s.lng),
      emergencial: s.emergencial,
      equipe: s.equipe,
      status: s.status,
    });
      // ⬇️ NOVO: fotos atuais vão para o estado de edição
    setEditFotos(s.fotos);
  }
  // Exclui solicitação (bloqueia se Finalizada)
  function excluirSolicitacao(id: number) {
    const s = solicitacoes.find(x => x.id === id);
    if (!s) return;

    // 1) BLOQUEIO ANTES DE QUALQUER COISA
    if (s.status === "Finalizada") {
      alert("Não é possível excluir uma solicitação finalizada.");
      return;
    }

    // 2) Confirmação
    const titulo = `${s.solicitacao} — ${s.cliente}`;
    const ok = window.confirm(
      `Tem certeza que deseja EXCLUIR?\n\n${titulo}\n\nEsta ação não pode ser desfeita.`
    );
    if (!ok) return;

    // 3) Exclui
    setSolicitacoes(prev => prev.filter(x => x.id !== id));

    // 4) Se estava aberta/selecionada, fecha
    if (selecionada === id) {
      setSelecionada(null);
      if (page === "detalhes") setPage("escritorio");
    }
  }

  // Cancela edição (fecha overlay)
  function cancelarEdicao() {
    setEditId(null);
    setEditFotos([]);
  }

  // Submit do formulário de criação (Escritório)
  async function handleSubmitEscritorio(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  // Validação — exige todos os campos preenchidos
  if (
    !form.nomeSolicitacao.trim() ||
    !form.nomeCliente.trim() ||
    !form.regional.trim() ||
    !form.municipio.trim() ||
    !form.povoado.trim() ||
    !form.telefone.trim() ||
    !form.detalhes.trim() ||
    !form.lat.trim() ||
    !form.lng.trim() ||
    !form.equipe.trim()
  ) {
    alert("Preencha todos os campos antes de enviar a solicitação.");
    return;
  }
  if (!form.prazo) {
    alert("Preencha o prazo.");
    return;
  }


  const latNum = parseFloat(form.lat);
  const lngNum = parseFloat(form.lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    alert("Latitude e Longitude precisam ser números válidos.");
    return;
  }
  if (!isLatLngValid(latNum, lngNum)) {
  alert("Latitude deve estar entre -90..90 e Longitude entre -180..180.");
  return;
}

  // Converte prazo do input date para "dd/mm/yyyy"
  let prazoFormatado = form.prazo;
  if (/^\d{4}-\d{2}-\d{2}$/.test(form.prazo)) {
    const [ano, mes, dia] = form.prazo.split("-");
    prazoFormatado = `${dia}/${mes}/${ano}`;
  }

  // Normaliza em maiúsculo (nº solicitação, cliente, detalhes/povoado)
  const nomeSolicMaius = form.nomeSolicitacao.trim().toUpperCase();  
  const nomeClienteMaius = form.nomeCliente.trim().toUpperCase();
  const detalhesMaius = form.detalhes.trim().toUpperCase();
  const povoadoMaius = form.povoado.trim().toUpperCase();

  // Envia as imagens para o Supabase Storage e obtém URLs públicas
  const fotosUrls = await uploadImagensSolicitacao(
    form.fotos.filter((f): f is File => typeof f !== "string"), // garante só File
    nomeSolicMaius // uso o nº da solicitação para nomear a pasta/arquivos
  );

  
  // 🚫 Evitar duplicidade de Nº da solicitação
  const jaExiste = solicitacoes.some(
    (s) => normalizeSolic(s.solicitacao) === normalizeSolic(form.nomeSolicitacao)
  );
  if (jaExiste) {
    alert("Já existe uma solicitação cadastrada com esse número/nome. Verifique e tente novamente.");
    return;
  }

  // Monta objeto Solicitacao novo
  const nova: Solicitacao = {
    id: Date.now(),
    solicitacao:nomeSolicMaius,
    cliente: nomeClienteMaius,
    regional:form.regional,
    municipio: form.municipio,
    detalhes: detalhesMaius || povoadoMaius || "",
    prazo: prazoFormatado,
    lat: latNum,
    lng: lngNum,
    emergencial: form.prioridade === "emergencial",
    equipe: form.equipe,
    fotos: fotosUrls, // ← AGORA SÃO AS SUAS FOTOS
    status: "Andamento",
  };


  // Salva no Supabase
  const res = await registrarSolicitacao({
    solicitacao: nova.solicitacao,
    cliente: nova.cliente,
    regional: nova.regional,
    municipio: nova.municipio,
    detalhes: nova.detalhes,
    prazo: nova.prazo,
    lat: nova.lat,
    lng: nova.lng,
    emergencial: nova.emergencial,
    equipe: nova.equipe,
    status: nova.status,
    fotos: nova.fotos,
  });

  // Se deu erro, NÃO adiciona na lista local
  if (!res.ok) {
    return;
  }

  // usa o id que veio do banco
  const salva = res.data;
  const novaComIdBanco: Solicitacao = { ...nova, id: salva.id };

  setSolicitacoes((prev) => [novaComIdBanco, ...prev]);
  setSelecionada(novaComIdBanco.id);



  // Insere no topo e reseta formulário
  setSolicitacoes((prev) => [nova, ...prev]);
  setSelecionada(nova.id);
  setPage("escritorio");
  setForm({
    nomeSolicitacao: "",
    nomeCliente: "",
    regional:"",
    municipio: "",
    povoado: "",
    telefone: "",
    detalhes: "",
    lat: "",
    lng: "",
    prioridade: "normal",
    equipe: EQUIPES[0],
    fotos: [],
    prazo:"",
  });

  // Limpar input de arquivos
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }

  // Mensagem de sucesso
  alert("✅ Solicitação enviada com sucesso!");
  }
  // --------------------------------------------------------------------
  // Testes "smoke" — verificam algumas regras e invariantes
  // --------------------------------------------------------------------
  const testResults = useMemo(() => {
    const results: { name: string; pass: boolean; detail?: string }[] = [];

    try {
      // Teste 1: EQUIPES deve ter 60 itens, começar em EPI01 e terminar em EPI60
      const passEq = EQUIPES.length === 60 && EQUIPES[0] === "EPI01" && EQUIPES[59] === "EPI60";
      results.push({ name: "EQUIPES: 60 itens, EPI01..EPI60", pass: passEq });

      // Base para testes de funções puras
      const base: Solicitacao[] = [
        { id: 1, solicitacao: "A", cliente: "C1", regional: "D1", municipio: "Teresina", detalhes: "", prazo: "01/01/2025", lat: 0, lng: 0, emergencial: false, equipe: "EPI01", fotos: [], status: "Andamento" },
        { id: 2, solicitacao: "B", cliente: "C2", regional: "D2", municipio: "Altos", detalhes: "", prazo: "01/01/2025", lat: 0, lng: 0, emergencial: false, equipe: "EPI02", fotos: [], status: "Concluída (Campo)" },
        { id: 3, solicitacao: "C", cliente: "C3", regional: "D3", municipio: "Picos", detalhes: "", prazo: "01/01/2025", lat: 0, lng: 0, emergencial: false, equipe: "EPI03", fotos: [], status: "Finalizada" },
      ];

      // Teste 2: concluirCampoPure muda para "Concluída (Campo)"
      const afterConcluir = concluirCampoPure(base, 1);
      const passConcluir = afterConcluir.find((s) => s.id === 1)?.status === "Concluída (Campo)";
      results.push({ name: "concluirCampoPure altera status para Concluída (Campo)", pass: !!passConcluir });

      // Teste 3: finalizarEscritorioPure muda para Finalizada e zera equipe
      const afterFinal = finalizarEscritorioPure(base, 2);
      const t2 = afterFinal.find((s) => s.id === 2);
      const passFinal = t2?.status === "Finalizada" && t2?.equipe === "";
      results.push({ name: "finalizarEscritorioPure -> Finalizada e equipe \"\"", pass: !!passFinal });

      // Teste 4: devolverParaCampoPure volta a Andamento quando não Finalizada
      const afterDevolver = devolverParaCampoPure(base, 2);
      const passDev1 = afterDevolver.find((s) => s.id === 2)?.status === "Andamento";
      results.push({ name: "devolverParaCampoPure em Concluída(Campo) -> Andamento", pass: !!passDev1 });

      // Teste 5: devolverParaCampoPure NÃO altera quando status é Finalizada
      const afterDevolver2 = devolverParaCampoPure(base, 3);
      const passDev2 = afterDevolver2.find((s) => s.id === 3)?.status === "Finalizada";
      results.push({ name: "devolverParaCampoPure não altera quando Finalizada", pass: !!passDev2 });

      // Teste 6: concluirCampoPure mantém demais itens inalterados
      const unchangedAfterConcluir = afterConcluir.find((s) => s.id === 2)?.status === "Concluída (Campo)";
      results.push({ name: "concluirCampoPure mantém demais itens inalterados", pass: !!unchangedAfterConcluir });

      // Teste 7: chamada com ID inexistente não modifica a lista (mesmas referências)
      const afterNoop = devolverParaCampoPure(base, 999);
      const sameRefs = afterNoop.length === base.length && afterNoop.every((s, i) => s === base[i]);
      results.push({ name: "operações com ID inexistente não alteram a lista", pass: sameRefs });

      // Teste 8: nomes das EQUIPES possuem padrão EPI\d{2} e são únicos
      const re = /^EPI\d{2}$/;
      const patternOk = EQUIPES.every((e) => re.test(e));
      const uniqueOk = new Set(EQUIPES).size === 60;
      results.push({ name: "EQUIPES seguem padrão EPI00 e são únicas", pass: patternOk && uniqueOk });

      // Teste 9: reatribuirEquipePure altera somente o campo equipe do item certo
      const afterReattr = reatribuirEquipePure(base, 1, "EPI05");
      const t9 = afterReattr.find((s) => s.id === 1)!;
      const passReattr = t9.equipe === "EPI05" && t9.status === "Andamento" && afterReattr[1] === base[1];
      results.push({ name: "reatribuirEquipePure altera apenas equipe do item alvo", pass: !!passReattr });

      // Teste 10: reatribuirEquipePure com ID inexistente não altera lista
      const afterReattrNoop = reatribuirEquipePure(base, 999, "EPI10");
      const passReattrNoop = afterReattrNoop.every((s, i) => s === base[i]);
      results.push({ name: "reatribuirEquipePure com ID inexistente é no-op", pass: passReattrNoop });

      // Teste 11: editarSolicitacaoPure atualiza campos e preserva outros
      const afterEdit = editarSolicitacaoPure(base, 1, { cliente: "Novo", municipio: "Altos", lat: 10, lng: -10 });
      const e1 = afterEdit.find((s) => s.id === 1)!;
      const passEdit = e1.cliente === "Novo" && e1.municipio === "Altos" && e1.lat === 10 && e1.lng === -10 && e1.status === "Andamento";
      results.push({ name: "editarSolicitacaoPure altera campos solicitados e preserva status", pass: !!passEdit });

      // Teste 12: editarSolicitacaoPure ID inexistente não altera lista
      const afterEditNoop = editarSolicitacaoPure(base, 999, { cliente: "X" });
      const passEditNoop = afterEditNoop.every((s, i) => s === base[i]);
      results.push({ name: "editarSolicitacaoPure com ID inexistente é no-op", pass: passEditNoop });
    } catch (err) {
      results.push({ name: "Falha inesperada nos testes", pass: false, detail: String((err as Error)?. message || err) });
    }

    return results;
  }, [EQUIPES]);

  // Busca básica por nº ou cliente
  function atendeBuscaBasica(s: Solicitacao, termo: string): boolean {
    if (!termo) return true;
    const t = termo.toLowerCase();
    return (
      s.solicitacao.toLowerCase().includes(t) ||
      s.cliente.toLowerCase().includes(t)
    );
  }

  // --------------------------------------------------------------------
  // Componente auxiliar: ajusta mapa aos pontos (fitBounds) com fallback
  // --------------------------------------------------------------------
  function FitToPoints({
    points,
    fallback,
    includeMyPos,
    myPos
  }: {
    points: {lat:number;lng:number}[];
    fallback: {lat:number;lng:number};
    includeMyPos?: boolean;
    myPos?: {lat:number;lng:number};
  }) {
    const map = useMap();
    React.useEffect(() => {
      const pts = [...points];
      if (includeMyPos && myPos) pts.push(myPos);
      if (!pts.length) {
        map.setView([fallback.lat, fallback.lng], 12);
        return;
      }
      const bounds = L.latLngBounds(pts.map(p => [p.lat, p.lng] as [number,number]));
      map.fitBounds(bounds.pad(0.2));
    }, [points, fallback, includeMyPos, myPos, map]);
    return null;
  }


      // --------------------------------------------------------------------
      // Ícones customizados para marcadores do mapa
      // --------------------------------------------------------------------
      // Ícone circular para "minha posição"
      const myPosIcon = L.divIcon({
        className: "mypos-icon",
        html: `
          <div style="
            width: 16px;
            height: 16px;
            background: #4285F4;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8], // centraliza o círculo
      });

      // Ícones customizados para status
      // Observação de performance:
      // - Os três ícones abaixo são criados dentro de React.useMemo([])
      //   para que a instância do ícone seja criada apenas uma vez
      //   (evita recriação a cada re-render).

      // iconAndamento: pino dourado (em andamento)
      // - Usa um SVG inline (um “marcador/pino”) para ter um visual consistente.
      // - iconSize / iconAnchor ajustam tamanho e âncora do pino.
      const iconAndamento = React.useMemo(() =>
        L.divIcon({
          className: "marker-icon",
          html: `<div style="font-size: 22px; color: gold;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
          <path fill="#fbbf24" d="M12 2c-3.86 0-7 3.07-7 7.02C5 14.25 12 22 12 22s7-7.75 7-12.98C19 5.07 15.86 2 12 2z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
          </svg>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 22], // “ponta” do pino fica no ponto do mapa
        }), []
      );

      const iconConcluido = React.useMemo(() =>
        L.divIcon({
          className: "marker-icon",
          html: `<div style="font-size: 22px; color: green;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
          <path fill="#22c55e" d="M12 2c-3.86 0-7 3.07-7 7.02C5 14.25 12 22 12 22s7-7.75 7-12.98C19 5.07 15.86 2 12 2z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
          </svg>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 22], 
        }), []
      );

      // iconEmergencial: pino vermelho (demanda emergencial em andamento)
      const iconEmergencial = React.useMemo(() =>
        L.divIcon({
          className: "marker-icon",
          html: `<div style="font-size: 22px; color: red;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
          <path fill="#ef4444" d="M12 2c-3.86 0-7 3.07-7 7.02C5 14.25 12 22 12 22s7-7.75 7-12.98C19 5.07 15.86 2 12 2z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
          </svg>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 22],
        }), []
      );

      // Pontos da rota na ordem em que foram selecionados (lat,lng)
      // - Converte a lista de IDs selecionados (selecionadasRota) nos objetos Solicitacao correspondentes.
      // - Filtra nulos (caso algum ID não exista).
      // - Mapeia para tuplas [lat, lng] para alimentar o Polyline.
      const rotaPontos = useMemo(() => {
        return selecionadasRota
          .map((id) => solicitacoes.find((s) => s.id === id))
          .filter((s): s is Solicitacao => !!s)
          .map((s) => [s.lat, s.lng] as [number, number]);
      }, [selecionadasRota, solicitacoes]);

      // CaptureMap: utilitário para obter a instância do mapa do Leaflet assim
      // que estiver disponível.
      // - useMap() retorna o objeto L.Map dentro do contexto do MapContainer.
      // - onReady é chamado uma única vez (efeito com dependência [map, onReady])
      //   passando o mapa para que o componente pai armazene (via setMap)
      function CaptureMap({ onReady }: { onReady: (m: L.Map) => void }) {
        const map = useMap();
        React.useEffect(() => onReady(map), [map, onReady]);
        return null;
      }
  // =====================
  // Render
  // =====================
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#021B33] via-[#003A5C] to-[#011421]">
      {/* Botão Voltar global (apenas adiciona, sem remover nada) */}
      {page !== "login" && (
        <div className="mb-4">
          <Button variant="outline" onClick={() => setPage("login")}>Voltar</Button>
        </div>
      )}

      {/* Tela de escolha (Campo | Escritório) + seleção de EQUIPE para Campo */}
      {page === "login" && (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#021B33] via-[#003A5C] to-[#011421]">
          <Card className="w-full max-w-xl mx-auto bg-slate-950/80 border border-white/10 text-slate-50 backdrop-blur-xl px-10 py-10 rounded-3xl shadow-2xl">
            <h1 className="text-2xl font-semibold mb-8 text-center tracking-wide">
              FieldPro – Acesso
            </h1>

            {/* BOTÕES EM COLUNA, CENTRALIZADOS E EM ORDEM
                Campo -> Escritório -> Produção -> Chamado -> Acesso */}
            <div className="space-y-3 mb-8 flex flex-col items-center">

              {/* Campo */}
              <Button
                onClick={() => {
                  setPerfil("campo");
                  setModoPrincipal("campo");
                }}
                variant="ghost"
                className={
                  "w-64 justify-center rounded-full text-sm font-semibold shadow-md transition " +
                  (modoPrincipal === "campo"
                    ? "bg-[#00A4FF] text-white shadow-blue-500/60"
                    : "bg-transparent text-slate-100 border border-white/25 hover:bg-white/10")
                }
              >
                Campo
              </Button>

              {/* Escritório */}
              <Button
                onClick={() => {
                  setPerfil("escritorio");
                  setModoPrincipal("escritorio");
                }}
                variant="ghost"
                className={
                  "w-64 justify-center rounded-full text-sm font-semibold shadow-md transition " +
                  (modoPrincipal === "escritorio"
                    ? "bg-[#00A4FF] text-white shadow-blue-500/60"
                    : "bg-transparent text-slate-100 border border-white/25 hover:bg-white/10")
                }
              >
                Escritório
              </Button>

              {/* Produção – usa perfil escritorio, mas modo 'producao' */}
              <Button
                type="button"
                onClick={() => {
                  setPerfil("escritorio");
                  setModoPrincipal("producao");
                }}
                variant="ghost"
                className={
                  "w-64 justify-center rounded-full text-sm font-semibold shadow-md transition " +
                  (modoPrincipal === "producao"
                    ? "bg-[#00A4FF] text-white shadow-blue-500/60"
                    : "bg-transparent text-slate-100 border border-white/25 hover:bg-white/10")
                }
              >
                Produção
              </Button>

              {/* Chamado (apenas visual por enquanto) */}
              <Button
                type="button"
                variant="ghost"
                className="w-64 justify-center rounded-full text-sm font-medium bg-transparent text-slate-100 border border-white/20 hover:bg-white/10"
              >
                Chamado
              </Button>

              {/* Acesso (apenas visual por enquanto) */}
              <Button
                type="button"
                variant="ghost"
                className="w-64 justify-center rounded-full text-sm font-medium bg-transparent text-slate-100 border border-white/20 hover:bg-white/10"
              >
                Acesso
              </Button>
            </div>

            {/* Seleção de equipe – só aparece se perfil === "campo" */}
            {perfil === "campo" && (
              <div className="mb-6">
                <label className="text-sm mb-1 block text-slate-200">
                  Selecione a equipe
                </label>
                <select
                  className="h-11 rounded-lg border border-white/20 bg-slate-950/60 px-3 text-sm w-full text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A4FF]/70"
                  value={equipeCampo}
                  onChange={(e) => setEquipeCampo(e.target.value)}
                >
                  <option value="">-- Escolha a equipe (EQP01..EQP60) --</option>
                  {EQUIPES.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Botão continuar mantém a lógica original:
                - Vai para "credenciais"
                - Depois, na tela de credenciais, o botão Entrar usa perfil para ir
                  para "dashboard" (campo) ou "escritorio" */}
            <Button
              className="w-full h-11 rounded-full bg-gradient-to-r from-[#00A4FF] to-[#27C2FF] text-white font-semibold shadow-lg shadow-blue-500/40 hover:brightness-110 transition"
              onClick={() => {
                // Se for Campo, exigir equipe
                if (modoPrincipal === "campo" && !equipeCampo) {
                  alert("Selecione a equipe antes de continuar.");
                  return;
                }

                // Vai sempre para a tela de login (usuário/senha)
                setPage("credenciais");
              }}
            >
              Continuar
            </Button>

            <p className="mt-4 text-[10px] text-center text-slate-400 tracking-[0.15em] uppercase">
            </p>
          </Card>
        </div>
      )}
      {/* Tela de login com usuário e senha */}
      {page === "credenciais" && (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900">
          <Card className="w-full max-w-md bg-slate-800 text-white p-8">
            <h1 className="text-2xl font-bold text-center mb-6">Acesso ao FieldPro</h1>

            <div className="space-y-4">
              <div>
                <label className="text-sm">Usuário</label>
                <Input
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="bg-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm">Senha</label>
                <Input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="bg-slate-700 text-white"
                />
              </div>

              {loginErro && (
                <p className="text-red-400 text-sm">{loginErro}</p>
              )}
            </div>

            <div className="mt-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </Card>
        </div>
      )}



      {/* Dashboard (Campo) */}
      {page === "dashboard" && (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto">
          {/* Lista com filtro de município */}
          <Card className="col-span-2 p-6 shadow-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                📋 Equipe {equipeCampo || "—"}
              </h2>

              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Buscar nº ou nome…"
                  value={buscaCampo}
                  onChange={(e) => setBuscaCampo(e.target.value)}
                  className="w-56"
                />
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={filtroMunicipioCampo}
                  onChange={(e) => setFiltroMunicipioCampo(e.target.value)}
                >
                  <option value="">Município: Todos</option>
                  {MUNICIPIOS_PIAUI.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Aviso se usuário não escolheu equipe (perfil campo) */}
            {!equipeCampo && (
              <p className="text-sm text-red-600 mb-2">
                Nenhuma equipe selecionada. Volte e escolha uma equipe.
              </p>
            )}

            {/* Lista de cards de solicitações (já filtradas e ordenadas) */}
            <div className="space-y-3">
              {filteredSorted.map((s) => (
                  <Card
                    key={s.id}
                    className={`p-3 ${s.emergencial && s.status === "Andamento" ? "border-l-4 border-red-600" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Coluna: informações principais da solicitação */}
                      <div>
                        <p className={`font-semibold ${s.emergencial && s.status === "Andamento" ? "text-red-600" : ""}`}>
                          {s.emergencial && s.status === "Andamento" &&  <span className="mr-2">[EMERGENCIAL]</span>}
                          {s.solicitacao}
                        </p>
                        <p className="text-sm text-gray-700">
                          Cliente: <span className="font-medium">{s.cliente}</span>
                        </p>

                        {/* Prazo + badge de situação do prazo (atraso/hoje/em breve) */}
                        <p className="text-xs text-gray-600">
                          Município: {s.municipio} • Prazo: {s.prazo}
                          {(() => {
                            const p = prazoInfo(s.prazo);
                            return p ? <span className={`ml-2 ${p.className}`}>• {p.text}</span> : null;
                          })()}
                        </p>
                        <div className="mt-1">{badge(s.status)}</div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[180px] items-end">
                        {/* Abre detalhes e muda a página */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelecionada(s.id);
                            setPage("detalhes");
                          }}
                        >
                          Detalhes
                        </Button>

                        {/* Abre o Google Maps nesse ponto */}
                        <Button size="sm" onClick={() => openInGoogleMaps(s.lat, s.lng)}>
                          <MapPin size={16} className="mr-1" />
                          Ver no mapa
                        </Button>

                        {/* Anima o mapa para o ponto na UI embutida */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!map) return;
                            map.flyTo([s.lat, s.lng], 17, { duration: 0.6 });
                          }}
                        >
                          Zoom
                        </Button>

                        {/* Concluir no campo (habilitado apenas em "Andamento") */}
                        {s.status === "Andamento" && (
                          <Button
                            onClick={() => concluirCampo(s.id)}
                            disabled={salvandoProducao}
                          >
                            {salvandoProducao ? "Salvando..." : "Concluir"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </Card>

          {/* ==== Coluna lateral: Resumo de contagens ==== */}
          <Card className="p-6 shadow-lg bg-white">
            <h2 className="text-lg font-semibold mb-4">Resumo</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-green-600">
                <CheckCircle size={18} /> Concluídas (Campo):{" "}
                {
                  solicitacoes.filter(
                    (s) => (!equipeCampo || s.equipe === equipeCampo) && s.status === "Concluída (Campo)"
                  ).length
                }
              </li>
              {/* Em andamento (contagem geral calculada externamente) */}
              <li className="flex items-center gap-2 text-yellow-600">
                <ClipboardList size={18} /> Andamento: {counts.andamento}
              </li>
              {/* Emergenciais ativas */}
              <li className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={18} /> Emergenciais: {counts.emergenciaisAtivas}
              </li>
            </ul>

            {/* Aviso quando não há demandas ativas para a equipe selecionada */}
            {equipeCampo &&
              solicitacoes.filter((s) => s.equipe === equipeCampo && s.status !== "Finalizada")
                .length === 0 && (
                <p className="mt-3 text-sm text-red-600">
                  Alerta: sua equipe está sem demandas ativas.
                </p>
              )}
          </Card>


          {/* ==== Mapa (Leaflet) + ferramentas ==== */}
          <Card className="col-span-1 md:col-span-3 p-0 overflow-hidden shadow-lg bg-white">
            {/* Barra de ferramentas do mapa */}
            <div className="flex items-center justify-between px-4 py-3 border-b gap-3 flex-wrap">
              <h3 className="font-semibold">
                🗺️ Mapa das Solicitações
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={localizar} disabled={gpsLoading}>
                  {gpsLoading ? "Localizando..." : "Minha posição"}
                </Button>

                {/* Monta rota no Google Maps com as paradas selecionadas na UI */}
                <Button
                  onClick={abrirRotaGoogleSelecionadas}
                  disabled={selecionadasRota.length === 0}
                  title={selecionadasRota.length ? "" : "Selecione paradas clicando nos alfinetes"}
                >
                  Abrir rota (Google)
                </Button>

                {/* NOVO: limpar seleção */}
                <Button variant="outline" onClick={limparSelecaoRota} disabled={selecionadasRota.length === 0}>
                  Limpar seleção
                </Button>

                {/* Mensagem de erro de GPS */}
                {gpsError && <span className="text-xs text-red-600 ml-2">{gpsError}</span>}

                {/* Controle de raio (km) para destacar proximidade */}
                <div className="flex items-center gap-2 text-sm">
                  <span>Raio:</span>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={raioKm}
                    onChange={(e) => setRaioKm(Number(e.target.value))}
                  />
                  <span className="w-10 text-right">{raioKm} km</span>
                </div>
              </div>
            </div>
            {/* Container do mapa Leaflet */}
            <div className="h-[420px] w-full">
              <MapContainer
                className="h-full w-full"
                center={[posicaoInicial.lat, posicaoInicial.lng]}
                zoom={12}
                scrollWheelZoom
              >
                {/* Callback para capturar a instância do mapa */}
                <CaptureMap onReady={(m) => setMap(m)} />

                {/* Camada base OSM */}
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Ajusta o viewport para cobrir os pontos das solicitações (+ minha posição) */}
                <FitToPoints
                  points={solicitacoes.map(s => ({lat:s.lat, lng:s.lng}))}
                  fallback={posicaoInicial}
                  includeMyPos={!!myPos}
                  myPos={myPos || undefined}
                />

                {/* Minha posição + círculo de proximidade */}
                {myPos && (
                  <>
                    <Marker position={[myPos.lat, myPos.lng]} icon={myPosIcon}>
                      <Popup><b>Você está aqui</b></Popup>
                    </Marker>
                    <Circle center={[myPos.lat, myPos.lng]} radius={raioKm * 1000} />
                  </>
                )}
                {/* Linha da rota: minha posição -> pontos selecionados */}
                {(() => {
                  const origem: [number, number][] = myPos ? [[myPos.lat, myPos.lng]] : [];
                  const pts: [number, number][] = [...origem, ...rotaPontos];

                  if (pts.length < 2) return null;

                  const segments = [];
                  for (let i = 0; i < pts.length - 1; i++) {
                    segments.push(
                      <Polyline
                        key={`rota-${i}`}
                        positions={[pts[i], pts[i + 1]]}
                        pathOptions={{
                          color: "#2563eb",   // azul
                          weight: 4,
                          opacity: 0.9,
                          dashArray: i === 0 && myPos ? "6 6" : undefined, // origem->1º ponto tracejado
                        }}
                      />
                    );
                  }
                  return <>{segments}</>;
                })()}
                {/* Pins de solicitações */}
                {filtered.map((s) => {
                  const isNear = myPos ? distKm(myPos, {lat:s.lat, lng:s.lng}) <= raioKm : false;
                  const selected = selectedId === s.id;
                  const color = s.emergencial ? 'transparent' : (isNear ? 'transparent' : 'transparent');
                  // pequeno círculo colorido sob o marker (truque visual)
                  return (
                    <React.Fragment key={s.id}>
                      <Marker
                        position={[s.lat, s.lng]}
                        icon={
                          s.emergencial && s.status === "Andamento"
                            ? iconEmergencial
                            : s.status === "Concluída (Campo)"
                            ? iconConcluido
                            : iconAndamento
                        }
                        eventHandlers={{ click: () => setSelectedId(s.id) }}
                      >
                        <Popup>
                          <div className="space-y-1">
                            <div className="font-semibold">{s.solicitacao}</div>
                            <div className="text-xs text-gray-600">{s.cliente} • {s.municipio}</div>
                            <div className="text-xs">Prazo: {s.prazo}</div>
                            {(() => {
                              const p = prazoInfo(s.prazo);
                              return p ? <div className={`text-xs ${p.className}`}>{p.text}</div> : null;
                            })()}
                            {myPos && (
                              <div className="text-xs">
                                Distância: {distKm(myPos, { lat: s.lat, lng: s.lng }).toFixed(2)} km
                              </div>
                            )}

                            <div className="flex gap-2 mt-2 flex-wrap">
                              {/* Alterna seleção de rota */}
                              <Button
                                size="sm"
                                onClick={() => toggleSelecionadaRota(s.id)}
                                variant={selecionadasRota.includes(s.id) ? "destructive" : "default"}
                              >
                                {selecionadasRota.includes(s.id) ? "Remover da Rota" : "Adicionar à Rota"}
                              </Button>

                              {/* Rota individual (mantém) */}
                              <Button size="sm" variant="outline" onClick={() => rotaGoogle({ lat: s.lat, lng: s.lng })}>
                                Rota (Google)
                              </Button>
                              {/* Abrir detalhes */}
                              <Button size="sm" variant="outline" onClick={() => { setSelecionada(s.id); setPage("detalhes"); }}>
                                Abrir
                              </Button>
                            </div>
                          </div> {/* <-- FECHAMENTO QUE FALTAVA */}
                        </Popup>

                      </Marker>
                      {/* realce opcional */}
                      <Circle center={[s.lat, s.lng]} radius={selected ? 0 : 0} pathOptions={{ color, fillOpacity: 0.2 }} />
                    </React.Fragment>
                  );
                })}

                {/* Linha da minha posição ao pin selecionado */}
                {/*{myPos && selectedId !== null && (() => {
                  const sel = solicitacoes.find(x => x.id === selectedId);
                  if (!sel) return null;
                  return (
                    <Polyline positions={[[myPos.lat, myPos.lng], [sel.lat, sel.lng]]} />
                  );
                })()}*/}
              </MapContainer>
            </div>

            {/* Lista rápida dos próximos (quando tiver posição) */}
            {myPos && (
              <div className="px-4 py-3 border-t text-sm">
                <span className="font-medium">Próximos de você ({raioKm} km): </span>
                {solicitacoes
                  .map(s => ({ s, d: distKm(myPos, {lat:s.lat, lng:s.lng}) }))
                  .filter(x => x.d <= raioKm)
                  .sort((a,b) => a.d - b.d)
                  .slice(0,8)
                  .map(({s,d},i) => (
                    <button
                      key={s.id}
                      className="underline ml-2"
                      onClick={() => setSelectedId(s.id)}
                      title="Selecionar no mapa"
                    >
                      {i ? '• ' : ''}{s.solicitacao} ({d.toFixed(1)} km)
                    </button>
                  ))
                }
                {solicitacoes.filter(s => myPos && distKm(myPos,{lat:s.lat,lng:s.lng}) <= raioKm).length === 0 && (
                  <span className="ml-2 text-gray-600">nenhum no raio atual</span>
                )}
              </div>
            )}
          </Card>

        </div>
      )}


      {/* RELATORIOS */}
      {page === "relatorios" && perfil === "escritorio" && (
        <Card className="w-full max-w-6xl p-6 shadow-lg bg-white mx-auto">
          <h2 className="text-lg font-semibold mb-4">Relatórios</h2>
          {/* Aqui você coloca a tabela de produção, km e mapa */}
        </Card>
      )}

      {/* Detalhes */}
      {page === "detalhes" && atual && (
        <Card className="w-full max-w-xl p-6 shadow-lg bg-white mx-auto mt-10">
          <h2 className="text-lg font-semibold mb-3">Detalhes da Solicitação</h2>
          <p><strong>Solicitação:</strong> {atual.solicitacao}</p>
          <p><strong>Status:</strong> {badge(atual.status)}</p>
          <p><strong>Cliente:</strong> {atual.cliente}</p>
          <p><strong>Município:</strong> {atual.municipio}</p>
          <p><strong>Detalhes:</strong> {atual.detalhes}</p>
          <p><strong>Prazo:</strong> {atual.prazo}</p>
          {(() => {
            const p = prazoInfo(atual.prazo);
            return p ? <p className={`text-sm mt-1 ${p.className}`}>{p.text}</p> : null;
          })()}
          <p><strong>Coordenadas:</strong> {atual.lat}, {atual.lng}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={() => setPage("dashboard")} variant="outline">Voltar</Button>
            <Button onClick={() => openInGoogleMaps(atual.lat, atual.lng)}><MapPin size={16} className="mr-1" /> Ver no mapa</Button>
            <Button variant={showPhotos ? "default" : "outline"} onClick={() => setShowPhotos((v) => !v)}>{showPhotos ? "Ocultar fotos" : "Ver fotos"}</Button>
            {atual.status === "Andamento" && (
              <Button className="bg-green-600 text-white" onClick={() => concluirCampo(atual.id)}>Concluir</Button>
            )}
          </div>
          {showPhotos && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {atual.fotos.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt={`foto-${i}`}
                  className="rounded-lg shadow cursor-pointer"
                  title="Ver em tela cheia"
                  onClick={() => abrirTelaCheia(url)}
                />
              ))}
            </div>
          )}

        </Card>
      )}
      {/* Escritório */}
      {page === "escritorio" && (
        <div className="w-full max-w-6xl grid grid-cols-1 gap-6 mx-auto">
          {/* Avisos */}
          {(() => {
            // 1) Equipes sem NENHUMA solicitação
            const equipesComQualquer = new Set(
              solicitacoes.map((s) => s.equipe).filter((e): e is string => !!e)
            );
            const equipesSemSolic = EQUIPES.filter((e) => !equipesComQualquer.has(e));

            // 2) Equipes mencionadas mas sem demanda ATIVA (informativo adicional)
            const equipesComAtivas = new Set(
              solicitacoes.filter((s) => s.equipe && s.status !== "Finalizada").map((s) => s.equipe as string)
            );
            const equipesMencionadas = Array.from(equipesComQualquer);
            const equipesSemAtivasEntreMencionadas = equipesMencionadas.filter((eq) => !equipesComAtivas.has(eq));

            return (
              <div className="grid gap-3">
                {equipesSemSolic.length > 0 && (
                  <Card className="p-4 border-l-4 border-amber-600 bg-amber-50">
                    <p className="text-sm text-amber-900">
                      <strong>Aviso:</strong> {equipesSemSolic.length} equipe(s) estão sem nenhuma solicitação: {equipesSemSolic.slice(0, 20).join(", ")}
                      {equipesSemSolic.length > 20 ? ` e +${equipesSemSolic.length - 20}` : ""}.
                    </p>
                  </Card>
                )}
                {equipesSemAtivasEntreMencionadas.length > 0 && (
                  <Card className="p-4 border-l-4 border-blue-600 bg-blue-50">
                    <p className="text-sm text-blue-900">
                      <strong>Info:</strong> {equipesSemAtivasEntreMencionadas.length} equipe(s) mencionadas estão sem demandas ativas: {equipesSemAtivasEntreMencionadas.slice(0, 20).join(", ")}
                      {equipesSemAtivasEntreMencionadas.length > 20 ? ` e +${equipesSemAtivasEntreMencionadas.length - 20}` : ""}.
                    </p>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* Formulário de novo envio */}
          <Card className="p-6 shadow-lg bg-white">
  <h2 className="text-lg font-semibold mb-4">Novo Envio de Demandas (Escritório)</h2>
    {/* Importação em Lote (CSV) */}
    <div className="mb-4 flex flex-wrap gap-2 items-center">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const txt = await file.text();
          const table = parseCSV(txt);
          if (!table.length) { alert("CSV vazio."); return; }

          // mapeia cabeçalho → índice
          const header = table[0].map(h => h.toLowerCase());
          const idx = (name:string) => header.findIndex(h => h === name);

          const must = ["solicitacao","cliente","regional","municipio","lat","lng","prazo","equipe"];
          for (const f of must) {
            if (idx(f) < 0) { alert(`Coluna obrigatória ausente: ${f}`); return; }
          }

          const rows: CsvRow[] = table.slice(1).map(cols => ({
            solicitacao: cols[idx("solicitacao")] || "",
            cliente:     cols[idx("cliente")] || "",
            regional:    cols[idx("regional")] || "",
            municipio:   cols[idx("municipio")] || "",
            povoado:     idx("povoado")>=0 ? cols[idx("povoado")] : "",
            telefone:    idx("telefone")>=0 ? cols[idx("telefone")] : "",
            detalhes:    idx("detalhes")>=0 ? cols[idx("detalhes")] : "",
            lat:         cols[idx("lat")] || "",
            lng:         cols[idx("lng")] || "",
            prazo:       cols[idx("prazo")] || "",
            prioridade:  idx("prioridade")>=0 ? cols[idx("prioridade")] : "",
            equipe:      cols[idx("equipe")] || "",
          }));

          // validação rápida
          const invalid = rows.find(r => !r.solicitacao || !r.cliente || !r.municipio || !r.lat || !r.lng || !r.prazo || !r.equipe);
          if (invalid) { alert("Há linhas com campos obrigatórios vazios."); return; }

          const novas = rowsToSolicitacoes(rows);

          // evita duplicar nº de solicitação
          const setExist = new Set(solicitacoes.map(s => normalizeSolic(s.solicitacao)));
          const semDuplicadas = novas.filter(n => !setExist.has(normalizeSolic(n.solicitacao)));
          const qtdIgnoradas = novas.length - semDuplicadas.length;

          setSolicitacoes(prev => [...semDuplicadas, ...prev]);
          alert(`✅ Importadas ${semDuplicadas.length} solicitações.${qtdIgnoradas?` (${qtdIgnoradas} ignoradas por duplicidade).`: ""}`);
          (e.target as HTMLInputElement).value = "";
        }}
      />
      <a
        className="text-sm underline"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(
    `solicitacao,cliente,regional,municipio,povoado,telefone,detalhes,lat,lng,prazo,prioridade,equipe
    CT-UNR-THE-0000000001,JOAO DA SILVA,Metropolitana,Teresina,,(89)99999-9999,PERTO DO COLEGIO,-5.12,-42.79,2025-08-22,emergencial,EPI01`
        )}`}
        download="modelo_fieldpro.csv"
      >
        Baixar modelo CSV
      </a>
    </div>

  <form
    className="grid grid-cols-1 md:grid-cols-2 gap-4"
    onSubmit={handleSubmitEscritorio}
  >
    {/* Nº Solicitação */}
    <div className="space-y-1">
      <label className="text-sm">Nº da solicitação</label>
      <Input
        placeholder="ex.: CT-UNR-XXX-0000000000"
        className={`h-10 uppercase ${solicitacaoDuplicada ? "border-red-500 focus:ring-red-500" : ""}`}
        value={form.nomeSolicitacao}
        onChange={(e) =>
          setForm({ ...form, nomeSolicitacao: e.target.value.toUpperCase() })
        }
        aria-invalid={solicitacaoDuplicada}
        title={solicitacaoDuplicada ? "Já existe uma solicitação com esse número" : ""}
      />

      {solicitacaoDuplicada && (
        <p className="text-xs text-red-600 mt-1">
          Já existe uma solicitação cadastrada com esse número.
        </p>
      )}
    </div>

    {/* Cliente */}
    <div className="space-y-1">
      <label className="text-sm">Nome do cliente</label>
      <Input
        className="h-10 w-full"
        value={form.nomeCliente}
        onChange={(e) => setForm({ ...form, nomeCliente: e.target.value.toUpperCase() })}
      />
    </div>
    {/* Regional */}
    <div className="space-y-1">
      <label className="text-sm">Regional</label>
      <select
        className="h-10 rounded-md border px-3 text-sm w-full"
        value={form.regional}
        onChange={(e) => setForm({ ...form, regional: e.target.value })}
      >
        <option value="">Selecione</option>
        <option value="METROPOLITANA">Metropolitana</option>
        <option value="PICOS">Picos</option>
        <option value="FLORIANO">Floriano</option>
        <option value="PARNAIBA">Parnaíba</option>
      </select>
    </div>
    {/* Município */}
    <div className="space-y-1">
      <label className="text-sm">Município</label>
      <select
        className="h-10 rounded-md border px-3 text-sm w-full"
        value={form.municipio}
        onChange={(e) => setForm({ ...form, municipio: e.target.value })}
      >
        <option value="">Selecione</option>
        {MUNICIPIOS_PIAUI.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>

    {/* Prazo */}
    <div className="space-y-1">
      <label className="text-sm">Prazo</label>
      <Input
        type="date"
        className="h-10 w-full"
        value={form.prazo}
        onChange={(e) => setForm({ ...form, prazo: e.target.value })}
      />
    </div>

    {/* Equipe */}
    <div className="space-y-1">
      <label className="text-sm">Equipe</label>
      <select
        className="h-10 rounded-md border px-3 text-sm w-full"
        value={form.equipe}
        onChange={(e) => setForm({ ...form, equipe: e.target.value })}
      >
        {EQUIPES.map((eq) => (
          <option key={eq} value={eq}>
            {eq}
          </option>
        ))}
      </select>
    </div>

    {/* Povoado */}
    <div className="space-y-1">
      <label className="text-sm">Povoado</label>
      <Input
        className="h-10"
        value={form.povoado}
        onChange={(e) => setForm({ ...form, povoado: e.target.value.toUpperCase() })}
      />
    </div>

    {/* Telefone */}
    <div className="space-y-1">
      <label className="text-sm">Telefone</label>
      <Input
        className="h-10 w-full"
        value={form.telefone}
        onChange={(e) => {
          // Mantém apenas números, (, ), e -
          const value = e.target.value.replace(/[^0-9()\-\s]/g, "");
          setForm({ ...form, telefone: value });
        }}
        placeholder="Ex: (89) 99999-9999"
      />
    </div>

    {/* Detalhes */}
    <div className="space-y-1">
      <label className="text-sm">Detalhes</label>
      <Input
        className="h-10 w-full"
        value={form.detalhes}
        onChange={(e) => setForm({ ...form,detalhes: e.target.value.toUpperCase() })}
      />
    </div>

    {/* Latitude */}
    <div className="space-y-1">
      <label className="text-sm">Latitude</label>
      <Input
        className="h-10 w-full"
        inputMode="decimal"
        value={form.lat}
        onChange={(e) => {
          const raw = e.target.value;
          const value = raw.replace(",", "."); // vírgula → ponto

          const ok =
            value === "" ||
            value === "-" ||
            /^-?\d+(\.\d*)?$/.test(value) ||
            /^-?\d*\.$/.test(value);

          if (ok) {
            setForm({ ...form, lat: value });
          }
        }}
        placeholder="Ex: -5.1234"
      />
    </div>

    {/* Longitude */}
    <div className="space-y-1">
      <label className="text-sm">Longitude</label>
      <Input
        className="h-10 w-full"
        inputMode="decimal"
        value={form.lng}
        onChange={(e) => {
          const raw = e.target.value;
          const value = raw.replace(",", "."); // vírgula → ponto

          // Permite: vazio (digitando), "-", números, um ponto opcional, ponto no fim (ex: "-42.")
          const ok =
            value === "" ||
            value === "-" ||
            /^-?\d+(\.\d*)?$/.test(value) || // "-42", "-42.", "-42.9"
            /^-?\d*\.$/.test(value);         // "-.", "42." durante a digitação

          if (ok) {
            setForm({ ...form, lng: value });
          }
        }}
        placeholder="Ex: -42.9876"
      />
    </div>
    {/* Prioridade */}
    <div className="md:col-span-2 flex items-center gap-3">
      <span className="text-sm">Prioridade:</span>
      <Button
        type="button"
        variant={form.prioridade === "normal" ? "default" : "outline"}
        onClick={() => setForm({ ...form, prioridade: "normal" })}
      >
        Normal
      </Button>
      <Button
        type="button"
        variant={form.prioridade === "emergencial" ? "destructive" : "outline"}
        onClick={() => setForm({ ...form, prioridade: "emergencial" })}
      >
        Emergencial
      </Button>
    </div>

    {/* Área de anexos: seleciona, cola (Ctrl+V) e lista com remover */}
  <div
    className="col-span-1 md:col-span-2"
    onPaste={handlePasteImages} // ✅ permite colar imagens
  >
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => addFiles(e.target.files)} // ✅ acumula anexos
        />
        <span className="text-sm text-gray-600">
          Você pode <strong>colAR (Ctrl+V)</strong> screenshots aqui.
        </span>
      </div>
      {/* Pré-visualização dos anexos com botão remover */}
      {previewUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previewUrls.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt={`anexo-${i}`}
                className="w-full h-28 object-cover rounded-md border cursor-pointer"
                title="Ver em tela cheia"
                onClick={() => abrirTelaCheia(url)}
              />
              <button
                type="button"
                onClick={() => removeFotoAt(i)}
                className="absolute top-1 right-1 px-2 py-1 text-xs rounded bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                title="Remover imagem"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    <p className="text-xs text-gray-500 mt-2">
      Anexe ou cole imagens do local/cliente. Você pode selecionar várias vezes; os arquivos serão acumulados.
    </p>
  </div>
</div>

    {/* Ações */}
    <div className="md:col-span-2 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => setPage("login")}>
        Cancelar
      </Button>
      <Button type="submit" disabled={solicitacaoDuplicada}>
        Enviar Solicitação
      </Button>
    </div>
            </form>
          </Card>

          {/* Tabela com filtros */}
          <Card className="p-6 shadow-lg bg-white">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold">Todas as Demandas (todas as equipes)</h2>

              {/* Botões de exportar/importar CSV */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => download("fieldpro_solicitacoes.csv", toCSV(solicitacoes))}
                >
                  Exportar CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv";
                    input.onchange = async (e) => {
                      // 👇 converte o alvo para HTMLInputElement em uma linha
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;

                      const text = await file.text();
                      const rows: string[][] = parseCSV(text);                  // mantém o tipo implícito
                      const novas = rowsToSolicitacoes(rows as any); // mantém as any se não quiser tipar agora

                      setSolicitacoes((prev) => [...novas, ...prev]);
                      alert(`✅ Importadas ${novas.length} solicitações`);
                    };
                    input.click();
                  }}
                >
                  Importar CSV
                </Button>
              </div>
              {/* fim botões */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input
                  placeholder="Buscar nº ou nome…"
                  value={buscaEscr}
                  onChange={(e) => setBuscaEscr(e.target.value)}
                  className="h-10"
                />
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={filtroRegionalEscr}
                  onChange={(e) => setFiltroRegionalEscr(e.target.value as "Todas" | Regional)}
                >
                  <option value="Todas">Regional: Todas</option>
                  {REGIOES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select className="h-10 rounded-md border px-3 text-sm" value={filtroMunicipioEscr} onChange={(e) => setFiltroMunicipioEscr(e.target.value)}>
                  <option value="">Município: Todos</option>
                  {MUNICIPIOS_PIAUI.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select className="h-10 rounded-md border px-3 text-sm" value={filtroEquipeEscr} onChange={(e) => setFiltroEquipeEscr(e.target.value)}>
                  <option value="Todas">Equipe: Todas</option>
                  {EQUIPES.map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
                <select className="h-10 rounded-md border px-3 text-sm" value={filtroStatusEscr} onChange={(e) => setFiltroStatusEscr(e.target.value as "Todos" | Status)}>
                  <option value="Todos">Status: Todos</option>
                  <option value="Andamento">Andamento</option>
                  <option value="Concluída (Campo)">Concluída (Campo)</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm justify-end">
                  <input type="checkbox" checked={somenteEmergenciaisEscr} onChange={(e) => setSomenteEmergenciaisEscr(e.target.checked)} />
                  Somente emergenciais
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-3">Solicitação</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="px-4 py-2">Regional</th>
                    <th className="py-2 pr-3">Município</th>
                    <th className="py-2 pr-3">Equipe</th>
                    <th className="py-2 pr-3">Prazo</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Urgência</th>
                    <th className="py-2 pr-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((s) => (
                      <tr key={s.id} className="border-t border-gray-200">
                        <td className="py-2 pr-3 font-medium">{s.solicitacao}</td>
                        <td className="py-2 pr-3">{s.cliente}</td>
                        <td className="px-4 py-2">{s.regional || "-"}</td>
                        <td className="py-2 pr-3">{s.municipio}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <select
                              className={`h-9 rounded-md border px-2 text-xs ${
                                s.status === "Finalizada" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                              }`}
                              value={s.equipe || ""}
                              onChange={(e) => reatribuirEquipe(s.id, e.target.value)}
                              disabled={s.status === "Finalizada"} // ← ADICIONADO
                              title={s.status === "Finalizada" ? "Não é possível editar equipe após finalizar" : ""} // ← ADICIONADO
                            >
                              <option value="">—</option>
                              {EQUIPES.map((eq) => (
                                <option key={eq} value={eq}>{eq}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                        <div>{s.prazo}</div>
                        {(() => {
                          const p = prazoInfo(s.prazo);
                          return p ? <div className={`text-xs ${p.className}`}>{p.text}</div> : null;
                        })()}
                      </td>
                        <td className="py-2 pr-3">{badge(s.status)}</td>
                        <td className="py-2 pr-3">{s.emergencial ? <span className="text-red-600 font-semibold">Emergencial</span> : "Normal"}</td>
                        <td className="py-2 pr-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelecionada(s.id); setPage("detalhes"); }}>Abrir</Button>
                          <Button size="sm" onClick={() => openInGoogleMaps(s.lat, s.lng)}>Mapa</Button>
                          <Button size="sm" onClick={() => finalizarEscritorio(s.id)} disabled={s.status !== "Concluída (Campo)"}>Finalizar</Button>
                          <Button size="sm" variant="outline" onClick={() => devolverParaCampo(s.id)} disabled={s.status === "Finalizada"} title={s.status === "Finalizada" ? "Não é possível devolver após finalizar" : "Devolver a Campo"}>
                            <Undo2 size={14} className="mr-1" />
                            Devolver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrirEditor(s)}>Editar</Button>
                          <Button size="sm"variant="destructive" onClick={() => excluirSolicitacao(s.id)} disabled={s.status === "Finalizada"} 
                            title={s.status === "Finalizada" ? "Não é possível excluir após finalizar" : "Excluir"}
                            >Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {page === "relatorios" && perfil === "escritorio" && (
        <RelatoriosView equipes={EQUIPES} />
      )}

      {/* Editor (overlay simples) */}
      {editId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Editar Solicitação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm mb-1 block">Nº da Solicitação</label>
                <Input value={editForm.solicitacao} onChange={(e) => setEditForm({ ...editForm, solicitacao: e.target.value })} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Cliente</label>
                <Input value={editForm.cliente} onChange={(e) => setEditForm({ ...editForm, cliente: e.target.value })} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Município</label>
                <select className="h-10 rounded-md border px-3 text-sm w-full" value={editForm.municipio} onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })}>
                  <option value="">Selecione</option>
                  {MUNICIPIOS_PIAUI.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm mb-1 block">Detalhes</label>
                <Input value={editForm.detalhes} onChange={(e) => setEditForm({ ...editForm, detalhes: e.target.value })} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Prazo</label>
                <Input value={editForm.prazo} onChange={(e) => setEditForm({ ...editForm, prazo: e.target.value })} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Equipe</label>
                <select className="h-10 rounded-md border px-3 text-sm w-full" value={editForm.equipe} onChange={(e) => setEditForm({ ...editForm, equipe: e.target.value })}>
                  <option value="">—</option>
                  {EQUIPES.map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm mb-1 block">Latitude</label>
                <Input value={editForm.lat} onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Longitude</label>
                <Input value={editForm.lng} onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })} />
              </div>
              <div>
                <label className="text-sm mb-1 block">Status</label>
                <select className="h-10 rounded-md border px-3 text-sm w-full" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Status })}>
                  <option value="Andamento">Andamento</option>
                  <option value="Concluída (Campo)">Concluída (Campo)</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm mt-2">
                <input type="checkbox" checked={editForm.emergencial} onChange={(e) => setEditForm({ ...editForm, emergencial: e.target.checked })} />
                Emergencial
              </label>
            </div>
              {/* Anexos (editar): adicionar, colar e remover imagens */}
              <div
                className="md:col-span-2 mt-2"
                onPaste={handlePasteImagesEdit}
                tabIndex={0}
              >
                <label className="text-sm mb-1 block">Imagens</label>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => addFilesEdit(e.target.files)}
                    />
                    <span className="text-xs text-gray-600">
                      Você pode colar imagens aqui (Ctrl+V).
                    </span>
                  </div>

                  {editFotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {editFotos.map((f, i) => {
                        const url = typeof f === "string" ? f : URL.createObjectURL(f);
                        return (
                          <div key={i} className="relative group">
                            <img
                              src={url}
                              alt={`foto-${i}`}
                              className="w-full h-28 object-cover rounded-md border cursor-pointer"
                              title="Ver em tela cheia"
                              onClick={() => abrirTelaCheia(url)}
                              onLoad={() => { if (typeof f !== "string") URL.revokeObjectURL(url); }}
                            />
                            <button
                              type="button"
                              onClick={() => removeFotoEditAt(i)}
                              className="absolute top-1 right-1 px-2 py-1 text-xs rounded bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                              title="Remover imagem"
                            >
                              Remover
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={cancelarEdicao}>Cancelar</Button>
              <Button onClick={salvarEdicao}>Salvar alterações</Button>
            </div>
          </Card>
        </div>
      )}

            {/* Tela cheia de imagem (simples) */}
      {fullImgSrc && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={fecharTelaCheia}
          onKeyDown={(e) => { if (e.key === "Escape") fecharTelaCheia(); }}
          tabIndex={0}
        >
          <img
            src={fullImgSrc!}
            alt="imagem em tela cheia"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 px-3 py-1 rounded bg-white text-gray-900"
            onClick={fecharTelaCheia}
          >
            Fechar (Esc)
          </button>
        </div>
      )}

    </div>
  );
}

// =====================
// Componente de Relatórios (gráficos e filtros)
// =====================
function RelatoriosView({ equipes }: { equipes: string[] }) {
  // --- filtros de período e equipe (defaults: hoje e primeira equipe) ---
  const hojeISO = isoDateLocal();
  const [ini, setIni] = React.useState(hojeISO);
  const [fim, setFim] = React.useState(hojeISO);
  const [equipe, setEquipe] = React.useState(() => equipes[0] ?? "EPI01");

  // --- estados para séries e totais dos gráficos ---
  const [solicPorDia, setSolicPorDia] = React.useState<Array<{ dia: string; qtd: number }>>([]);
  const [kmPorDia, setKmPorDia] = React.useState<Array<{ dia: string; km: number }>>([]);
  const [kmTotal, setKmTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // Carrega ao montar (e quando “Aplicar” clicado)
  React.useEffect(() => {
    carregarRelatorios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca dados no Supabase e monta as séries de gráfico
  async function carregarRelatorios() {
    try {
      setLoading(true);
      setErro(null);

      // Constrói datas e define fim exclusivo para timestamps
      const iniDate = new Date(`${ini}T00:00:00`);
      const fimDate = new Date(`${fim}T00:00:00`);
      const fimExclusivo = new Date(fimDate);
      fimExclusivo.setDate(fimExclusivo.getDate() + 1);

      // --- 1) Solicitações por dia (tabela: producao, colunas: ymd date, equipe) ---
      const { data: prod, error: errProd } = await supabase
        .from("producao")
        .select("ymd")
        .eq("equipe", equipe)
        .gte("ymd", ini)
        .lte("ymd", fim)
        .order("ymd", { ascending: true });

      if (errProd) throw errProd;

      // agrega contagem por dia
      const contPorDia: Record<string, number> = {};
      for (const r of prod ?? []) {
        const d = r.ymd as string; // 'YYYY-MM-DD'
        contPorDia[d] = (contPorDia[d] ?? 0) + 1;
      }

      // eixo X contínuo (todos os dias no intervalo)
      const listaDias: string[] = [];
      const cur = new Date(iniDate);
      while (cur <= fimDate) {
        const key = cur.toISOString().slice(0, 10);
        listaDias.push(key);
        cur.setDate(cur.getDate() + 1);
      }
      const serieSolic = listaDias.map((d) => ({
        dia: d.split("-").reverse().join("/"),
        qtd: contPorDia[d] ?? 0,
      }));

      setSolicPorDia(serieSolic);

      // --- 2) Km percorridos (tabela: trilha_pontos, colunas: equipe, ts, lat, lng) ---
      const { data: trilha, error: errTrilha } = await supabase
        .from("trilha_pontos")
        .select("ts, lat, lng")
        .eq("equipe", equipe)
        .gte("ts", iniDate.toISOString())
        .lt("ts", fimExclusivo.toISOString())
        .order("ts", { ascending: true });

      if (errTrilha) throw errTrilha;

      const mapaKm: Record<string, number> = {};
      let prev: { ts: string; lat: number; lng: number } | null = null;
      let total = 0;

      for (const p of trilha ?? []) {
        if (prev) {
          const diaPrev = prev.ts.slice(0, 10);
          const diaAtual = p.ts.slice(0, 10);
          if (diaPrev === diaAtual) {
            const d = distKm({ lat: prev.lat, lng: prev.lng }, { lat: p.lat, lng: p.lng });
            mapaKm[diaAtual] = (mapaKm[diaAtual] ?? 0) + d;
            total += d;
          }
        }
        prev = p;
      }

      const serieKm = listaDias.map((d) => ({
        dia: d.split("-").reverse().join("/"),
        km: Number((mapaKm[d] ?? 0).toFixed(2)),
      }));

      setKmPorDia(serieKm);
      setKmTotal(Number(total.toFixed(2)));
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message :
          typeof e === 'string' ? e :
          'Falha ao carregar relatórios';
        setErro(msg);
      } finally { 
        setLoading(false);
      }
  }

  // ---------- UI dos Relatórios ----------
  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 items-end p-4">
          <div className="flex flex-col">
            <label className="text-sm mb-1">Data inicial</label>
            <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Data final</label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Equipe</label>
            <select
              className="border rounded h-10 px-3"
              value={equipe}
              onChange={(e) => setEquipe(e.target.value)}
            >
              {equipes.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
              {/* adicione as demais equipes */}
            </select>
          </div>
          <Button onClick={carregarRelatorios} disabled={loading}>
            {loading ? "Atualizando..." : "Aplicar"}
          </Button>
          {erro && <span className="text-red-500 text-sm">{erro}</span>}
        </CardContent>
      </Card>

      {/* Gráfico 1: Solicitações por dia */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">Solicitações por dia</h3>
          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={solicPorDia}>
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qtd" name="Solicitações" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico 2: Km total no período (donut) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">Km percorridos (total no período)</h3>
          <div className="w-full flex items-center justify-center" style={{ height: 260 }}>
            <ResponsiveContainer width="60%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Km", value: kmTotal },
                    { name: "Base", value: 0.0001 }, // só para desenhar o anel
                  ]}
                  dataKey="value"
                  innerRadius={"60%"}
                  outerRadius={"80%"}
                >
                  <Cell />
                  <Cell />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="ml-8 text-center">
              <div className="text-4xl font-bold">{kmTotal.toFixed(2)} km</div>
              <div className="text-sm opacity-70">
                {ini.split("-").reverse().join("/")} – {fim.split("-").reverse().join("/")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Gráfico 3: Km por dia */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">Km percorridos por dia</h3>
          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={kmPorDia}>
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="km" name="Km" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}