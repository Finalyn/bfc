import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Scale, Shield, Lock, Database, Globe, Mail, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LegalPage() {
  const [, setLocation] = useLocation();
  const isAuthenticated = localStorage.getItem("authenticated") === "true";

  const handleBack = () => {
    if (isAuthenticated) {
      setLocation("/hub");
    } else {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Informations légales</h1>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            En utilisant cette application, vous acceptez les présentes conditions générales d'utilisation 
            et la politique de confidentialité. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="mentions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="mentions" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="tab-mentions">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Mentions</span> légales
            </TabsTrigger>
            <TabsTrigger value="cgu" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="tab-cgu">
              <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
              CGU
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-1 text-xs sm:text-sm" data-testid="tab-privacy">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              Confidentialité
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
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Éditeur et propriétaire de l'application
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Cette application est éditée, développée et maintenue par <strong>Finalyn</strong>.<br /><br />
                        <strong>Finalyn</strong><br />
                        Site web : <a href="https://finalyn.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.finalyn.com</a><br />
                        Contact : <a href="mailto:contact@finalyn.com" className="text-primary hover:underline">contact@finalyn.com</a>
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Client et bénéficiaire</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Cette application est mise à disposition des équipes commerciales de <strong>BFC</strong> (Bazar France Commerce) 
                        dans le cadre d'un contrat de prestation de services entre Finalyn et BFC.<br /><br />
                        L'application "BFC APP" est un outil interne destiné exclusivement aux collaborateurs 
                        autorisés de BFC pour la gestion de leurs activités commerciales.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Directeur de la publication</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Le directeur de la publication est le représentant légal de Finalyn.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Hébergement</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'application est hébergée par :<br /><br />
                        <strong>Replit, Inc.</strong><br />
                        355 Bryant Street, Suite 200<br />
                        San Francisco, CA 94107, États-Unis<br />
                        Site web : <a href="https://replit.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.replit.com</a><br /><br />
                        Les données sont hébergées sur des serveurs sécurisés avec des mesures de protection 
                        conformes aux standards de l'industrie.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Propriété intellectuelle</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'ensemble des éléments constituant cette application (architecture, code source, 
                        design, interfaces, fonctionnalités, bases de données, textes, images, logos, 
                        graphismes, icônes et tout autre contenu) sont la propriété exclusive de Finalyn 
                        ou font l'objet d'une licence d'utilisation.<br /><br />
                        Ces éléments sont protégés par les dispositions relatives à la propriété intellectuelle, 
                        au droit d'auteur et aux droits voisins applicables.<br /><br />
                        Toute reproduction, représentation, modification, publication, adaptation, 
                        distribution ou exploitation de tout ou partie des éléments de l'application, 
                        par quelque moyen que ce soit, sans l'autorisation écrite préalable de Finalyn, 
                        est strictement interdite et constitue une contrefaçon.<br /><br />
                        Le nom "BFC APP" et les éléments graphiques associés sont utilisés dans le cadre 
                        du contrat entre Finalyn et BFC.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Crédits techniques</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Développement : Finalyn<br />
                        Technologies utilisées : React, TypeScript, Node.js, PostgreSQL<br />
                        Interface utilisateur : Design responsive optimisé pour mobile
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Contact
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Pour toute question concernant cette application :<br /><br />
                        <strong>Support technique :</strong> <a href="mailto:support@finalyn.com" className="text-primary hover:underline">support@finalyn.com</a><br />
                        <strong>Questions juridiques :</strong> <a href="mailto:legal@finalyn.com" className="text-primary hover:underline">legal@finalyn.com</a><br />
                        <strong>Site web :</strong> <a href="https://finalyn.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.finalyn.com</a>
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
                      <h3 className="font-semibold text-lg mb-2">Préambule</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent l'accès 
                        et l'utilisation de l'application "BFC APP" (ci-après "l'Application"), éditée par 
                        Finalyn et mise à disposition des équipes commerciales de BFC.<br /><br />
                        <strong>L'accès à l'Application et son utilisation impliquent l'acceptation sans 
                        réserve des présentes CGU.</strong> Si vous n'acceptez pas ces conditions, vous ne 
                        devez pas utiliser l'Application.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 1 - Définitions</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>"Application"</strong> : désigne l'application web progressive "BFC APP" 
                        accessible via navigateur web ou en tant qu'application installée.<br /><br />
                        <strong>"Éditeur"</strong> : désigne Finalyn, société propriétaire et éditrice de l'Application.<br /><br />
                        <strong>"Client"</strong> : désigne BFC (Bazar France Commerce), bénéficiaire de l'Application.<br /><br />
                        <strong>"Utilisateur"</strong> : désigne toute personne physique autorisée par BFC 
                        à accéder et utiliser l'Application dans le cadre de ses fonctions professionnelles.<br /><br />
                        <strong>"Compte"</strong> : désigne l'espace personnel de l'Utilisateur, accessible 
                        via des identifiants de connexion.<br /><br />
                        <strong>"Données"</strong> : désigne l'ensemble des informations saisies, générées 
                        ou stockées via l'Application.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 2 - Objet de l'Application</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'Application a pour objet de fournir aux commerciaux de BFC un outil de gestion 
                        des commandes commerciales. Elle permet notamment de :<br /><br />
                        • Créer, modifier et gérer des bons de commande<br />
                        • Sélectionner des fournisseurs, produits et thèmes<br />
                        • Capturer des signatures électroniques<br />
                        • Générer des documents PDF et Excel<br />
                        • Envoyer des confirmations par email<br />
                        • Consulter un tableau de bord personnel<br />
                        • Suivre les livraisons via un calendrier intégré<br />
                        • Recevoir des notifications de rappel<br />
                        • Accéder à des statistiques et analyses
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 3 - Accès à l'Application</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>3.1 Conditions d'accès</strong><br />
                        L'accès à l'Application est strictement réservé aux personnes physiques dûment 
                        autorisées par BFC. L'Utilisateur doit disposer d'identifiants de connexion 
                        valides fournis par l'administrateur de l'Application.<br /><br />
                        <strong>3.2 Identifiants de connexion</strong><br />
                        L'Utilisateur est seul responsable de la confidentialité de ses identifiants. 
                        Il s'engage à ne pas les communiquer à des tiers et à informer immédiatement 
                        l'administrateur en cas de perte, vol ou utilisation non autorisée de son compte.<br /><br />
                        <strong>3.3 Responsabilité de l'Utilisateur</strong><br />
                        Toute action effectuée depuis le compte d'un Utilisateur est réputée avoir été 
                        réalisée par celui-ci. L'Utilisateur assume l'entière responsabilité de l'utilisation 
                        de son compte.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 4 - Obligations de l'Utilisateur</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'Utilisateur s'engage à :<br /><br />
                        • Utiliser l'Application conformément à sa destination et aux présentes CGU<br />
                        • Fournir des informations exactes, complètes et à jour<br />
                        • Ne pas saisir de données fausses, trompeuses ou illicites<br />
                        • Ne pas tenter de contourner les mesures de sécurité<br />
                        • Ne pas procéder à des tentatives d'accès non autorisé<br />
                        • Ne pas utiliser de robots, scripts ou outils automatisés<br />
                        • Ne pas copier, reproduire ou extraire le contenu de l'Application<br />
                        • Ne pas décompiler, désassembler ou procéder à de l'ingénierie inverse<br />
                        • Signaler immédiatement toute faille de sécurité détectée<br />
                        • Respecter les droits de propriété intellectuelle de l'Éditeur
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 5 - Propriété des Données</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>5.1 Données saisies</strong><br />
                        Les données commerciales saisies dans l'Application (informations clients, commandes, 
                        etc.) restent la propriété exclusive de BFC.<br /><br />
                        <strong>5.2 Licence d'utilisation</strong><br />
                        L'Utilisateur autorise Finalyn à stocker, traiter et sauvegarder les données 
                        dans le cadre du fonctionnement de l'Application et de l'exécution du contrat 
                        avec BFC.<br /><br />
                        <strong>5.3 Conservation</strong><br />
                        Les données sont conservées pendant la durée du contrat entre Finalyn et BFC, 
                        et pendant la durée légale de conservation applicable.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 6 - Fonctionnement et Disponibilité</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>6.1 Disponibilité</strong><br />
                        L'Éditeur s'efforce d'assurer la disponibilité de l'Application de manière continue. 
                        Toutefois, l'accès peut être temporairement suspendu pour des raisons de maintenance, 
                        mise à jour, amélioration ou en cas de force majeure.<br /><br />
                        <strong>6.2 Évolutions</strong><br />
                        L'Éditeur se réserve le droit de modifier, améliorer ou supprimer des fonctionnalités 
                        de l'Application à tout moment, sans préavis et sans engagement de sa responsabilité.<br /><br />
                        <strong>6.3 Support technique</strong><br />
                        Le support technique est assuré par Finalyn selon les modalités définies dans le 
                        contrat avec BFC.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 7 - Limitation de Responsabilité</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>7.1 Exclusions</strong><br />
                        L'Éditeur ne pourra être tenu responsable :<br />
                        • Des interruptions de service, quelle qu'en soit la cause<br />
                        • De la perte, altération ou destruction de données<br />
                        • Des dommages résultant d'une utilisation non conforme<br />
                        • Des dommages indirects, accessoires ou consécutifs<br />
                        • Des problèmes de connectivité internet de l'Utilisateur<br />
                        • Des actions de tiers malveillants<br /><br />
                        <strong>7.2 Force majeure</strong><br />
                        L'Éditeur ne pourra être tenu responsable en cas de force majeure, incluant 
                        notamment : catastrophes naturelles, pandémies, guerres, grèves, pannes d'électricité, 
                        dysfonctionnements des réseaux de télécommunication.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 8 - Sécurité</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>8.1 Mesures de sécurité</strong><br />
                        L'Éditeur met en œuvre des mesures techniques et organisationnelles appropriées 
                        pour protéger l'Application et les données contre les accès non autorisés, 
                        la perte, la destruction ou l'altération.<br /><br />
                        <strong>8.2 Signalement</strong><br />
                        L'Utilisateur s'engage à signaler immédiatement toute vulnérabilité, faille 
                        de sécurité ou utilisation suspecte à l'adresse : security@finalyn.com
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 9 - Suspension et Résiliation</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>9.1 Suspension</strong><br />
                        L'Éditeur se réserve le droit de suspendre l'accès d'un Utilisateur en cas de :<br />
                        • Violation des présentes CGU<br />
                        • Utilisation frauduleuse ou abusive<br />
                        • Comportement portant atteinte à la sécurité<br />
                        • Demande de BFC<br /><br />
                        <strong>9.2 Résiliation</strong><br />
                        L'accès à l'Application prend fin automatiquement à la cessation du contrat 
                        de travail de l'Utilisateur avec BFC ou à la fin du contrat entre Finalyn et BFC.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 10 - Modifications des CGU</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. 
                        Les modifications entrent en vigueur dès leur publication dans l'Application. 
                        L'utilisation continue de l'Application après modification des CGU vaut 
                        acceptation des nouvelles conditions.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 11 - Dispositions Générales</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>11.1 Intégralité</strong><br />
                        Les présentes CGU constituent l'intégralité de l'accord entre l'Utilisateur 
                        et l'Éditeur concernant l'utilisation de l'Application.<br /><br />
                        <strong>11.2 Nullité partielle</strong><br />
                        Si une disposition des présentes CGU était déclarée nulle ou inapplicable, 
                        les autres dispositions resteraient en vigueur.<br /><br />
                        <strong>11.3 Non-renonciation</strong><br />
                        Le fait pour l'Éditeur de ne pas exercer un droit prévu aux présentes CGU 
                        ne constitue pas une renonciation à ce droit.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Article 12 - Contact</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Pour toute question relative aux présentes CGU :<br /><br />
                        <strong>Finalyn</strong><br />
                        Email : <a href="mailto:legal@finalyn.com" className="text-primary hover:underline">legal@finalyn.com</a><br />
                        Site web : <a href="https://finalyn.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.finalyn.com</a>
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Politique de Confidentialité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-6 pr-4">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">Introduction</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        La présente Politique de Confidentialité décrit la manière dont Finalyn collecte, 
                        utilise, stocke et protège les données personnelles des Utilisateurs de l'Application 
                        BFC APP. La protection de vos données personnelles est une priorité pour nous.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Données collectées
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        <strong>Données d'identification</strong><br />
                        • Nom et prénom de l'Utilisateur<br />
                        • Identifiant de connexion<br />
                        • Rôle dans l'organisation (commercial, administrateur)<br /><br />
                        <strong>Données d'utilisation</strong><br />
                        • Date et heure de connexion<br />
                        • Actions effectuées dans l'Application<br />
                        • Préférences de notification<br /><br />
                        <strong>Données commerciales</strong><br />
                        • Informations clients (noms, adresses, contacts)<br />
                        • Détails des commandes<br />
                        • Signatures électroniques<br />
                        • Documents générés (PDF, Excel)
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Finalités du traitement</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Les données sont collectées et traitées pour :<br /><br />
                        • Permettre l'accès et l'utilisation de l'Application<br />
                        • Gérer les comptes utilisateurs<br />
                        • Traiter et enregistrer les commandes commerciales<br />
                        • Générer et envoyer des documents<br />
                        • Fournir des statistiques et analyses<br />
                        • Envoyer des notifications de rappel<br />
                        • Assurer la maintenance et l'amélioration de l'Application<br />
                        • Garantir la sécurité de l'Application<br />
                        • Respecter les obligations légales
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Base légale du traitement</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Le traitement des données personnelles repose sur :<br /><br />
                        • <strong>L'exécution du contrat</strong> entre Finalyn et BFC pour la fourniture de l'Application<br />
                        • <strong>L'intérêt légitime</strong> de l'Éditeur pour assurer le bon fonctionnement et la sécurité<br />
                        • <strong>Le consentement</strong> de l'Utilisateur pour les notifications push<br />
                        • <strong>Les obligations légales</strong> applicables
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Destinataires des données</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Les données peuvent être accessibles par :<br /><br />
                        • Les équipes techniques de Finalyn (pour le support et la maintenance)<br />
                        • Les administrateurs désignés par BFC<br />
                        • Les sous-traitants techniques (hébergeur, services email)<br /><br />
                        Aucune donnée n'est vendue ou cédée à des tiers à des fins commerciales.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Sécurité des données
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données :<br /><br />
                        • Chiffrement des données en transit (HTTPS/TLS)<br />
                        • Authentification sécurisée des utilisateurs<br />
                        • Contrôle d'accès basé sur les rôles<br />
                        • Sauvegardes régulières des données<br />
                        • Surveillance et détection des intrusions<br />
                        • Mise à jour régulière des systèmes de sécurité
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Durée de conservation</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Les données sont conservées :<br /><br />
                        • <strong>Données de compte</strong> : pendant la durée du contrat de travail de l'Utilisateur avec BFC<br />
                        • <strong>Données de commandes</strong> : pendant la durée légale de conservation des documents commerciaux<br />
                        • <strong>Données de connexion</strong> : 12 mois maximum<br /><br />
                        À l'expiration de ces délais, les données sont supprimées ou anonymisées.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Droits des Utilisateurs</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Conformément à la réglementation applicable, vous disposez des droits suivants :<br /><br />
                        • <strong>Droit d'accès</strong> : obtenir la confirmation du traitement de vos données et en recevoir une copie<br />
                        • <strong>Droit de rectification</strong> : demander la correction de données inexactes<br />
                        • <strong>Droit à l'effacement</strong> : demander la suppression de vos données dans les limites légales<br />
                        • <strong>Droit à la limitation</strong> : demander la limitation du traitement<br />
                        • <strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré<br />
                        • <strong>Droit d'opposition</strong> : vous opposer au traitement pour motifs légitimes<br /><br />
                        Pour exercer ces droits, contactez : <a href="mailto:privacy@finalyn.com" className="text-primary hover:underline">privacy@finalyn.com</a>
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Cookies et technologies similaires</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'Application utilise des cookies et le stockage local du navigateur pour :<br /><br />
                        • <strong>Cookies techniques</strong> : nécessaires au fonctionnement (authentification, session)<br />
                        • <strong>Stockage local</strong> : préférences utilisateur, données hors ligne<br /><br />
                        Ces technologies sont essentielles au fonctionnement de l'Application et ne peuvent 
                        pas être désactivées. Aucun cookie publicitaire ou de suivi n'est utilisé.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Transferts de données</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        L'Application étant hébergée aux États-Unis (Replit, Inc.), des transferts de données 
                        hors de l'Union Européenne peuvent avoir lieu. Ces transferts sont encadrés par des 
                        garanties appropriées (clauses contractuelles types, certifications).
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">Modifications de la politique</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Cette Politique de Confidentialité peut être modifiée à tout moment. Les modifications 
                        seront publiées dans l'Application. L'utilisation continue de l'Application après 
                        modification vaut acceptation de la nouvelle politique.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Contact
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Pour toute question relative à la protection de vos données :<br /><br />
                        <strong>Délégué à la Protection des Données</strong><br />
                        Email : <a href="mailto:privacy@finalyn.com" className="text-primary hover:underline">privacy@finalyn.com</a><br /><br />
                        <strong>Finalyn</strong><br />
                        Site web : <a href="https://finalyn.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.finalyn.com</a>
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            <strong>En utilisant cette application, vous reconnaissez avoir lu et accepté 
            les présentes mentions légales, conditions générales d'utilisation et 
            politique de confidentialité.</strong>
          </p>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Dernière mise à jour : Janvier 2026</p>
          <p className="mt-1">
            Application développée par <a href="https://finalyn.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Finalyn</a>
          </p>
        </div>
      </div>
    </div>
  );
}
