import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const clientFormSchema = z.object({
  code: z.string().min(1, "Le code est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  adresse1: z.string().optional(),
  adresse2: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  interloc: z.string().optional(),
  tel: z.string().optional(),
  portable: z.string().optional(),
  mail: z.string().email("Email invalide").optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientData {
  id?: string;
  code: string;
  nom: string;
  adresse1?: string;
  adresse2?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  interloc?: string;
  tel?: string;
  portable?: string;
  mail?: string;
}

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  clientData?: ClientData | null;
  onSuccess: (client: ClientData) => void;
}

// Sauvegarde locale des modifications client en attente
function savePendingClientChange(change: { mode: "create" | "edit"; data: ClientFormData; code?: string }) {
  const pending = JSON.parse(localStorage.getItem("pendingClientChanges") || "[]");
  pending.push({ ...change, timestamp: new Date().toISOString() });
  localStorage.setItem("pendingClientChanges", JSON.stringify(pending));
}

// Sync les modifications client en attente
export async function syncPendingClientChanges(): Promise<number> {
  const pending = JSON.parse(localStorage.getItem("pendingClientChanges") || "[]");
  if (pending.length === 0) return 0;

  let synced = 0;
  const remaining: typeof pending = [];

  for (const change of pending) {
    try {
      if (change.mode === "create") {
        await apiRequest("POST", "/api/clients", change.data);
      } else {
        await apiRequest("PATCH", `/api/clients/${change.code}`, change.data);
      }
      synced++;
    } catch {
      remaining.push(change);
    }
  }

  localStorage.setItem("pendingClientChanges", JSON.stringify(remaining));
  return synced;
}

export function ClientModal({ open, onOpenChange, mode, clientData, onSuccess }: ClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOnline = navigator.onLine;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      code: clientData?.code || "",
      nom: clientData?.nom || "",
      adresse1: clientData?.adresse1 || "",
      adresse2: clientData?.adresse2 || "",
      codePostal: clientData?.codePostal || "",
      ville: clientData?.ville || "",
      pays: clientData?.pays || "",
      interloc: clientData?.interloc || "",
      tel: clientData?.tel || "",
      portable: clientData?.portable || "",
      mail: clientData?.mail || "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        code: clientData?.code || "",
        nom: clientData?.nom || "",
        adresse1: clientData?.adresse1 || "",
        adresse2: clientData?.adresse2 || "",
        codePostal: clientData?.codePostal || "",
        ville: clientData?.ville || "",
        pays: clientData?.pays || "",
        interloc: clientData?.interloc || "",
        tel: clientData?.tel || "",
        portable: clientData?.portable || "",
        mail: clientData?.mail || "",
      });
    }
  }, [open, clientData, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      if (!navigator.onLine) {
        savePendingClientChange({ mode: "create", data });
        return { ...data, _offline: true } as ClientData & { _offline?: boolean };
      }
      try {
        return await apiRequest<ClientData>("POST", "/api/clients", data);
      } catch (e) {
        // Erreur réseau — sauvegarder localement
        savePendingClientChange({ mode: "create", data });
        return { ...data, _offline: true } as ClientData & { _offline?: boolean };
      }
    },
    onSuccess: (data) => {
      const isOffline = (data as any)._offline;
      toast({
        title: isOffline ? "Client sauvegardé localement" : "Client créé avec succès",
        description: isOffline ? "Sera synchronisé au retour du réseau" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data/clients"] });
      onSuccess(data);
      onOpenChange(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      if (!navigator.onLine) {
        savePendingClientChange({ mode: "edit", data, code: clientData?.code });
        return { ...data, _offline: true } as ClientData & { _offline?: boolean };
      }
      try {
        return await apiRequest<ClientData>("PATCH", `/api/clients/${clientData?.code}`, data);
      } catch (e) {
        // Erreur réseau — sauvegarder localement
        savePendingClientChange({ mode: "edit", data, code: clientData?.code });
        return { ...data, _offline: true } as ClientData & { _offline?: boolean };
      }
    },
    onSuccess: (data) => {
      const isOffline = (data as any)._offline;
      toast({
        title: isOffline ? "Modification sauvegardée localement" : "Client mis à jour",
        description: isOffline ? "Sera synchronisé au retour du réseau" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data/clients"] });
      onSuccess(data);
      onOpenChange(false);
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? "Nouveau client" : "Compléter les informations"}
            {!isOnline && <WifiOff className="w-4 h-4 text-amber-500" />}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="code" className="text-xs">Code client *</Label>
              <Input
                id="code"
                {...register("code")}
                className="h-10"
                disabled={mode === "edit"}
                data-testid="input-client-code"
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="nom" className="text-xs">Nom / Raison sociale *</Label>
              <Input
                id="nom"
                {...register("nom")}
                className="h-10"
                data-testid="input-client-nom"
              />
              {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adresse1" className="text-xs">Adresse</Label>
            <Input id="adresse1" {...register("adresse1")} className="h-10" data-testid="input-client-adresse1" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="adresse2" className="text-xs">Adresse (suite)</Label>
            <Input id="adresse2" {...register("adresse2")} className="h-10" data-testid="input-client-adresse2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="codePostal" className="text-xs">Code postal</Label>
              <Input id="codePostal" {...register("codePostal")} className="h-10" data-testid="input-client-codepostal" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ville" className="text-xs">Ville</Label>
              <Input id="ville" {...register("ville")} className="h-10" data-testid="input-client-ville" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="interloc" className="text-xs">Interlocuteur / Responsable</Label>
            <Input id="interloc" {...register("interloc")} className="h-10" data-testid="input-client-interloc" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tel" className="text-xs">Téléphone fixe</Label>
              <Input id="tel" type="tel" {...register("tel")} className="h-10" data-testid="input-client-tel" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="portable" className="text-xs">Portable</Label>
              <Input id="portable" type="tel" {...register("portable")} className="h-10" data-testid="input-client-portable" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mail" className="text-xs">Email</Label>
            <Input id="mail" type="email" {...register("mail")} className="h-10" data-testid="input-client-mail" />
            {errors.mail && <p className="text-xs text-destructive">{errors.mail.message}</p>}
          </div>

          {!isOnline && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 flex items-center gap-2">
                <WifiOff className="w-3 h-3" />
                Mode hors ligne — les modifications seront synchronisées au retour du réseau
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11"
              disabled={isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={isPending}
              data-testid="button-save-client"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
