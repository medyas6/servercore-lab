/* ============================================================
   MEDC ServerCore Lab Training — Quiz QCM (M202)
   Question bank: cours "Administrer un environnement Windows"
   + questions théoriques de l'EFM officiel OFPPT (DR Rabat-Salé-Kénitra 2022/2023).
   Les questions marquées efm:true viennent du corrigé officiel de l'EFM.
   ============================================================ */

const QUIZ_MODULES = [
  { id: "install",   name: "Installation Windows Server 2019" },
  { id: "ad",        name: "Active Directory" },
  { id: "ad-objets", name: "Objets Active Directory" },
  { id: "dhcp",      name: "Serveur DHCP" },
  { id: "dns",       name: "Serveur DNS" },
  { id: "gpo",       name: "Stratégies de groupe (GPO)" },
  { id: "fichiers",  name: "Serveur de fichiers & DFS" },
  { id: "securite",  name: "Sécurité" },
  { id: "hyperv",    name: "Hyper-V & virtualisation" },
  { id: "core",      name: "Server Core & PowerShell" },
];

/* q: question, c: 4 choix, a: index de la bonne réponse, why: explication */
const QUIZ_BANK = [
/* ---------- 1. Installation Windows Server 2019 ---------- */
{ m:"install", efm:true, q:"Quel est l'avantage de l'édition Datacenter de Windows Server 2019 ?",
  c:["Nombre illimité de machines virtuelles sur l'hôte","Elle est gratuite","Elle ne nécessite aucune licence","Elle fonctionne sans processeur 64 bits"], a:0,
  why:"La version Datacenter permet un nombre illimité de machines virtuelles sur l'hôte (idéal pour le cloud)." },
{ m:"install", efm:true, q:"Quels sont les deux types d'installation de Windows Server 2019 ?",
  c:["Complète et minimale (Core)","Standard et Professionnelle","Graphique et Web","Client et Serveur"], a:0,
  why:"Installation complète (avec interface graphique) ou minimale/Core (invite de commandes uniquement)." },
{ m:"install", q:"Que contient une installation minimale (Server Core) ?",
  c:["Uniquement une invite de commandes","Une interface graphique réduite","Un navigateur web uniquement","Le Panneau de configuration"], a:0,
  why:"En mode Core, explorer.exe n'est pas installé : seule l'invite de commandes est présente." },
{ m:"install", q:"Peut-on basculer d'une installation complète vers une installation minimale après l'installation ?",
  c:["Non, impossible dans les deux sens","Oui, à tout moment","Oui, mais une seule fois","Oui, avec un simple redémarrage"], a:0,
  why:"Il n'est plus possible de basculer entre les deux modes après l'installation." },
{ m:"install", q:"Quelle est la mémoire RAM minimale requise pour Windows Server 2019 ?",
  c:["2 Go (8 Go recommandés pour virtualiser)","512 Mo","1 Go","16 Go"], a:0,
  why:"2 Go strict minimum ; 8 Go sont recommandés pour faire tourner des machines virtuelles." },
{ m:"install", q:"Quel est l'espace disque minimal pour une installation de base sans rôle ?",
  c:["15 Go","5 Go","60 Go","100 Go"], a:0,
  why:"Une installation de base avec aucun rôle nécessite 15 Go d'espace disque." },
{ m:"install", q:"Quelle est la configuration processeur minimale requise ?",
  c:["1,4 GHz en 64 bits","1 GHz en 32 bits","3,4 GHz en 64 bits","800 MHz en 32 bits"], a:0,
  why:"Processeur 1,4 GHz minimum avec une architecture 64 bits." },
{ m:"install", q:"Quel outil permet d'administrer à distance un serveur en mode Core ?",
  c:["RSAT (Remote Server Administration Tools)","Le Gestionnaire des tâches","Le Panneau de configuration","L'Observateur d'événements"], a:0,
  why:"Les outils RSAT installés sur un poste distant permettent d'administrer un serveur Core." },
{ m:"install", efm:true, q:"Quelle commande permet d'attribuer une adresse IP statique en ligne de commande ?",
  c:['netsh interface ipv4 set address "carte" static 10.10.10.10 255.255.255.0',"ipconfig /set 10.10.10.10","net ip add 10.10.10.10","set-ip 10.10.10.10 static"], a:0,
  why:"Question EFM : netsh interface ipv4 set address « nom-interface » static IP masque." },
{ m:"install", q:"Après l'installation, quelles sont les deux premières configurations à effectuer ?",
  c:["Le nom du serveur et sa configuration IP","Le fond d'écran et la résolution","L'antivirus et le pare-feu","L'heure et la langue uniquement"], a:0,
  why:"Une fois l'installation terminée, on configure le nom du serveur puis son adressage IP." },

/* ---------- 2. Active Directory ---------- */
{ m:"ad", efm:true, q:"Qu'est-ce qu'un serveur catalogue global ?",
  c:["Un contrôleur de domaine qui possède une copie des attributs de tous les objets AD de son domaine","Un serveur de fichiers partagé","Un serveur DNS secondaire","Un serveur d'impression réseau"], a:0,
  why:"Définition EFM : le catalogue global contient une copie des attributs de tous les objets du domaine." },
{ m:"ad", efm:true, q:"Qu'est-ce qu'une unité d'organisation (OU) ?",
  c:["Un objet de type conteneur permettant la hiérarchisation dans l'annuaire","Un type de disque dur","Un protocole réseau","Un compte d'utilisateur spécial"], a:0,
  why:"L'OU est un conteneur qui organise les objets AD en hiérarchie (ex : par service)." },
{ m:"ad", efm:true, q:"Quelle commande promeut un serveur en contrôleur de domaine d'une nouvelle forêt ?",
  c:["Install-ADDSForest -DomainName ofppt.ma -InstallDns","New-DomainController -Forest","Install-ADDSDomain -New","Add-Computer -DomainController"], a:0,
  why:"Question EFM : Install-ADDSForest crée une nouvelle forêt (-InstallDns installe le DNS)." },
{ m:"ad", q:"Quelles sont les trois étendues (scopes) de groupes dans Active Directory ?",
  c:["Global, Universel, Local de domaine","Public, Privé, Hybride","Local, Régional, National","Système, Utilisateur, Invité"], a:0,
  why:"Les trois portées de groupe : Global, Universal et Domain Local." },
{ m:"ad", q:"Dans la méthode AGDLP, à quoi correspond le « D » ?",
  c:["Domain Local : le groupe local de domaine reçoit les autorisations","Domaine","Distribution","Droits"], a:0,
  why:"AGDLP : Comptes → Global → (Universal) → Domain Local → Permissions." },
{ m:"ad", q:"Quelle console graphique permet de gérer les objets Active Directory ?",
  c:["Utilisateurs et ordinateurs Active Directory (dsa.msc)","Le Gestionnaire des tâches","L'Observateur d'événements","La Gestion des disques"], a:0,
  why:"La console DSA (dsa.msc) gère utilisateurs, groupes, OU et ordinateurs." },
{ m:"ad", q:"Qu'est-ce que le schéma Active Directory ?",
  c:["Il définit les types d'objets et d'attributs possibles dans l'annuaire","Un plan du câblage réseau","Un modèle de stratégie de groupe","Un type de sauvegarde"], a:0,
  why:"Le schéma décrit tous les objets et attributs autorisés dans AD." },
{ m:"ad", q:"Combien de contrôleurs de domaine est-il recommandé d'avoir au minimum ?",
  c:["2, pour la tolérance de panne","1 suffit toujours","5 obligatoirement","10 par site"], a:0,
  why:"Deux contrôleurs minimum : si l'un tombe en panne, l'autre prend le relais." },
{ m:"ad", q:"Qu'est-ce qu'une forêt Active Directory ?",
  c:["Un ensemble de domaines partageant le même schéma","Un groupe de serveurs de fichiers","Une sauvegarde complète du domaine","Un type de commutateur virtuel"], a:0,
  why:"La forêt est le plus grand conteneur logique AD : des domaines liés partageant le même schéma." },
{ m:"ad", q:"Comment s'appelle le premier domaine créé dans une forêt ?",
  c:["Le domaine racine","Le domaine enfant","Le domaine feuille","Le domaine secondaire"], a:0,
  why:"Le premier domaine de la forêt est appelé domaine racine (root domain)." },

/* ---------- 3. Objets Active Directory ---------- */
{ m:"ad-objets", efm:true, q:"Quelle commande crée un compte d'utilisateur dans une OU ?",
  c:['dsadd user "CN=Mamadou,OU=Informatique,DC=formation,DC=com"',"new-user Mamadou","add-user -ou Informatique","create user Mamadou"], a:0,
  why:"Question EFM : dsadd user avec le chemin LDAP complet (CN, OU, DC)." },
{ m:"ad-objets", efm:true, q:"Quelle commande crée un groupe de distribution universel nommé groupe1 ?",
  c:['New-ADGroup groupe1 -GroupCategory Distribution -GroupScope Universal -Path "ou=tri,dc=formation,dc=com"',"New-Group -type universal","dsadd group universal","Add-DistributionGroup groupe1"], a:0,
  why:"Question EFM : New-ADGroup avec -GroupCategory Distribution et -GroupScope Universal." },
{ m:"ad-objets", efm:true, q:"Quelle commande crée un compte d'ordinateur pc1 dans le domaine ?",
  c:['dsadd computer "cn=pc1,dc=formation,dc=com"',"new-computer pc1","add-pc pc1","dsadd pc pc1"], a:0,
  why:"Question EFM : dsadd computer avec le CN du poste." },
{ m:"ad-objets", efm:true, q:"Quelle commande redirige le conteneur par défaut des nouveaux utilisateurs vers une OU ?",
  c:['redirusr "ou=tri,dc=formation,dc=com"',"move-users ou=tri","dsmod container users","set-defaultou tri"], a:0,
  why:"Question EFM : redirusr change le conteneur par défaut de création des comptes." },
{ m:"ad-objets", q:"Où sont créés les comptes d'utilisateurs par défaut ?",
  c:["Dans le conteneur Users du domaine","Dans l'OU Informatique","Sur le Bureau","Dans le conteneur Computers"], a:0,
  why:"Par défaut, les nouveaux utilisateurs vont dans le conteneur Users (modifiable avec redirusr)." },
{ m:"ad-objets", q:"Quelle commande permet de joindre un serveur Core à un domaine ?",
  c:["netdom join SRVCore /domain:Formation.local /UserD:Administrateur /passwordD:*","join-domain Formation.local","net join Formation.local","add-computer -domain Formation.local"], a:0,
  why:"En mode Core : netdom join avec /domain, /UserD et /passwordD (l'étoile demande le mot de passe)." },
{ m:"ad-objets", q:"Quelle est la différence entre un groupe de sécurité et un groupe de distribution ?",
  c:["Sécurité : pour les autorisations ; Distribution : pour les listes de diffusion","Aucune différence","Distribution : pour les autorisations ; Sécurité : pour les emails","Les deux servent uniquement aux emails"], a:0,
  why:"Les groupes de sécurité attribuent des droits ; les groupes de distribution servent aux listes de diffusion." },
{ m:"ad-objets", q:"Qu'est-ce que le SID ?",
  c:["Un identifiant de sécurité unique attribué à chaque compte","Un type de câble réseau","Un service Windows","Un format de disque"], a:0,
  why:"Le SID (Security Identifier) identifie de façon unique chaque utilisateur, groupe et ordinateur." },
{ m:"ad-objets", q:"Que signifie CN dans « CN=Mamadou,OU=Informatique,DC=formation,DC=com » ?",
  c:["Common Name (nom commun de l'objet)","Computer Network","Control Node","Central Name"], a:0,
  why:"CN = Common Name (nom de l'objet) ; OU = unité d'organisation ; DC = composant de domaine." },
{ m:"ad-objets", q:"Pourquoi est-il recommandé de renommer le compte Administrateur ?",
  c:["Pour compliquer les attaques ciblant ce compte connu","Pour accélérer le serveur","Pour libérer de l'espace disque","Ce n'est jamais recommandé"], a:0,
  why:"« Administrateur » est une cible connue des attaquants ; le renommer fait partie des bonnes pratiques." },

/* ---------- 4. Serveur DHCP ---------- */
{ m:"dhcp", efm:true, q:"Quelle commande installe le rôle DHCP sur un serveur Core ?",
  c:["Install-WindowsFeature DHCP -IncludeManagementTools","Add-DHCPServer","install dhcp -core","Enable-WindowsFeature DHCP-Server"], a:0,
  why:"Question EFM : Install-WindowsFeature DHCP avec -IncludeManagementTools pour la console." },
{ m:"dhcp", efm:true, q:"Quelle commande crée une étendue DHCP nommée NTIC sur 192.168.10.0/25 ?",
  c:['Add-DhcpServerv4Scope -Name "NTIC" -StartRange 192.168.10.1 -EndRange 192.168.10.126 -SubnetMask 255.255.255.128',"New-DHCPScope 192.168.10.0","Add-Scope -name NTIC","Create-DhcpScope 192.168.10.0/25"], a:0,
  why:"Question EFM : Add-DhcpServerv4Scope avec nom, plage de début/fin et masque." },
{ m:"dhcp", efm:true, q:"Quelle commande exclut la plage 192.168.10.5 à 192.168.10.15 d'une étendue ?",
  c:["Add-DhcpServerV4ExclusionRange -ScopeId 192.168.10.0 -StartRange 192.168.10.5 -EndRange 192.168.10.15","Remove-IPRange 192.168.10.5-15","Exclude-DHCP 192.168.10.5 192.168.10.15","Block-IPRange -scope 192.168.10.0"], a:0,
  why:"Question EFM : les adresses exclues ne sont jamais distribuées par le DHCP." },
{ m:"dhcp", efm:true, q:"Quelle commande réserve l'adresse 192.168.10.20 à une adresse MAC ?",
  c:["Add-DhcpServerV4Reservation -ScopeId 192.168.10.0 -ClientId 00-0D-EA-5B-DF-FF -IPAddress 192.168.10.20","Reserve-IP 192.168.10.20","Add-StaticIP -mac 00-0D-EA-5B-DF-FF","New-Reservation 192.168.10.20"], a:0,
  why:"Question EFM : une réservation lie une IP fixe à une adresse MAC (ClientId)." },
{ m:"dhcp", efm:true, q:"Quel est l'OptionId DHCP correspondant aux serveurs DNS ?",
  c:["6","3","15","51"], a:0,
  why:"Question EFM : Option 6 = serveurs DNS ; Option 3 = routeur/passerelle ; 51 = durée du bail." },
{ m:"dhcp", q:"Quel est l'OptionId DHCP pour la passerelle par défaut (routeur) ?",
  c:["3","6","44","15"], a:0,
  why:"Option 3 = Router (passerelle par défaut) ; Option 6 = serveurs DNS." },
{ m:"dhcp", q:"Quelles sont les 4 étapes d'attribution d'une adresse DHCP ?",
  c:["Discover, Offer, Request, Acknowledge","Demande, Offre, Réponse, Accord","Detect, Open, Read, Apply","Domain, Offer, Register, Accept"], a:0,
  why:"DORA : le client découvre (Discover), le serveur offre (Offer), le client demande (Request), le serveur confirme (Ack)." },
{ m:"dhcp", q:"Quelle est la durée de bail par défaut d'un serveur DHCP Windows ?",
  c:["8 jours","1 heure","30 jours","24 heures"], a:0,
  why:"Par défaut, Windows attribue un bail de 8 jours." },
{ m:"dhcp", q:"Quels ports UDP utilise le protocole DHCP ?",
  c:["67 (serveur) et 68 (client)","53 et 54","80 et 443","137 et 138"], a:0,
  why:"Le serveur écoute sur UDP 67, le client sur UDP 68." },
{ m:"dhcp", q:"Pourquoi faut-il autoriser le serveur DHCP dans Active Directory ?",
  c:["Pour empêcher les serveurs DHCP pirates (rogue) de distribuer des adresses","Pour accélérer le réseau","Pour activer le DNS","Ce n'est pas nécessaire"], a:0,
  why:"Un serveur DHCP non autorisé ne distribue pas d'adresses dans un domaine AD (protection anti-rogue)." },
{ m:"dhcp", q:"Qu'est-ce qu'une réservation DHCP ?",
  c:["Une adresse IP toujours attribuée au même client (via son adresse MAC)","Une plage d'adresses bloquée","Une sauvegarde du serveur","Un bail de 30 jours"], a:0,
  why:"La réservation garantit qu'un poste (imprimante, serveur) reçoit toujours la même IP." },
{ m:"dhcp", q:"Que se passe-t-il à 50 % de la durée du bail DHCP ?",
  c:["Le client tente de renouveler son bail auprès du serveur","L'adresse est libérée","Le serveur redémarre","Rien ne se passe"], a:0,
  why:"À 50 % du bail (T1), le client demande un renouvellement au serveur DHCP." },

/* ---------- 5. Serveur DNS ---------- */
{ m:"dns", q:"Que fait un enregistrement DNS de type A ?",
  c:["Associe un nom d'hôte à une adresse IPv4","Associe un nom à une adresse IPv6","Crée un alias","Définit le serveur de messagerie"], a:0,
  why:"A = Address : nom → IPv4 (ex : www → 192.168.1.10)." },
{ m:"dns", efm:true, q:"Quelle commande crée un enregistrement AAAA pour pc1 (2001::1) ?",
  c:["Add-DnsServerResourceRecordAAAA -ZoneName zone1 -Name pc1 -IPv6Address 2001::1","New-DNSRecord AAAA pc1","Add-AAAARecord pc1 2001::1","Create-DnsAAAA pc1"], a:0,
  why:"Question EFM : AAAA = nom d'hôte → adresse IPv6." },
{ m:"dns", q:"Que fait un enregistrement CNAME ?",
  c:["Crée un alias pointant vers un autre nom d'hôte","Définit l'adresse IP du serveur","Configure la messagerie","Délègue une sous-zone"], a:0,
  why:"CNAME = Canonical Name : un alias (ex : intranet → srv-web.domaine.local)." },
{ m:"dns", q:"Que fait un enregistrement MX ?",
  c:["Indique le serveur de messagerie du domaine","Indique le serveur DNS principal","Fait la résolution inverse","Stocke une adresse IPv6"], a:0,
  why:"MX = Mail Exchanger : désigne le serveur mail du domaine." },
{ m:"dns", q:"Que fait un enregistrement PTR ?",
  c:["Résolution inverse : adresse IP → nom d'hôte","Alias vers un autre domaine","Serveur de temps","Enregistrement de sécurité"], a:0,
  why:"PTR = Pointer : utilisé dans les zones de recherche inversée." },
{ m:"dns", efm:true, q:"Dans un enregistrement SOA, que signifient 1800, 600, 86400 et 3600 ?",
  c:["Refresh, Retry, Expire et TTL du cache","Port, priorité, poids et TTL","Version, date, heure et minute","ID, masque, passerelle et DNS"], a:0,
  why:"Question EFM : 1800 = actualisation, 600 = nouvelle tentative, 86400 = expiration, 3600 = durée en cache." },
{ m:"dns", q:"Que représente le numéro de série (serial) dans l'enregistrement SOA ?",
  c:["Le numéro de version de la zone, incrémenté à chaque modification","Le numéro de port du DNS","L'adresse IP du serveur","Le nombre d'enregistrements"], a:0,
  why:"Le serial permet aux serveurs secondaires de détecter les changements de zone." },
{ m:"dns", efm:true, q:"Quelle commande crée une zone DNS secondaire ?",
  c:["Add-DnsServerSecondaryZone -Name zone1 -MasterServers 192.168.1.10 -ZoneFile zone1.dns","New-SecondaryZone zone1","Add-DNSZone -secondary","Create-ZoneSlave zone1"], a:0,
  why:"Question EFM : la zone secondaire se synchronise depuis le serveur maître." },
{ m:"dns", q:"Quelle est la différence entre une zone principale et une zone secondaire ?",
  c:["Principale : lecture/écriture ; secondaire : lecture seule (copie via transfert de zone)","Aucune différence","La secondaire est plus rapide","La principale est pour IPv6 uniquement"], a:0,
  why:"La zone principale est modifiable ; la secondaire en est une copie en lecture seule." },
{ m:"dns", q:"Sur quel port fonctionne le service DNS ?",
  c:["53 en UDP et TCP","80 en TCP","67 en UDP","443 en TCP"], a:0,
  why:"Le DNS utilise le port 53 (UDP pour les requêtes, TCP pour les transferts de zone)." },
{ m:"dns", q:"Qu'est-ce qu'une zone de recherche inversée ?",
  c:["Une zone qui résout les adresses IP en noms (enregistrements PTR)","Une zone cachée","Une zone de sauvegarde","Une zone pour IPv6 uniquement"], a:0,
  why:"La recherche inversée (reverse lookup) convertit une IP en nom d'hôte." },
{ m:"dns", q:"Quelle commande installe le rôle Serveur DNS ?",
  c:["Install-WindowsFeature DNS -IncludeManagementTools","Add-DNSServer","install dns -role","Enable-DNSFeature"], a:0,
  why:"Le rôle DNS s'installe avec Install-WindowsFeature, comme le DHCP." },

/* ---------- 6. Stratégies de groupe (GPO) ---------- */
{ m:"gpo", q:"Dans quel ordre s'appliquent les stratégies de groupe ?",
  c:["Site, puis Domaine, puis OU (la dernière appliquée gagne)","OU, puis Domaine, puis Site","Domaine, puis Site, puis OU","De façon aléatoire"], a:0,
  why:"Ordre LSDOU : Local, Site, Domaine, OU — la GPO la plus proche de l'objet gagne en cas de conflit." },
{ m:"gpo", efm:true, q:"Si l'héritage est bloqué sur une OU, quelle GPO s'applique en cas de conflit ?",
  c:["Celle liée directement à l'OU","Celle du domaine","Celle du site","Aucune"], a:0,
  why:"Question EFM : avec l'héritage bloqué, seule la GPO liée à l'OU s'applique." },
{ m:"gpo", efm:true, q:"Que se passe-t-il si le lien d'une GPO est marqué « Appliqué » (Enforced) ?",
  c:["Elle devient prioritaire, même sur un héritage bloqué","Elle est désactivée","Elle est supprimée","Rien ne change"], a:0,
  why:"Question EFM : « Appliqué/Enforced » gagne contre l'héritage bloqué." },
{ m:"gpo", efm:true, q:"Comment désactiver le lien d'une GPO sur une OU ?",
  c:["Clic droit sur le lien → décocher « Lien activé »","Supprimer l'OU","Redémarrer le serveur","Désinstaller le rôle AD"], a:0,
  why:"Question EFM : un lien désactivé ne s'applique plus, sans supprimer la GPO." },
{ m:"gpo", q:"Quelle commande force l'actualisation des stratégies sur un poste ?",
  c:["gpupdate /force","refresh-gpo","gpo-update now","net gpo refresh"], a:0,
  why:"gpupdate /force réapplique immédiatement les stratégies ordinateur + utilisateur." },
{ m:"gpo", q:"Quelle commande affiche les stratégies résultantes appliquées à un poste ?",
  c:["gpresult /r","show-gpo","gpo-result","net gpo list"], a:0,
  why:"gpresult /r affiche l'ensemble des stratégies appliquées (RSoP)." },
{ m:"gpo", q:"Quelle console permet de gérer les stratégies de groupe ?",
  c:["Gestion de stratégie de groupe (gpmc.msc)","Le Gestionnaire des tâches","Regedit","Services.msc"], a:0,
  why:"La GPMC (Group Policy Management Console) centralise la gestion des GPO." },
{ m:"gpo", q:"À quoi sert le filtrage de sécurité d'une GPO ?",
  c:["À appliquer la GPO uniquement à certains utilisateurs/groupes/ordinateurs","À chiffrer la GPO","À accélérer l'ouverture de session","À sauvegarder la GPO"], a:0,
  why:"Le filtrage de sécurité restreint l'application d'une GPO aux objets autorisés." },
{ m:"gpo", q:"Quand s'applique la partie « Configuration ordinateur » d'une GPO ?",
  c:["Au démarrage de l'ordinateur","À l'arrêt uniquement","Quand on double-clique dessus","Jamais automatiquement"], a:0,
  why:"Configuration ordinateur → au démarrage ; configuration utilisateur → à l'ouverture de session." },
{ m:"gpo", q:"Où se trouvent les paramètres de stratégies liés au Registre ?",
  c:["Dans les modèles d'administration (Administrative Templates)","Dans le fichier hosts","Dans le cache DNS","Dans la corbeille"], a:0,
  why:"Les modèles d'administration exposent des centaines de paramètres basés sur le Registre." },

/* ---------- 7. Serveur de fichiers & DFS ---------- */
{ m:"fichiers", q:"Un dossier a des autorisations de partage ET des autorisations NTFS : laquelle s'applique via le réseau ?",
  c:["La plus restrictive des deux","Toujours celle du partage","Toujours NTFS","La plus permissive"], a:0,
  why:"En accès réseau, partage + NTFS se combinent : c'est l'autorisation la plus restrictive qui gagne." },
{ m:"fichiers", q:"Que signifie DFS-N ?",
  c:["Espace de noms DFS : un nom unique pour accéder à des partages répartis","Un type de disque","Un protocole de messagerie","Un service d'impression"], a:0,
  why:"DFS Namespace regroupe plusieurs partages sous un chemin logique unique." },
{ m:"fichiers", q:"Que fait DFS-R ?",
  c:["Il réplique le contenu des dossiers entre serveurs","Il compresse les fichiers","Il chiffre le réseau","Il sauvegarde sur bande"], a:0,
  why:"DFS Replication synchronise les dossiers entre plusieurs serveurs." },
{ m:"fichiers", q:"À quoi servent les quotas de disque ?",
  c:["À limiter l'espace disque utilisable par chaque utilisateur","À accélérer le disque","À chiffrer les fichiers","À partager la connexion Internet"], a:0,
  why:"Les quotas (via FSRM) empêchent un utilisateur de saturer le volume." },
{ m:"fichiers", q:"Qu'est-ce que EFS ?",
  c:["Le chiffrement des fichiers au niveau NTFS","Un système de sauvegarde","Un antivirus","Un type de partage"], a:0,
  why:"EFS (Encrypting File System) chiffre fichiers et dossiers avec un certificat utilisateur." },
{ m:"fichiers", q:"Quelle est la différence entre EFS et BitLocker ?",
  c:["EFS chiffre des fichiers ; BitLocker chiffre tout le volume","Aucune différence","BitLocker chiffre des fichiers ; EFS le volume","Les deux sont des antivirus"], a:0,
  why:"EFS = granularité fichier ; BitLocker = chiffrement intégral du disque." },
{ m:"fichiers", q:"Quelle autorisation NTFS permet de tout faire sur un dossier ?",
  c:["Contrôle total","Lecture","Modification","Lecture et exécution"], a:0,
  why:"Contrôle total inclut lecture, écriture, modification des autorisations et prise de propriété." },
{ m:"fichiers", q:"En NTFS, que se passe-t-il entre une autorisation « Refuser » et « Autoriser » ?",
  c:["Refuser est toujours prioritaire sur Autoriser","Autoriser gagne toujours","Elles s'annulent","Refuser n'existe pas en NTFS"], a:0,
  why:"En NTFS, un refus explicite l'emporte toujours sur une autorisation." },

/* ---------- 8. Sécurité ---------- */
{ m:"securite", q:"Que doit imposer une bonne stratégie de mot de passe ?",
  c:["Complexité, longueur minimale et historique des mots de passe","Uniquement des chiffres","Le même mot de passe pour tous","Aucune contrainte"], a:0,
  why:"Longueur, complexité (majuscules, chiffres, symboles) et historique évitent les mots de passe faibles." },
{ m:"securite", q:"À quoi sert la stratégie de verrouillage de compte ?",
  c:["À bloquer le compte après plusieurs tentatives échouées","À éteindre le serveur","À changer le mot de passe","À créer un compte invité"], a:0,
  why:"Le verrouillage ralentit les attaques par force brute sur les mots de passe." },
{ m:"securite", q:"Quels sont les trois profils du pare-feu Windows ?",
  c:["Domaine, Privé, Public","Entrant, Sortant, Mixte","TCP, UDP, ICMP","Local, Distant, Cloud"], a:0,
  why:"Le pare-feu applique des règles différentes selon le profil réseau détecté." },
{ m:"securite", q:"Pourquoi est-il conseillé de laisser le compte Invité désactivé ?",
  c:["C'est une porte d'entrée potentielle pour les attaquants","Il consomme trop de RAM","Il ralentit le démarrage","Il n'existe pas sous Windows Server"], a:0,
  why:"Le compte Invité est une cible classique : désactivé par défaut, il faut le laisser ainsi." },
{ m:"securite", q:"Qu'est-ce que le principe du moindre privilège ?",
  c:["Ne donner à chacun que les droits strictement nécessaires","Donner tous les droits à tout le monde","Ne jamais donner de droits","Donner les droits uniquement aux administrateurs"], a:0,
  why:"Limiter les droits réduit l'impact d'une erreur ou d'un compte compromis." },
{ m:"securite", q:"À quoi sert l'audit de sécurité ?",
  c:["À enregistrer les événements (ouvertures de session, accès aux fichiers...)","À réparer le système","À défragmenter le disque","À mettre à jour Windows"], a:0,
  why:"L'audit trace qui a fait quoi : essentiel pour détecter les intrusions." },
{ m:"securite", q:"Que fait l'UAC ?",
  c:["Il demande une confirmation avant les actions administratives","Il chiffre le disque","Il gère le réseau","Il sauvegarde les données"], a:0,
  why:"L'UAC (contrôle de compte d'utilisateur) évite l'exécution silencieuse de tâches admin." },
{ m:"securite", q:"Quelle commande affiche la configuration du pare-feu en ligne de commande ?",
  c:["netsh advfirewall show allprofiles","firewall /show","net firewall status","show-fw config"], a:0,
  why:"netsh advfirewall permet de consulter et configurer le pare-feu en ligne de commande." },

/* ---------- 9. Hyper-V & virtualisation ---------- */
{ m:"hyperv", efm:true, q:"Quelle est la différence entre un commutateur virtuel externe et interne ?",
  c:["Externe : utilise la carte physique (accès réseau physique) ; Interne : VMs + hôte uniquement","Aucune différence","L'interne est plus rapide que l'externe","L'externe ne fonctionne qu'entre VMs"], a:0,
  why:"Question EFM : l'externe ponte vers le réseau physique, l'interne isole avec l'hôte." },
{ m:"hyperv", efm:true, q:"Que permet un commutateur virtuel privé ?",
  c:["La communication uniquement entre les machines virtuelles","L'accès à Internet","La communication avec l'hôte","Le partage de fichiers avec le réseau local"], a:0,
  why:"Question EFM : en mode privé, même l'hôte ne peut pas contacter les VMs." },
{ m:"hyperv", q:"Quelle est la taille maximale d'un disque dur virtuel VHDX ?",
  c:["64 To","2 To","127 Go","16 To"], a:0,
  why:"VHDX : jusqu'à 64 To ; l'ancien format VHD est limité à 2 To." },
{ m:"hyperv", q:"Quelle est la différence entre un disque de taille fixe et un disque dynamique ?",
  c:["Fixe : taille réservée à la création ; Dynamique : grandit selon le contenu","Aucune différence","Le dynamique est plus rapide","Le fixe ne peut pas dépasser 2 Go"], a:0,
  why:"Le disque fixe réserve tout l'espace (performances), le dynamique grandit à l'usage." },
{ m:"hyperv", q:"Qu'est-ce qu'un checkpoint Hyper-V ?",
  c:["Une photo instantanée de la VM (fichiers avhd/avhdx), qui ne remplace pas une sauvegarde","Une sauvegarde complète","Un antivirus","Un type de commutateur"], a:0,
  why:"Le checkpoint permet de revenir en arrière, mais reste sur le même disque : ce n'est pas une sauvegarde." },
{ m:"hyperv", q:"Combien de checkpoints une machine virtuelle peut-elle posséder au maximum ?",
  c:["50","5","10","Un nombre illimité"], a:0,
  why:"Hyper-V autorise jusqu'à 50 checkpoints par machine virtuelle." },
{ m:"hyperv", q:"Depuis quelle version la mémoire dynamique existe-t-elle sous Hyper-V ?",
  c:["Windows Server 2008 R2 SP1","Windows Server 2019 uniquement","Windows Server 2003","Windows 10"], a:0,
  why:"La mémoire dynamique (allocation à la demande) est apparue avec 2008 R2 SP1." },
{ m:"hyperv", q:"Que permet la Live Migration ?",
  c:["Déplacer une VM allumée d'un hôte à un autre sans coupure","Éteindre toutes les VMs","Migrer vers le cloud uniquement","Convertir VHD en VHDX"], a:0,
  why:"La migration dynamique déplace une VM en cours d'exécution entre deux hôtes Hyper-V." },

/* ---------- 10. Server Core & PowerShell ---------- */
{ m:"core", q:"Quel utilitaire permet de configurer un serveur en mode Core en mode texte ?",
  c:["sconfig","config-server","setup-core","server-config"], a:0,
  why:"sconfig est l'utilitaire de configuration textuel de Server Core." },
{ m:"core", efm:true, q:"Quelle commande renomme un ordinateur en mode Core ?",
  c:["netdom renamecomputer %computername% /NewName:SrvCore","rename-pc SrvCore","hostname SrvCore","net rename SrvCore"], a:0,
  why:"Question EFM : netdom renamecomputer avec /NewName, puis redémarrage." },
{ m:"core", q:"Quelle commande redémarre immédiatement le serveur ?",
  c:["shutdown -r -t 0","restart now","reboot -immediate","shutdown -s -t 0"], a:0,
  why:"-r = redémarrer, -t 0 = délai de 0 seconde. (-s = arrêter.)" },
{ m:"core", q:"Quelle commande liste les rôles et fonctionnalités installables en mode Core ?",
  c:["dism /online /get-features","list-features","show-roles","get-roles"], a:0,
  why:"dism /online /get-features liste les fonctionnalités du système en cours." },
{ m:"core", efm:true, q:"Quelle commande installe le rôle DNS en mode Core ?",
  c:["dism /online /enable-feature /featureName:DNS-Server-Full-Role","install dns","enable dns-server","add-feature dns"], a:0,
  why:"Question EFM : dism avec /enable-feature et le nom exact de la fonctionnalité." },
{ m:"core", q:"Quelle cmdlet PowerShell liste toutes les commandes disponibles ?",
  c:["Get-Command","List-Commands","Show-Cmdlets","Get-All"], a:0,
  why:"Get-Command affiche les cmdlets, fonctions et alias disponibles." },
{ m:"core", q:"Quelle commande affiche la configuration IP détaillée d'un poste ?",
  c:["ipconfig /all","show-ip","net ipconfig","get-ipconfig"], a:0,
  why:"ipconfig /all affiche adresses IP, masque, passerelle, DNS et adresse MAC." },
{ m:"core", q:"Comment ouvrir une session PowerShell distante sur un serveur ?",
  c:["Enter-PSSession -ComputerName SRV1","remote-powershell SRV1","connect-ps SRV1","telnet SRV1"], a:0,
  why:"Enter-PSSession ouvre une session PowerShell interactive distante (via WinRM)." },
];

/* ============================================================
   Quiz engine (client-side only, scores in localStorage)
   ============================================================ */
const QuizApp = {
  KEY: "servercore-quiz-v1",
  TIME_PER_Q: 30,
  mountEl: null, timer: null, timeLeft: 0,
  questions: [], idx: 0, score: 0, answers: [], // {q, ok, mod}
  selectedMods: null, qCount: 20,

  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{"board":[],"best":0}'); }
    catch (e) { return { board: [], best: 0 }; }
  },
  save(data) { try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {} },
  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },

  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  modName(id) { const m = QUIZ_MODULES.find(x => x.id === id); return m ? m.name : id; },

  /* ---------- setup screen ---------- */
  mount(el) {
    this.stopTimer();
    this.mountEl = el;
    const data = this.load();
    const board = data.board.slice(0, 5);
    el.innerHTML = `
    <div class="card"><h2>Configuration du quiz</h2>
      <div style="font-size:13px;color:var(--muted)">Choisis les modules, le nombre de questions, puis lance-toi. +10 points par bonne réponse, bonus de rapidité jusqu'à +5.</div>
      <div class="quiz-mod-grid">
        ${QUIZ_MODULES.map(m => {
          const n = QUIZ_BANK.filter(q => q.m === m.id).length;
          return `<label class="quiz-mod"><input type="checkbox" data-mod="${m.id}" checked> ${esc(m.name)} <span style="color:var(--muted)">(${n})</span></label>`;
        }).join("")}
      </div>
      <div class="btn-row" style="align-items:center">
        <label style="font-size:13px">Questions :
          <select id="quiz-count" class="btn">
            <option value="10">10</option><option value="20" selected>20</option>
            <option value="30">30</option><option value="0">Tout (${QUIZ_BANK.length})</option>
          </select>
        </label>
        <button class="btn primary" id="quiz-start">Démarrer le quiz</button>
      </div>
      ${data.best ? `<div style="font-size:13px;color:var(--muted);margin-top:8px">Ton record : <b style="color:var(--accent)">${data.best} pts</b></div>` : ""}
    </div>
    <div class="card"><h2>Meilleurs scores (cet appareil)</h2>
      ${board.length ? `<table class="quiz-board"><thead><tr><th>#</th><th>Nom</th><th>Score</th><th>%</th><th>Date</th></tr></thead><tbody>` +
        board.map((b, i) => `<tr><td>${i + 1}</td><td>${esc(b.name)}</td><td>${b.score} pts</td><td>${b.pct}%</td><td>${esc(b.date)}</td></tr>`).join("") + `</tbody></table>`
        : `<div style="font-size:13px;color:var(--muted)">Aucun score pour l'instant. Sois le premier !</div>`}
      ${data.board.length ? `<div class="btn-row"><button class="btn" id="quiz-clear">Effacer les scores</button></div>` : ""}
    </div>`;
    el.querySelector("#quiz-start").addEventListener("click", () => this.start());
    const clr = el.querySelector("#quiz-clear");
    if (clr) clr.addEventListener("click", () => {
      const d = this.load(); d.board = []; d.best = 0; this.save(d); this.mount(el);
    });
  },

  start() {
    const checked = [...this.mountEl.querySelectorAll("[data-mod]:checked")].map(x => x.getAttribute("data-mod"));
    if (!checked.length) { alert("Sélectionne au moins un module."); return; }
    let n = parseInt(this.mountEl.querySelector("#quiz-count").value, 10);
    let pool = this.shuffle(QUIZ_BANK.filter(q => checked.includes(q.m)).slice());
    if (n > 0) pool = pool.slice(0, n);
    if (!pool.length) return;
    this.questions = pool.map(q => {
      const order = this.shuffle([0, 1, 2, 3]);
      return { q, order, good: order.indexOf(q.a) };
    });
    this.idx = 0; this.score = 0; this.answers = [];
    this.renderQuestion();
  },

  renderQuestion() {
    const el = this.mountEl;
    const item = this.questions[this.idx];
    const total = this.questions.length;
    this.timeLeft = this.TIME_PER_Q;
    el.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted)">
        <span>Question ${this.idx + 1}/${total} · ${esc(this.modName(item.q.m))}${item.q.efm ? ' · <span style="color:#f5a524">EFM</span>' : ''}</span>
        <span>Score : <b style="color:var(--accent)">${this.score}</b></span>
      </div>
      <div class="quiz-timer" id="quiz-timerbar"><div style="width:100%"></div></div>
      <h2 style="font-size:17px;margin:6px 0 4px">${esc(item.q.q)}</h2>
      <div id="quiz-choices">
        ${item.order.map((ci, pos) => `<button class="quiz-choice" data-pos="${pos}"><b>${"ABCD"[pos]}.</b> ${esc(item.q.c[ci])}</button>`).join("")}
      </div>
      <div id="quiz-feedback"></div>
    </div>`;
    el.querySelectorAll(".quiz-choice").forEach(b =>
      b.addEventListener("click", () => this.answer(parseInt(b.getAttribute("data-pos"), 10))));
    this.stopTimer();
    const bar = el.querySelector("#quiz-timerbar");
    this.timer = setInterval(() => {
      this.timeLeft--;
      const pct = Math.max(0, (this.timeLeft / this.TIME_PER_Q) * 100);
      bar.firstElementChild.style.width = pct + "%";
      bar.classList.toggle("low", this.timeLeft <= 10);
      if (this.timeLeft <= 0) this.answer(-1);
    }, 1000);
  },

  answer(pos) {
    this.stopTimer();
    const el = this.mountEl;
    const item = this.questions[this.idx];
    const ok = pos === item.good;
    let gained = 0;
    if (ok) {
      gained = 10 + Math.ceil(5 * (this.timeLeft / this.TIME_PER_Q));
      this.score += gained;
    }
    this.answers.push({ mod: item.q.m, ok });
    el.querySelectorAll(".quiz-choice").forEach(b => {
      b.disabled = true;
      const p = parseInt(b.getAttribute("data-pos"), 10);
      if (p === item.good) b.classList.add("good");
      else if (p === pos) b.classList.add("bad");
    });
    el.querySelector("#quiz-feedback").innerHTML = `
      <div class="quiz-why${item.q.efm ? " efm" : ""}">
        <b>${ok ? "Bonne réponse ! +" + gained + " pts" : (pos === -1 ? "Temps écoulé !" : "Raté.")}</b><br>${esc(item.q.why)}
        ${item.q.efm ? '<br><span style="color:#f5a524">Question issue de l\'EFM officiel.</span>' : ''}
      </div>
      <div class="btn-row"><button class="btn primary" id="quiz-next">${this.idx + 1 < this.questions.length ? "Question suivante" : "Voir mon résultat"}</button></div>`;
    el.querySelector("#quiz-next").addEventListener("click", () => {
      this.idx++;
      if (this.idx < this.questions.length) this.renderQuestion();
      else this.renderResults();
    });
  },

  renderResults() {
    this.stopTimer();
    const el = this.mountEl;
    const total = this.questions.length;
    const good = this.answers.filter(a => a.ok).length;
    const pct = Math.round((good / total) * 100);
    const maxScore = this.questions.reduce((s) => s + 15, 0);
    const byMod = {};
    this.answers.forEach(a => {
      byMod[a.mod] = byMod[a.mod] || { ok: 0, n: 0 };
      byMod[a.mod].n++; if (a.ok) byMod[a.mod].ok++;
    });
    const data = this.load();
    const isBest = this.score > (data.best || 0);
    if (isBest) { data.best = this.score; this.save(data); }
    const msg = pct >= 80 ? "Excellent ! Niveau EFM validé." : pct >= 60 ? "Bien ! Encore quelques révisions." : pct >= 40 ? "Pas mal, mais il faut revoir le cours." : "Revois le cours et retente le quiz !";
    el.innerHTML = `
    <div class="card" style="text-align:center">
      <h2>Résultat</h2>
      <div class="quiz-score">${this.score} <span style="font-size:16px;color:var(--muted)">/ ${maxScore} pts</span></div>
      <div style="font-size:14px;margin:6px 0">${good}/${total} bonnes réponses (${pct}%)</div>
      <div style="font-size:13px;color:var(--muted)">${msg}${isBest ? ' <b style="color:var(--accent)">Nouveau record !</b>' : ''}</div>
    </div>
    <div class="card"><h2>Détail par module</h2>
      ${Object.keys(byMod).map(m => {
        const b = byMod[m], p = Math.round((b.ok / b.n) * 100);
        return `<div style="font-size:13px;margin:6px 0">${esc(this.modName(m))} — <b>${b.ok}/${b.n}</b> (${p}%)</div>`;
      }).join("")}
    </div>
    <div class="card"><h2>Enregistrer mon score</h2>
      <div class="btn-row" style="align-items:center">
        <input id="quiz-name" class="btn" style="cursor:text" placeholder="Ton prénom" maxlength="20">
        <button class="btn primary" id="quiz-save">Enregistrer</button>
      </div>
    </div>
    <div class="card"><div class="btn-row">
      <button class="btn primary" id="quiz-retry">Rejouer</button>
      <button class="btn" id="quiz-setup">Changer de modules</button>
    </div></div>`;
    el.querySelector("#quiz-retry").addEventListener("click", () => this.start());
    el.querySelector("#quiz-setup").addEventListener("click", () => this.mount(el));
    el.querySelector("#quiz-save").addEventListener("click", () => {
      const name = (el.querySelector("#quiz-name").value || "Anonyme").trim().slice(0, 20) || "Anonyme";
      const d = this.load();
      d.board.push({ name, score: this.score, pct, nq: total, date: new Date().toLocaleDateString("fr-FR") });
      d.board.sort((a, b) => b.score - a.score);
      d.board = d.board.slice(0, 10);
      this.save(d);
      this.mount(el);
    });
  },
};
