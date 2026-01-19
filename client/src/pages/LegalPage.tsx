import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Shield, Scale } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LegalPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/hub")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Informations légales</h1>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <Tabs defaultValue="mentions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="mentions" className="flex items-center gap-2" data-testid="tab-mentions">
              <FileText className="w-4 h-4" />
              Mentions légales
            </TabsTrigger>
            <TabsTrigger value="cgu" className="flex items-center gap-2" data-testid="tab-cgu">
              <Scale className="w-4 h-4" />
              CGU
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mentions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Mentions légales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-6 pr-4">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">Éditeur de l'application</h3>
                      <p className="text-muted-foreground">
                        BFC APP est éditée par la société BFC (Bazar France Commerce).<br />
                        Siège social : [Adresse du siège social]<br />
                        SIRET : [Numéro SIRET]<br />
                        RCS : [Numéro RCS]<br />
                        Capital social : [Montant du capital]<br />
                        Téléphone : [Numéro de téléphone]<br />
                        Email : contact@bfc-app.fr
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Directeur de la publication</h3>
                      <p className="text-muted-foreground">
                        [Nom du directeur de publication]<br />
                        En qualité de [Fonction]
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Hébergement</h3>
                      <p className="text-muted-foreground">
                        L'application est hébergée par Replit, Inc.<br />
                        Adresse : 355 Bryant Street, Suite 200, San Francisco, CA 94107, USA<br />
                        Site web : https://replit.com
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Propriété intellectuelle</h3>
                      <p className="text-muted-foreground">
                        L'ensemble des contenus présents sur cette application (textes, images, logos, 
                        graphismes, icônes) sont la propriété exclusive de BFC ou de ses partenaires 
                        et sont protégés par les lois françaises et internationales relatives à la 
                        propriété intellectuelle. Toute reproduction, représentation, modification, 
                        publication, adaptation de tout ou partie des éléments de l'application, 
                        quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation 
                        écrite préalable de BFC.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Protection des données personnelles</h3>
                      <p className="text-muted-foreground">
                        Conformément au Règlement Général sur la Protection des Données (RGPD) et à 
                        la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez d'un 
                        droit d'accès, de rectification, de suppression et de portabilité de vos données 
                        personnelles. Pour exercer ces droits, vous pouvez nous contacter à l'adresse : 
                        dpo@bfc-app.fr
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Cookies</h3>
                      <p className="text-muted-foreground">
                        Cette application utilise des cookies techniques nécessaires à son bon 
                        fonctionnement. Ces cookies ne collectent pas de données personnelles à des 
                        fins publicitaires. En utilisant l'application, vous acceptez l'utilisation 
                        de ces cookies techniques.
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cgu">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Conditions Générales d'Utilisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-6 pr-4">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 1 - Objet</h3>
                      <p className="text-muted-foreground">
                        Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir 
                        les modalités et conditions d'utilisation de l'application BFC APP, ainsi que 
                        les droits et obligations des utilisateurs. L'utilisation de l'application 
                        implique l'acceptation pleine et entière des présentes CGU.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 2 - Accès à l'application</h3>
                      <p className="text-muted-foreground">
                        L'accès à l'application BFC APP est réservé aux commerciaux et collaborateurs 
                        autorisés de BFC. Chaque utilisateur dispose d'identifiants personnels et 
                        confidentiels qu'il s'engage à ne pas divulguer. L'utilisateur est responsable 
                        de toutes les actions effectuées depuis son compte.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 3 - Services proposés</h3>
                      <p className="text-muted-foreground">
                        L'application BFC APP permet aux utilisateurs de :<br />
                        - Créer et gérer des commandes commerciales<br />
                        - Suivre les livraisons et inventaires<br />
                        - Générer des documents PDF et Excel<br />
                        - Recevoir des notifications de rappel<br />
                        - Consulter le tableau de bord personnel
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 4 - Obligations de l'utilisateur</h3>
                      <p className="text-muted-foreground">
                        L'utilisateur s'engage à :<br />
                        - Utiliser l'application conformément à son objet<br />
                        - Ne pas tenter de porter atteinte au bon fonctionnement de l'application<br />
                        - Signaler toute anomalie ou faille de sécurité détectée<br />
                        - Maintenir la confidentialité de ses identifiants<br />
                        - Fournir des informations exactes et à jour
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 5 - Propriété des données</h3>
                      <p className="text-muted-foreground">
                        Les données saisies dans l'application restent la propriété de BFC. L'utilisateur 
                        autorise BFC à utiliser ces données dans le cadre de son activité commerciale. 
                        Les données sont conservées pendant la durée nécessaire aux finalités pour 
                        lesquelles elles sont collectées.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 6 - Disponibilité</h3>
                      <p className="text-muted-foreground">
                        BFC s'efforce d'assurer la disponibilité de l'application 24h/24 et 7j/7. 
                        Toutefois, l'accès peut être suspendu temporairement pour des raisons de 
                        maintenance, de mise à jour ou en cas de force majeure. BFC ne pourra être 
                        tenu responsable des interruptions de service.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 7 - Responsabilité</h3>
                      <p className="text-muted-foreground">
                        BFC met en œuvre tous les moyens nécessaires pour assurer le bon fonctionnement 
                        de l'application. Cependant, BFC ne saurait être tenu responsable des dommages 
                        directs ou indirects résultant de l'utilisation de l'application, notamment 
                        en cas de perte de données ou d'interruption de service.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 8 - Modification des CGU</h3>
                      <p className="text-muted-foreground">
                        BFC se réserve le droit de modifier les présentes CGU à tout moment. Les 
                        utilisateurs seront informés des modifications par notification dans l'application. 
                        L'utilisation continue de l'application après modification vaut acceptation 
                        des nouvelles CGU.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 9 - Droit applicable</h3>
                      <p className="text-muted-foreground">
                        Les présentes CGU sont régies par le droit français. En cas de litige, les 
                        tribunaux français seront seuls compétents.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 10 - Contact</h3>
                      <p className="text-muted-foreground">
                        Pour toute question concernant les présentes CGU, vous pouvez nous contacter :<br />
                        Email : support@bfc-app.fr<br />
                        Téléphone : [Numéro de téléphone]
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Dernière mise à jour : Janvier 2026</p>
        </div>
      </div>
    </div>
  );
}
