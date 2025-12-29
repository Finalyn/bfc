-- Script d'import des données de développement vers production
-- Exécutez ce script dans la base de données de production

-- ===== FOURNISSEURS =====
INSERT INTO fournisseurs (id, nom, nom_court) VALUES
(1, 'B DIS BOISSELLERIE DISTRIBUTION', 'BDIS'),
(2, 'SIROCO', 'SIROCO'),
(3, 'VDH', 'VDH'),
(4, 'COTTREAU', 'COTTREAU'),
(5, 'NAYATS', 'NAYAT'),
(6, 'MAEVA', 'MAEVA'),
(7, 'VENT D''OUEST', 'VENT D''OUEST')
ON CONFLICT (id) DO NOTHING;

-- ===== COMMERCIAUX =====
INSERT INTO commerciaux (id, nom, prenom, role, actif, mot_de_passe) VALUES
(2, 'Prénom Nom', '', 'commercial', true, 'bfc26'),
(3, 'Damien CHABAUD', '', 'commercial', true, 'bfc26'),
(4, 'Corinne METIER', '', 'commercial', true, 'bfc26'),
(5, 'Romaric BERGAMO', '', 'commercial', true, 'bfc26'),
(6, 'Bertrand MOLINIER', '', 'commercial', true, 'bfc26'),
(7, 'Georges MOREIRA', '', 'commercial', true, 'bfc26'),
(8, 'Philipe PINEAU', '', 'commercial', true, 'bfc26'),
(9, 'Jérémy GIRARD', '', 'commercial', true, 'bfc26'),
(10, 'Laurent STECKMEYER', '', 'commercial', true, 'bfc26'),
(11, 'Sabine REMUET', '', 'commercial', true, 'bfc26'),
(12, 'François MESNIVAL', '', 'commercial', true, 'bfc26'),
(13, 'Isabelle CARDON', '', 'commercial', true, 'bfc26'),
(14, 'Beatrix CATALOGNE', '', 'commercial', true, 'bfc26'),
(15, 'Philippe ROUALDES', '', 'commercial', true, 'bfc26'),
(16, 'Marcel BELMANT', '', 'commercial', true, 'bfc26'),
(17, 'Pierre MALAGNOUX', '', 'commercial', true, 'bfc26'),
(18, 'Thierry DAVIAUD', '', 'commercial', true, 'bfc26'),
(19, 'Fraioli', 'Ludovic', 'admin', true, 'slf26'),
(21, 'test', '', 'commercial', true, 'bfc26')
ON CONFLICT (id) DO NOTHING;

-- ===== THEMES =====
INSERT INTO themes (id, theme, fournisseur) VALUES
(1, 'PATISSERIE', 'BDIS'),
(2, 'RGT / ENTRETIEN', 'BDIS'),
(3, 'UTILE -HI-TECH', 'BDIS'),
(4, 'BRICOLAGE', 'BDIS'),
(5, 'JARDIN', 'BDIS'),
(6, 'CHO7', 'BDIS'),
(7, 'COLORIAGE', 'BDIS'),
(8, 'Pâques', 'BDIS'),
(9, 'CORPS', 'BDIS'),
(10, 'SUPPORTER', 'BDIS'),
(11, 'Barbecue', 'BDIS'),
(12, 'JOUET ETE', 'BDIS'),
(13, 'CITRONNELLE', 'BDIS'),
(14, 'SENTEUR', 'BDIS'),
(15, 'RENTREE DES CLASSES', 'BDIS'),
(16, 'HIVER', 'BDIS'),
(17, 'HALLOWEEN', 'BDIS'),
(18, 'NOEL', 'BDIS'),
(19, 'DECO TABLE', 'BDIS'),
(20, 'VAISSELLE', 'BDIS'),
(21, 'TOP VENTE', 'BDIS'),
(22, 'SPORT', 'BDIS'),
(23, 'MAILLOT DE BAIN', 'BDIS'),
(24, 'ACC ANIMAUX', 'BDIS'),
(25, 'FLEURS', 'MAEVA'),
(26, 'LIVRES', 'COTTREAU'),
(27, 'MENAGE', 'SIROCO'),
(28, 'C''EST VOUS LE CHEF', 'SIROCO'),
(29, 'BRICO / JARDIN', 'SIROCO'),
(30, 'SHOP IN', 'SIROCO'),
(31, 'BBQ', 'SIROCO'),
(32, 'PLAGE', 'SIROCO'),
(33, 'INSECTES', 'SIROCO'),
(34, 'C''EST PRATIQUE', 'SIROCO'),
(35, 'HALLOWEEN', 'SIROCO'),
(36, 'DEGUISEMENT', 'SIROCO'),
(37, 'ULTRA PROPRE', 'SIROCO'),
(38, 'ELECTRIQUE', 'SIROCO'),
(39, 'BONNET NOEL', 'SIROCO'),
(40, 'CHO7', 'VDH'),
(41, 'DECO', 'VDH'),
(42, 'PLAGE', 'VDH'),
(43, 'BLANC', 'VDH'),
(44, 'COCOON', 'VDH'),
(45, 'HOME CONFORT', 'VDH'),
(46, 'CUSINE/BLANC', 'VDH'),
(47, 'SALLE DE BAIN', 'VDH'),
(48, 'POLAIRE/CHO7', 'VDH'),
(49, 'VENTE FERME', 'VENT D''OUEST'),
(50, 'DEPOT / VENTE', 'VENT D''OUEST'),
(51, 'TABOURET', 'NAYAT'),
(52, 'VETEMENTS', 'NAYAT'),
(53, 'CARILLON', 'NAYAT'),
(54, 'AUTRES', 'NAYAT')
ON CONFLICT (id) DO NOTHING;

-- ===== CLIENTS =====
INSERT INTO clients (id, code, nom, adresse1, adresse2, code_postal, ville, pays, interloc, tel, portable, fax, mail, is_from_excel, created_at, updated_at) VALUES
(3, '00Test', 'Test', 'Rue du test 24', '', '0000', 'Testville', '', 'Testeur', '+33 0000000', '+33 000000', '', 'jack@finalyn.com', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Réinitialiser les séquences pour éviter les conflits d'ID
SELECT setval('fournisseurs_id_seq', (SELECT MAX(id) FROM fournisseurs));
SELECT setval('commerciaux_id_seq', (SELECT MAX(id) FROM commerciaux));
SELECT setval('themes_id_seq', (SELECT MAX(id) FROM themes));
SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients));
