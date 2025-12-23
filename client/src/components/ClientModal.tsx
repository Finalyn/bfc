import { useState } from "react";
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
import { Loader2, Save, X } from "lucide-react";
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

export function ClientModal({ open, onOpenChange, mode, clientData, onSuccess }: ClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return await apiRequest<ClientData>("POST", "/api/clients", data);
    },
    onSuccess: (data) => {
      toast({ title: "Client créé avec succès" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data/clients"] });
      onSuccess(data);
      onOpenChange(false);
      reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return await apiRequest<ClientData>("PATCH", `/api/clients/${clientData?.code}`, data);
    },
    onSuccess: (data) => {
      toast({ title: "Client mis à jour avec succès" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data/clients"] });
      onSuccess(data);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
          <DialogTitle>
            {mode === "create" ? "Nouveau client" : "Compléter les informations"}
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
            <Input
              id="adresse1"
              {...register("adresse1")}
              className="h-10"
              data-testid="input-client-adresse1"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="adresse2" className="text-xs">Adresse (suite)</Label>
            <Input
              id="adresse2"
              {...register("adresse2")}
              className="h-10"
              data-testid="input-client-adresse2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="codePostal" className="text-xs">Code postal</Label>
              <Input
                id="codePostal"
                {...register("codePostal")}
                className="h-10"
                data-testid="input-client-codepostal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ville" className="text-xs">Ville</Label>
              <Input
                id="ville"
                {...register("ville")}
                className="h-10"
                data-testid="input-client-ville"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="interloc" className="text-xs">Interlocuteur / Responsable</Label>
            <Input
              id="interloc"
              {...register("interloc")}
              className="h-10"
              data-testid="input-client-interloc"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tel" className="text-xs">Téléphone fixe</Label>
              <Input
                id="tel"
                type="tel"
                {...register("tel")}
                className="h-10"
                data-testid="input-client-tel"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="portable" className="text-xs">Portable</Label>
              <Input
                id="portable"
                type="tel"
                {...register("portable")}
                className="h-10"
                data-testid="input-client-portable"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mail" className="text-xs">Email</Label>
            <Input
              id="mail"
              type="email"
              {...register("mail")}
              className="h-10"
              data-testid="input-client-mail"
            />
            {errors.mail && <p className="text-xs text-destructive">{errors.mail.message}</p>}
          </div>

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
