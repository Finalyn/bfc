import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Bell,
  Users,
  Search,
  Building2,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  List,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Prospect {
  id: number;
  nom: string;
  enseigne: string;
  adresse: string;
  codePostal: string;
  ville: string;
  tel: string;
  email: string;
  notes: string;
  commercialId: number | null;
  commercialName: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
}

interface ProspectEvent {
  id: number;
  prospectId: number;
  type: string;
  titre: string;
  description: string;
  dateEvenement: string;
  heureEvenement: string;
  rappel: boolean;
  rappelDate: string | null;
  rappelEnvoye: boolean;
  commercialName: string;
  createdAt: string;
}

const STATUTS = [
  { value: "nouveau", label: "Nouveau", color: "bg-blue-100 text-blue-700" },
  { value: "contacte", label: "Contacté", color: "bg-yellow-100 text-yellow-700" },
  { value: "rdv_planifie", label: "RDV planifié", color: "bg-purple-100 text-purple-700" },
  { value: "relance", label: "Relance", color: "bg-orange-100 text-orange-700" },
  { value: "converti", label: "Converti", color: "bg-green-100 text-green-700" },
  { value: "perdu", label: "Perdu", color: "bg-red-100 text-red-700" },
];

const EVENT_TYPES = [
  { value: "rdv", label: "RDV" },
  { value: "appel", label: "Appel" },
  { value: "email", label: "Email" },
  { value: "relance", label: "Relance" },
  { value: "note", label: "Note" },
];

function getStatutBadge(statut: string) {
  const s = STATUTS.find((st) => st.value === statut) || STATUTS[0];
  return <Badge className={s.color}>{s.label}</Badge>;
}

export default function ProspectsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const userName = localStorage.getItem("userName") || "";
  const userRole = localStorage.getItem("userRole") || "commercial";
  const isAdmin = userRole === "admin";
  const isAuthenticated = localStorage.getItem("authenticated") === "true";

  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("liste");

  const [formData, setFormData] = useState({
    nom: "",
    enseigne: "",
    adresse: "",
    codePostal: "",
    ville: "",
    tel: "",
    email: "",
    notes: "",
    statut: "nouveau",
  });

  const [eventFormData, setEventFormData] = useState({
    type: "rdv",
    titre: "",
    description: "",
    dateEvenement: "",
    heureEvenement: "",
    rappel: false,
    rappelDate: "",
  });

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const queryKey = isAdmin
    ? ["/api/prospects"]
    : [`/api/prospects?commercial=${encodeURIComponent(userName)}`];

  const { data: prospectsResponse, isLoading } = useQuery<{ data: Prospect[] }>({
    queryKey,
  });

  const { data: eventsResponse } = useQuery<{ data: ProspectEvent[] }>({
    queryKey: [`/api/prospects/${selectedProspect?.id}/events`],
    enabled: !!selectedProspect,
  });

  interface EnrichedEvent extends ProspectEvent {
    prospectNom: string;
    prospectEnseigne: string;
  }

  const calendarEventsKey = isAdmin
    ? ["/api/prospect-events/all"]
    : [`/api/prospect-events/all?commercial=${encodeURIComponent(userName)}`];

  const { data: calendarEventsResponse } = useQuery<{ data: EnrichedEvent[] }>({
    queryKey: calendarEventsKey,
  });

  const allProspects = prospectsResponse?.data || [];
  const events = eventsResponse?.data || [];
  const allCalendarEvents = calendarEventsResponse?.data || [];

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allCalendarEvents
      .filter(e => {
        try {
          const d = parseISO(e.dateEvenement);
          return isAfter(d, addDays(today, -1));
        } catch { return false; }
      })
      .sort((a, b) => a.dateEvenement.localeCompare(b.dateEvenement));
  }, [allCalendarEvents]);

  const getEventsForDate = (date: Date) => {
    return allCalendarEvents.filter(e => {
      try {
        return isSameDay(parseISO(e.dateEvenement), date);
      } catch { return false; }
    });
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const filteredProspects = useMemo(() => {
    let list = allProspects;
    if (filterStatut !== "all") {
      list = list.filter((p) => p.statut === filterStatut);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(s) ||
          p.enseigne.toLowerCase().includes(s) ||
          p.ville.toLowerCase().includes(s)
      );
    }
    return list;
  }, [allProspects, filterStatut, search]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/prospects", data),
    onSuccess: () => {
      toast({ title: "Prospect créé" });
      queryClient.invalidateQueries({ queryKey });
      setProspectDialogOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/prospects/${id}`, data),
    onSuccess: () => {
      toast({ title: "Prospect mis à jour" });
      queryClient.invalidateQueries({ queryKey });
      setProspectDialogOpen(false);
      resetForm();
      if (selectedProspect && editingProspect) {
        setSelectedProspect({ ...selectedProspect, ...formData });
      }
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/prospects/${id}`),
    onSuccess: () => {
      toast({ title: "Prospect supprimé" });
      queryClient.invalidateQueries({ queryKey });
      setDeleteDialogOpen(false);
      if (selectedProspect?.id === deletingProspect?.id) {
        setSelectedProspect(null);
      }
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const createEventMutation = useMutation({
    mutationFn: ({ prospectId, data }: { prospectId: number; data: any }) =>
      apiRequest("POST", `/api/prospects/${prospectId}/events`, data),
    onSuccess: () => {
      toast({ title: "Événement ajouté" });
      queryClient.invalidateQueries({
        queryKey: [`/api/prospects/${selectedProspect?.id}/events`],
      });
      setEventDialogOpen(false);
      resetEventForm();
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/prospect-events/${id}`),
    onSuccess: () => {
      toast({ title: "Événement supprimé" });
      queryClient.invalidateQueries({
        queryKey: [`/api/prospects/${selectedProspect?.id}/events`],
      });
    },
  });

  const resetForm = () => {
    setFormData({ nom: "", enseigne: "", adresse: "", codePostal: "", ville: "", tel: "", email: "", notes: "", statut: "nouveau" });
    setEditingProspect(null);
  };

  const resetEventForm = () => {
    setEventFormData({ type: "rdv", titre: "", description: "", dateEvenement: "", heureEvenement: "", rappel: false, rappelDate: "" });
  };

  const openCreate = () => {
    resetForm();
    setProspectDialogOpen(true);
  };

  const openEdit = (p: Prospect) => {
    setEditingProspect(p);
    setFormData({
      nom: p.nom,
      enseigne: p.enseigne || "",
      adresse: p.adresse || "",
      codePostal: p.codePostal || "",
      ville: p.ville || "",
      tel: p.tel || "",
      email: p.email || "",
      notes: p.notes || "",
      statut: p.statut,
    });
    setProspectDialogOpen(true);
  };

  const handleSubmitProspect = () => {
    if (!formData.nom.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    const payload = { ...formData, commercialName: userName };
    if (editingProspect) {
      updateMutation.mutate({ id: editingProspect.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSubmitEvent = () => {
    if (!selectedProspect || !eventFormData.titre.trim() || !eventFormData.dateEvenement) {
      toast({ title: "Titre et date requis", variant: "destructive" });
      return;
    }
    createEventMutation.mutate({
      prospectId: selectedProspect.id,
      data: {
        ...eventFormData,
        commercialName: userName,
        rappelDate: eventFormData.rappel ? eventFormData.rappelDate : null,
      },
    });
  };

  // Detail view
  if (selectedProspect) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedProspect(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          </div>

          <Card className="mb-4">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{selectedProspect.nom}</CardTitle>
                {selectedProspect.enseigne && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {selectedProspect.enseigne}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatutBadge(selectedProspect.statut)}
                <Button size="icon" variant="ghost" onClick={() => openEdit(selectedProspect)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {selectedProspect.tel && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${selectedProspect.tel}`} className="text-primary">{selectedProspect.tel}</a>
                </p>
              )}
              {selectedProspect.email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${selectedProspect.email}`} className="text-primary">{selectedProspect.email}</a>
                </p>
              )}
              {(selectedProspect.adresse || selectedProspect.ville) && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {[selectedProspect.adresse, selectedProspect.codePostal, selectedProspect.ville].filter(Boolean).join(", ")}
                </p>
              )}
              {selectedProspect.notes && (
                <p className="flex items-start gap-2 pt-2 border-t">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  {selectedProspect.notes}
                </p>
              )}
              {isAdmin && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Commercial : {selectedProspect.commercialName}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Événements */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Historique & RDV
            </h2>
            <Button size="sm" onClick={() => { resetEventForm(); setEventDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>

          {events.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun événement</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {events
                .sort((a, b) => b.dateEvenement.localeCompare(a.dateEvenement))
                .map((evt) => (
                  <Card key={evt.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{EVENT_TYPES.find(t => t.value === evt.type)?.label || evt.type}</Badge>
                            <span className="text-xs text-muted-foreground">{evt.dateEvenement}{evt.heureEvenement ? ` à ${evt.heureEvenement}` : ""}</span>
                            {evt.rappel && !evt.rappelEnvoye && (
                              <Bell className="w-3 h-3 text-orange-500" />
                            )}
                          </div>
                          <p className="text-sm font-medium">{evt.titre}</p>
                          {evt.description && <p className="text-xs text-muted-foreground mt-1">{evt.description}</p>}
                          {evt.rappelDate && <p className="text-xs text-orange-600 mt-1">Rappel: {evt.rappelDate}</p>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteEventMutation.mutate(evt.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Dialog ajout événement */}
          <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Type</Label>
                  <Select value={eventFormData.type} onValueChange={(v) => setEventFormData({ ...eventFormData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Titre *</Label>
                  <Input value={eventFormData.titre} onChange={(e) => setEventFormData({ ...eventFormData, titre: e.target.value })} placeholder="Ex: RDV découverte" />
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={eventFormData.dateEvenement} onChange={(e) => setEventFormData({ ...eventFormData, dateEvenement: e.target.value })} />
                </div>
                <div>
                  <Label>Heure</Label>
                  <Input type="time" value={eventFormData.heureEvenement} onChange={(e) => setEventFormData({ ...eventFormData, heureEvenement: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={eventFormData.description} onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="rappel" checked={eventFormData.rappel} onChange={(e) => setEventFormData({ ...eventFormData, rappel: e.target.checked })} />
                  <Label htmlFor="rappel">Activer un rappel push</Label>
                </div>
                {eventFormData.rappel && (
                  <div>
                    <Label>Date du rappel</Label>
                    <Input type="date" value={eventFormData.rappelDate} onChange={(e) => setEventFormData({ ...eventFormData, rappelDate: e.target.value })} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleSubmitEvent}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/hub")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Menu
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Suivi Prospects</h1>
            <p className="text-sm text-muted-foreground">{filteredProspects.length} prospect(s)</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nouveau
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="liste">
              <List className="w-4 h-4 mr-1" /> Prospects
            </TabsTrigger>
            <TabsTrigger value="calendrier">
              <Calendar className="w-4 h-4 mr-1" /> Calendrier
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liste">
            {/* Filtres */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Liste */}
            {isLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent></Card>
            ) : filteredProspects.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun prospect trouvé</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredProspects.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedProspect(p)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{p.nom}</p>
                            {getStatutBadge(p.statut)}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {p.enseigne && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.enseigne}</span>}
                            {p.ville && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.ville}</span>}
                            {p.tel && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.tel}</span>}
                          </div>
                          {isAdmin && <p className="text-xs text-primary mt-1">{p.commercialName}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeletingProspect(p); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendrier">
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="font-semibold capitalize">
                {format(calendarMonth, "MMMM yyyy", { locale: fr })}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Grille calendrier */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden mb-4">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                <div key={d} className="bg-muted p-1 text-center text-xs font-medium">{d}</div>
              ))}
              {/* Padding pour le premier jour */}
              {Array.from({ length: (calendarDays[0]?.getDay() || 7) - 1 }).map((_, i) => (
                <div key={`pad-${i}`} className="bg-background p-1 min-h-[60px]" />
              ))}
              {calendarDays.map(day => {
                const dayEvents = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className={`bg-background p-1 min-h-[60px] ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}>
                    <p className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</p>
                    {dayEvents.slice(0, 2).map(evt => (
                      <div key={evt.id} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${
                        evt.type === "rdv" ? "bg-purple-100 text-purple-700" :
                        evt.type === "appel" ? "bg-blue-100 text-blue-700" :
                        evt.type === "relance" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {evt.heureEvenement ? `${evt.heureEvenement} ` : ""}{evt.titre}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Prochains événements */}
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Prochains RDV & relances
            </h3>
            {upcomingEvents.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">Aucun événement à venir</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 15).map(evt => (
                  <Card key={evt.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {EVENT_TYPES.find(t => t.value === evt.type)?.label || evt.type}
                            </Badge>
                            <span className="text-xs font-medium">
                              {(() => { try { return format(parseISO(evt.dateEvenement), "dd/MM/yyyy", { locale: fr }); } catch { return evt.dateEvenement; } })()}
                              {evt.heureEvenement ? ` à ${evt.heureEvenement}` : ""}
                            </span>
                            {evt.rappel && !evt.rappelEnvoye && <Bell className="w-3 h-3 text-orange-500" />}
                          </div>
                          <p className="text-sm font-medium">{evt.titre}</p>
                          <p className="text-xs text-muted-foreground">
                            {(evt as EnrichedEvent).prospectNom}
                            {(evt as EnrichedEvent).prospectEnseigne ? ` - ${(evt as EnrichedEvent).prospectEnseigne}` : ""}
                          </p>
                          {isAdmin && <p className="text-xs text-primary">{evt.commercialName}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog création/édition prospect */}
      <Dialog open={prospectDialogOpen} onOpenChange={setProspectDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProspect ? "Modifier le prospect" : "Nouveau prospect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom du contact *</Label>
              <Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} placeholder="Ex: Jean Dupont" />
            </div>
            <div>
              <Label>Enseigne / Magasin</Label>
              <Input value={formData.enseigne} onChange={(e) => setFormData({ ...formData, enseigne: e.target.value })} placeholder="Ex: Carrefour Limoges" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Téléphone</Label>
                <Input value={formData.tel} onChange={(e) => setFormData({ ...formData, tel: e.target.value })} type="tel" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Code postal</Label>
                <Input value={formData.codePostal} onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={formData.statut} onValueChange={(v) => setFormData({ ...formData, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notes libres..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProspectDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitProspect}>{editingProspect ? "Modifier" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProspect?.nom} sera supprimé définitivement avec tous ses événements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingProspect && deleteMutation.mutate(deletingProspect.id)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
