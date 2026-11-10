/* botfx — terrain de jeu : cercle vertueux, machine, boîte de demain, jeu, calculateur, radiographie, téléphone.
   Vanilla, sans dépendance. Tout s'arrête avec le bouton pause et prefers-reduced-motion. */
(() => {
  const root = document.documentElement;
  const reduced = () => root.dataset.motion === 'reduced';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fr = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const onMotion = (fn) => document.addEventListener('botfx:motion', fn);
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- votre activité : tout le terrain de jeu parle de votre métier ----------
     day = [ce que vous faites à la main, ce que la machine en fait, ce que vous faites à la place] */
  const nb = (s) => s.replace(/ ([?:;!»])/g, ' $1').replace(/« /g, '« ');
  const NICHES = {
    artisan: { label: 'Artisan, BTP', scenario: 'facture',
      genius: 'Vous avez monté votre boîte pour être sur les chantiers. Pas pour refaire des devis à 22 h.',
      ticker: ['Devis envoyé après la visite', 'Acompte encaissé', 'Attestation transmise', 'Planning du lundi confirmé'],
      clutter: ['Bon de livraison froissé', 'Devis à finir ce soir', 'SMS : on passe quand ?'],
      day: [['Trier les mails et les SMS de chantier', 'Triés, résumés', 'Être sur le chantier'], ['Refaire un devis de mémoire', 'Brouillon prêt', 'Chiffrer les gros projets'], ['Relancer les factures impayées', 'Relancées sans vous', 'Former votre apprenti'], ['Chercher l\'attestation décennale', 'Envoyée en un clic', 'Soigner la finition'], ['Commander le matériel oublié', 'Commande préparée', 'Visiter un nouveau client'], ['Recopier les heures des gars', 'Heures remontées', 'Planifier le mois prochain'], ['Préparer les papiers du comptable', 'Transmis chaque mois', 'Trouver un meilleur fournisseur'], ['Rappeler les clients pour les dates', 'Rendez-vous confirmés', 'Rentrer dîner']] },
    commerce: { label: 'Commerce, e-commerce', scenario: 'lead',
      genius: 'Vous vous êtes lancé pour vendre et choisir vos produits. Pas pour recopier des stocks dans un tableur.',
      ticker: ['Commande saisie', 'Stock mis à jour', 'Colis suivi, client prévenu', 'Panier abandonné relancé'],
      clutter: ['Stock_vrai_celui_la.xlsx', 'Où est mon colis ?', 'Retours à traiter'],
      day: [['Répondre « où est mon colis ? »', 'Réponse automatique', 'Choisir la prochaine collection'], ['Mettre à jour les stocks', 'Stocks synchronisés', 'Négocier avec un fournisseur'], ['Saisir les commandes', 'Saisies toutes seules', 'Préparer le lancement'], ['Gérer un retour produit', 'Retour déjà lancé', 'Soigner la vitrine'], ['Publier les nouveautés', 'Publiées partout', 'Imaginer une offre'], ['Recouper les ventes et la caisse', 'Caisse rapprochée', 'Parler à vos meilleurs clients'], ['Préparer la comptabilité', 'Transmise chaque mois', 'Étudier vos marges'], ['Relancer les paniers abandonnés', 'Relancés sans vous', 'Fermer à l\'heure']] },
    restaurant: { label: 'Restauration', scenario: 'avis',
      genius: 'Vous avez ouvert pour faire à manger et recevoir. Pas pour compter les factures fournisseurs à minuit.',
      ticker: ['Réservation confirmée', 'Facture fournisseur classée', 'Planning envoyé', 'Avis client traité'],
      clutter: ['Factures dans un carton', 'Qui fait samedi ?', 'No-show table 6'],
      day: [['Répondre aux réservations', 'Confirmées sans vous', 'Créer la nouvelle carte'], ['Saisir les factures fournisseurs', 'Lues et classées', 'Goûter avec votre chef'], ['Faire les plannings', 'Proposés tout prêts', 'Former le service'], ['Compter les stocks', 'Alertes automatiques', 'Aller au marché'], ['Répondre aux avis en ligne', 'Brouillons préparés', 'Recevoir vos habitués'], ['Calculer les coûts matière', 'Calculés chaque semaine', 'Retravailler vos marges'], ['Envoyer les heures au comptable', 'Transmises chaque mois', 'Préparer l\'événement du mois'], ['Courir après les no-shows', 'Acompte demandé', 'Souffler avant le service']] },
    sante: { label: 'Santé, libéral', scenario: 'ia',
      genius: 'Vous avez choisi de soigner. Pas de passer vos soirées sur la paperasse.',
      ticker: ['Rendez-vous confirmé', 'Document transmis', 'Impayé relancé', 'Pièces envoyées au comptable'],
      clutter: ['Courrier à scanner', 'Rappeler la mutuelle', 'Planning sur papier'],
      day: [['Trier les mails administratifs', 'Triés, résumés', 'Prendre le temps avec un patient'], ['Renvoyer les documents demandés', 'Envoyés en un clic', 'Approfondir un cas'], ['Relancer les impayés', 'Relancés sans vous', 'Vous former'], ['Retrouver une procédure', 'Retrouvée en une question', 'Échanger avec vos confrères'], ['Confirmer les rendez-vous', 'Confirmés automatiquement', 'Organiser votre tournée'], ['Préparer la paie du cabinet', 'Éléments transmis', 'Penser au cabinet de demain'], ['Classer la comptabilité', 'Classée chaque mois', 'Accueillir un remplaçant'], ['Préparer les courriers types', 'Prêts à relire', 'Rentrer plus tôt']] },
    cabinet: { label: 'Cabinet, expertise', scenario: 'embauche',
      genius: 'Vos clients vous paient pour votre expertise. Pas pour réclamer des pièces jointes.',
      ticker: ['Pièce manquante réclamée', 'Lettre de mission signée', 'Échéance anticipée', 'Dossier classé'],
      clutter: ['RE: il manque le RIB', 'Scan_001(4).pdf', 'Échéance : demain ?'],
      day: [['Réclamer les pièces manquantes', 'Réclamées sans vous', 'Conseiller un client'], ['Renommer et classer les documents', 'Classés tout seuls', 'Étudier un dossier complexe'], ['Envoyer les lettres de mission', 'Signées en ligne', 'Préparer une offre'], ['Ressaisir dans le logiciel métier', 'Données transférées', 'Développer le cabinet'], ['Suivre les échéances', 'Alertes à temps', 'Former vos collaborateurs'], ['Répondre aux mêmes questions', 'Réponses préparées', 'Rencontrer un prospect'], ['Relancer les honoraires', 'Relancés sans vous', 'Écrire sur votre spécialité'], ['Compiler le reporting client', 'Reçu chaque lundi', 'Penser le cabinet de demain']] },
    agence: { label: 'Agence, freelance', scenario: 'lead',
      genius: 'Vous vendez de la stratégie à vos clients. La vôtre attend, pendant que vous courez après les validations et les factures.',
      ticker: ['Proposition envoyée', 'Validation relancée', 'Facture partie', 'Reporting livré'],
      clutter: ['V7_def_ok_client.pdf', 'Tu as vu mon mail ?', 'Facture à faire'],
      day: [['Trier les demandes clients', 'Triées, résumées', 'Créer'], ['Refaire une proposition commerciale', 'Brouillon prêt', 'Penser la stratégie de vos clients'], ['Relancer les validations', 'Relancées sans vous', 'Explorer une nouvelle idée'], ['Faire les factures', 'Parties toutes seules', 'Soigner un projet phare'], ['Compter les heures passées', 'Comptées en continu', 'Apprendre un nouvel outil'], ['Compiler le reporting client', 'Reçu chaque lundi', 'Déjeuner avec un prospect'], ['Publier sur les réseaux', 'Programmé à l\'avance', 'Écrire votre prochain article'], ['Répondre aux questions simples', 'Réponses préparées', 'Couper à 18 h']] },
    formation: { label: 'Formation, coaching', scenario: 'formation',
      genius: 'Vous êtes là pour transmettre. Pas pour gérer des feuilles d\'émargement.',
      ticker: ['Inscription confirmée', 'Convocation envoyée', 'Émargement signé', 'Évaluation compilée'],
      clutter: ['Émargement manquant', 'Dossier de financement ?', 'Salle réservée ?'],
      day: [['Répondre aux demandes d\'inscription', 'Réponses automatiques', 'Préparer une session'], ['Ressaisir les inscriptions', 'Saisies une seule fois', 'Créer un nouveau module'], ['Envoyer convocations et documents', 'Partis tout seuls', 'Accompagner un stagiaire'], ['Courir après les émargements', 'Signés en ligne', 'Améliorer votre pédagogie'], ['Monter les dossiers de financement', 'Pièces prêtes', 'Écrire votre prochain programme'], ['Relancer les paiements', 'Relancés sans vous', 'Rencontrer un partenaire'], ['Compiler les évaluations', 'Compilées seules', 'Préparer votre certification'], ['Répondre aux questions simples', 'Réponses préparées', 'Souffler entre deux sessions']] },
    immobilier: { label: 'Immobilier', scenario: 'lead',
      genius: 'Vous êtes fait pour le terrain et les signatures. Pas pour ressaisir des annonces.',
      ticker: ['Annonce publiée', 'Acquéreur qualifié', 'Compte rendu envoyé', 'Pièce manquante réclamée'],
      clutter: ['Mandat à scanner', 'Dispo samedi ?', 'Annonce à corriger'],
      day: [['Trier les demandes d\'acquéreurs', 'Triées, qualifiées', 'Faire une visite'], ['Ressaisir les annonces', 'Publiées partout', 'Rentrer un mandat'], ['Réclamer les pièces du dossier', 'Réclamées sans vous', 'Estimer un bien'], ['Mettre à jour les fiches clients', 'Toujours à jour', 'Prospecter votre quartier'], ['Envoyer les comptes rendus de visite', 'Partis après la visite', 'Négocier une offre'], ['Relancer les acquéreurs', 'Relancés sans vous', 'Entretenir votre réseau'], ['Préparer les documents de vente', 'Pré-remplis', 'Conclure une vente'], ['Répondre aux questions simples', 'Réponses préparées', 'Retrouver votre soirée']] },
  };
  const GENIUS = 'Le cœur du métier, ça va. C\'est l\'administratif autour qui vous bouffe. Et il ne reste plus une minute pour penser à la suite.';
  let nicheKey = '';
  try { nicheKey = localStorage.getItem('botfx-niche') || ''; } catch (_) {}
  if (!NICHES[nicheKey]) nicheKey = '';
  const niche = () => NICHES[nicheKey] || null;
  const setNiche = (k) => {
    nicheKey = NICHES[k] ? k : '';
    try { if (nicheKey) localStorage.setItem('botfx-niche', nicheKey); else localStorage.removeItem('botfx-niche'); } catch (_) {}
    document.dispatchEvent(new CustomEvent('botfx:niche'));
  };

  /* ---------- cercle vertueux : tourne au défilement, met chaque étape en évidence ---------- */
  const circle = $('[data-circle]');
  if (circle) {
    const stick = $('.circle-stick', circle);
    const canvas = $('[data-circle-canvas]', circle);
    const steps = $$('[data-circle-step]', circle);
    const n = steps.length;
    const labels = steps.map((s) => s.querySelector('button').childNodes[1].textContent.trim());
    const ctx = canvas.getContext('2d');
    const golden = Math.PI * (3 - Math.sqrt(5));
    const MAXD = 900;
    const dots = Array.from({ length: MAXD }, (_, i) => {
      const y = 1 - (i / (MAXD - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });
    let W = 0, H = 0, cur = 0, goal = 0, raf = 0;
    const pinned = () => getComputedStyle(stick).position === 'sticky';

    const shorten = (t) => {
      const w = t.split(' ');
      const lines = [''];
      w.forEach((m) => { const l = lines[lines.length - 1]; if ((l + ' ' + m).trim().length > 14 && l) lines.push(m); else lines[lines.length - 1] = (l + ' ' + m).trim(); });
      return lines.slice(0, 3);
    };

    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const nodes = [];
    function draw(p) {
      const idx = p * (n - 1);
      const angle = -idx * (Math.PI * 2 / n);
      circle.dataset.angle = angle.toFixed(3);
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, Ro = Math.min(W, H) * (W < 420 ? 0.39 : 0.335), Rs = Ro * (0.34 + p * 0.1);
      /* sphère : gagne des points à chaque étape */
      const count = Math.round(220 + p * (MAXD - 220));
      const ay = p * 7 + 0.4, sy = Math.sin(ay), ccy = Math.cos(ay), sx = Math.sin(0.35), cxx = Math.cos(0.35);
      const step = MAXD / count;
      for (let k = 0; k < count; k++) {
        const d = dots[Math.floor(k * step)];
        const x1 = d[0] * ccy - d[2] * sy, z1 = d[0] * sy + d[2] * ccy;
        const y1 = d[1] * cxx - z1 * sx, z2 = d[1] * sx + z1 * cxx;
        const persp = 2.6 / (2.6 + z2), depth = (1 - z2) * 0.5;
        ctx.fillStyle = `rgba(235,238,242,${0.14 + depth * 0.86})`;
        const s = (0.7 + depth * 1.5) * persp;
        ctx.fillRect(cx + x1 * Rs * persp, cy + y1 * Rs * persp, s, s);
      }
      /* anneau : piste, puis parcours accompli */
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(cx, cy, Ro, -Math.PI / 2 - (idx * Math.PI * 2 / n), -Math.PI / 2); ctx.stroke();
      /* flèches qui disent le sens de rotation */
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      for (let i = 0; i < n; i++) {
        const a = angle + (i + 0.5) * (Math.PI * 2 / n) - Math.PI / 2;
        ctx.save(); ctx.translate(cx + Math.cos(a) * Ro, cy + Math.sin(a) * Ro); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      /* étapes autour du cercle */
      nodes.length = 0;
      const small = W < 420;
      let clipped = 0;
      for (let i = 0; i < n; i++) {
        const a = angle + i * (Math.PI * 2 / n) - Math.PI / 2;
        const x = cx + Math.cos(a) * Ro, y = cy + Math.sin(a) * Ro;
        const dist = Math.abs(i - idx), glow = clamp(1 - dist), passed = i <= idx + 0.5;
        const r = (small ? 15 : 20) + glow * (small ? 7 : 12);
        nodes.push({ x, y, r: r + 8, i });
        if (glow > 0.01) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 26 * glow; }
        ctx.fillStyle = glow > 0.5 ? '#fff' : (passed ? '#26272b' : '#111114');
        ctx.strokeStyle = passed ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.24)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = glow > 0.5 ? '#050506' : '#f5f5f6';
        ctx.font = `500 ${small ? 11 : 13}px "Geist Mono",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1).padStart(2, '0'), x, y + 0.5);
        if (glow > 0.05 && !small) {
          ctx.globalAlpha = glow; ctx.fillStyle = '#f5f5f6'; ctx.font = '500 15px Geist,sans-serif';
          /* l'étiquette part du bord du rond, du côté extérieur du cercle */
          const ca = Math.cos(a), sa = Math.sin(a), gap = r + 12, ax = x + ca * gap, ay = y + sa * gap;
          const parts = shorten(labels[i]);
          const tw = Math.max(...parts.map((l) => ctx.measureText(l).width)), th = parts.length * 18;
          let left = ca > 0.2 ? ax : ca < -0.2 ? ax - tw : ax - tw / 2;
          let top = sa > 0.2 ? ay : sa < -0.2 ? ay - th : ay - th / 2;
          if (left < 4 || top < 4 || left + tw > W - 4 || top + th > H - 4) {
            /* pas la place à l'extérieur : à côté du rond, du côté où ça tient */
            left = x + r + 12 + tw <= W - 4 ? x + r + 12 : x - r - 12 - tw;
            top = y - th / 2;
          }
          left = clamp(left, 4, Math.max(4, W - tw - 4));
          top = clamp(top, 4, Math.max(4, H - th - 4));
          if (left < 0 || top < 0 || left + tw > W || top + th > H) clipped++;
          /* l'étiquette ne doit jamais recouvrir le rond de son étape */
          if (left < x + r && left + tw > x - r && top < y + r && top + th > y - r) clipped++;
          ctx.textAlign = 'left';
          parts.forEach((l, j) => ctx.fillText(l, left, top + 9 + j * 18));
          ctx.globalAlpha = 1;
        }
      }
      circle.dataset.clipped = clipped;
    }
    const setActive = (p) => {
      const a = Math.round(p * (n - 1));
      steps.forEach((s, i) => { s.classList.toggle('is-active', i === a); s.classList.toggle('on', i <= a); });
    };
    const target = () => {
      const r = circle.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight));
    };
    const tick = () => {
      cur += (goal - cur) * 0.12;
      if (Math.abs(goal - cur) < 0.0008) cur = goal; else raf = requestAnimationFrame(tick);
      draw(cur); setActive(cur);
    };
    const onScroll = () => {
      if (reduced() || !pinned()) return;
      goal = target();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    const refresh = () => {
      size();
      if (reduced() || !pinned()) { cancelAnimationFrame(raf); cur = goal = 1; draw(1); steps.forEach((s) => { s.classList.add('on'); s.classList.remove('is-active'); }); }
      else { goal = cur = target(); draw(cur); setActive(cur); }
    };
    const jump = (i) => {
      if (reduced() || !pinned()) return;
      const top = circle.getBoundingClientRect().top + scrollY + (circle.offsetHeight - innerHeight) * (i / (n - 1));
      scrollTo({ top, behavior: 'smooth' });
    };
    steps.forEach((s, i) => s.querySelector('button').addEventListener('click', () => jump(i)));
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = nodes.find((nd) => Math.hypot(nd.x - x, nd.y - y) < nd.r);
      if (hit) jump(hit.i);
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      canvas.style.cursor = nodes.some((nd) => Math.hypot(nd.x - (e.clientX - r.left), nd.y - (e.clientY - r.top)) < nd.r) ? 'pointer' : '';
    });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', refresh);
    onMotion(refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    refresh();
  }

  /* ---------- machine : avant (chaos) ↔ après (automatisé), lancer, déplacer, couper ----------
     Étape = [type, titre, journal, conséquence si coupée, geste manuel d'avant, minutes par semaine (exemple)] */
  const SCENARIOS = {
    facture: { label: 'Facture impayée',
      away: 'Chaque relance oubliée, c\'est de l\'argent que vous avez gagné et que vous ne touchez pas.',
      toward: 'Vos factures se relancent toutes seules. L\'argent rentre sans que vous ayez à le réclamer.',
      win: 'Facture relancée, lien de paiement envoyé. L\'argent peut arriver, et personne n\'a eu à y penser.',
      clutter: ['factures_v3_FINAL.xlsx', 'Post-it : rappeler lundi', 'RE: RE: RE: facture', 'Il a payé ou pas ?', '14 onglets ouverts'],
      steps: [
        ['Déclencheur', 'Échéance dépassée', 'Facture F-1042 en retard de 3 jours', 'personne ne voit le retard. La facture dort, et votre trésorerie avec.', 'Vous fouillez le tableur pour repérer les retards', 30],
        ['Vérification', 'Paiement reçu ?', 'Banque interrogée, aucun virement', 'vous relancez un client qui a déjà payé. Il vous le fait remarquer, et la confiance en prend un coup.', 'Vous comparez à la main avec le relevé bancaire', 40],
        ['Rédaction', 'Relance adaptée', 'Ton courtois, premier rappel', 'personne ne réclame. Le client n\'a aucune raison de payer maintenant : l\'argent n\'arrive pas.', 'Vous cherchez quoi écrire sans froisser le client', 30],
        ['Envoi', 'Mail avec lien de paiement', 'Envoyé au bon contact', 'la relance reste dans vos brouillons. Pas de lien de paiement, pas de paiement.', 'Vous retrouvez le contact, joignez le PDF, envoyez', 25],
        ['Mise à jour', 'CRM à jour', 'Historique complété', 'plus personne ne sait où en est ce client. On le relance deux fois, ou plus du tout.', 'Vous notez quelque part que c\'est fait', 15],
        ['Alerte', 'Vous êtes prévenu', 'Seulement si le client ne répond pas', 'les mauvais payeurs passent sous le radar. Vous découvrez l\'impayé quand il est trop tard pour le récupérer.', 'Vous y repensez à 23 h, sans savoir où ça en est', 20],
      ] },
    embauche: { label: 'Embauche',
      away: 'Votre nouveau salarié arrive lundi. Son dossier, lui, est encore éparpillé dans trois boîtes mail.',
      toward: 'Le contrat est signé avant son premier café. Votre équipe ne court plus après personne.',
      win: 'Dossier complet, contrat scellé. Il ne reste qu\'une tâche à l\'équipe, et le salarié peut commencer.',
      clutter: ['Scan_contrat(2).pdf', 'Il manque la carte vitale', 'Tu l\'as reçu ?', 'Imprimante HS', 'Relancer Mme D.'],
      steps: [
        ['Déclencheur', 'Formulaire d\'embauche', 'Le client indique le contrat prévu', 'le dossier démarre par trois appels, et l\'embauche prend du retard dès le premier jour.', 'Vous appelez pour savoir quel contrat préparer', 40],
        ['Collecte', 'Pièces du salarié', 'Dépôt en ligne depuis un lien personnel', 'les pièces arrivent en vrac par mail. Une pièce d\'identité traîne dans une boîte que tout le monde lit.', 'Vous triez les pièces reçues par mail, en vrac', 45],
        ['Relance', 'Seulement ce qui manque', 'Un mail, deux pièces réclamées', 'le dossier reste incomplet, et le salarié commence sans que tout soit en règle.', 'Vous vérifiez ce qui manque, puis relancez', 35],
        ['Signature', 'Contrat signé en ligne', 'Rempli avec les infos du salarié', 'on imprime, on signe, on scanne. Le contrat arrive après la prise de poste : c\'est vous qui êtes exposé.', 'Vous imprimez, faites signer, scannez, renvoyez', 50],
        ['Contreseing', 'Employeur prévenu', 'Contrat scellé remis aux deux parties', 'le contrat reste à moitié signé. En cas de litige, il ne vous protège pas.', 'Vous courez après la seconde signature', 25],
        ['Équipe', 'Dossier prêt pour la paie', 'Une seule tâche reste à l\'humain', 'l\'équipe découvre le dossier la veille de la paie. Erreur sur le bulletin, salarié mécontent.', 'Vous ressaisissez tout dans le logiciel de paie', 40],
      ] },
    formation: { label: 'Inscription',
      away: 'Une inscription saisie deux fois, c\'est une erreur de plus et un stagiaire qui attend sa réponse.',
      toward: 'Le stagiaire s\'inscrit une seule fois. Tout est déjà prêt quand il arrive.',
      win: 'Inscrit, confirmé, documents ouverts. Le secrétariat n\'a rien eu à ressaisir.',
      clutter: ['Planning_sept_bis.docx', 'Encore une place ?', 'Inscription par SMS', 'Clé USB à préparer'],
      steps: [
        ['Déclencheur', 'Inscription dans l\'application', 'Coordonnées déjà remplies', 'le stagiaire remplit un second formulaire, ou abandonne. Une inscription perdue, c\'est une place vide.', 'Le stagiaire téléphone, vous prenez des notes', 35],
        ['Contrôle', 'Session disponible ?', 'Une place restante', 'une session complète accepte encore du monde. Il faudra rappeler pour annuler, et s\'excuser.', 'Vous comptez les places dans le planning', 25],
        ['Site', 'Formulaire transmis', 'Le site reçoit l\'inscription', 'l\'inscription n\'existe nulle part ailleurs que sur un papier. Elle finit par se perdre.', 'Vous ressaisissez tout sur le site', 30],
        ['Secrétariat', 'Mail envoyé', 'Dossier prêt à traiter', 'le secrétariat n\'en sait rien. Le financement n\'est pas monté à temps, et la formation n\'est pas payée.', 'Vous prévenez le secrétariat, qui recopie', 30],
        ['Accès', 'Documents ouverts', 'Accès ajouté au compte', 'le stagiaire arrive sans ses documents. Votre image se joue là, le premier jour.', 'Vous préparez et envoyez les documents', 40],
      ] },
    ia: { label: 'Assistant IA',
      away: 'Vos réponses dorment dans cent fichiers, et vous payez quelqu\'un à les chercher.',
      toward: 'Une question, une réponse sourcée. Tout votre savoir, disponible pour toute l\'équipe.',
      win: 'Réponse trouvée, vérifiée et sourcée en quelques secondes. Personne n\'a été interrompu.',
      clutter: ['Procédure_2021_old.pdf', 'Demande à Sophie', 'C\'est où déjà ?', 'Dossier "Divers"'],
      steps: [
        ['Question', 'Un collègue demande', '« Quel délai pour ce contrat ? »', 'la question ne trouve personne. Le collègue décide seul, sans l\'information.', 'Il interrompt un collègue qui sait, peut-être', 30],
        ['Recherche', 'Dans vos documents', '3 passages pertinents trouvés', 'l\'IA répond de mémoire, et invente. Une erreur dite avec assurance finit chez un client.', 'Vous ouvrez dix fichiers pour retrouver la clause', 60],
        ['Garde-fou', 'Sources vérifiées', 'Réponse appuyée sur 2 documents', 'une réponse fausse part avec aplomb. C\'est votre entreprise qui en répond, pas la machine.', 'Vous relisez pour vérifier que c\'est encore valable', 30],
        ['Réponse', 'Rédigée et citée', 'Avec le lien vers la source', 'impossible de contrôler d\'où vient l\'information. Plus personne n\'ose s\'y fier.', 'Vous rédigez la réponse de zéro', 25],
        ['Humain', 'Doute ? On transmet', 'Confiance suffisante, pas d\'escalade', 'les cas sensibles passent sans relecture. Le jour où ça se voit, c\'est un litige.', 'Personne ne sait qui doit trancher', 20],
      ] },
    lead: { label: 'Demande de devis',
      away: 'Pendant que votre demande de devis dort, votre concurrent a déjà répondu.',
      toward: 'Le prospect reçoit votre réponse pendant qu\'il a encore envie d\'acheter.',
      win: 'Fiche créée, devis prêt, vous validez d\'un clic. Le prospect a sa réponse le jour même.',
      clutter: ['Formulaire non lu (7)', 'Devis_modele_ancien', 'Doublon client ?', 'À traiter vendredi'],
      steps: [
        ['Déclencheur', 'Formulaire du site', 'Nouvelle demande reçue', 'la demande attend dans une boîte mail. Le prospect, lui, n\'attend pas : il achète ailleurs.', 'La demande attend que vous ouvriez vos mails', 20],
        ['Enrichissement', 'Entreprise identifiée', 'SIRET, activité, adresse complétés', 'vous recherchez tout à la main et répondez à l\'aveugle, sans savoir à qui vous parlez.', 'Vous cherchez l\'entreprise, le SIRET, l\'adresse', 25],
        ['CRM', 'Fiche créée', 'Sans doublon', 'le contact existe en trois exemplaires. Deux personnes rappellent le même prospect.', 'Vous créez la fiche, sans savoir si elle existe', 20],
        ['Devis', 'Brouillon préparé', 'À partir de votre grille', 'le devis part trois jours plus tard. Trop tard pour une vente qui se jouait aujourd\'hui.', 'Vous rouvrez l\'ancien devis et le modifiez', 45],
        ['Alerte', 'Vous validez', 'Une notification, un clic', 'un devis part sans relecture, avec le mauvais prix. Vous devrez l\'honorer ou vous excuser.', 'Vous relisez entre deux rendez-vous', 15],
      ] },
    recrutement: { label: 'Recrutement',
      away: 'Vos candidats attendent une réponse. Les meilleurs ne vont pas attendre longtemps.',
      toward: 'Chaque candidature arrive au bon manager, et personne ne reste sans réponse. Sans service RH.',
      win: 'Manager prévenu, suivi à jour. Personne n\'est resté sans réponse.',
      clutter: ['CV_final_v2.pdf', 'Tu l\'as rappelé ?', 'Candidature de mardi ?', 'Boîte recrutement : non lus'],
      steps: [
        ['Déclencheur', 'Candidature reçue', 'Formulaire complet, CV joint', 'les candidatures s\'empilent dans une boîte mail. Vous découvrez le bon profil quand il a déjà signé ailleurs.', 'Vous ouvrez chaque mail et téléchargez chaque CV', 40],
        ['Routage', 'Envoyé au bon manager', 'Le manager concerné est prévenu', 'la candidature tourne entre trois personnes, et chacune pense qu\'une autre s\'en occupe.', 'Vous transférez au manager, qui oublie', 20],
        ['Relances', 'Manager et candidat relancés', 'Rappel avant que ça refroidisse', 'le dossier dort sur un bureau. Le candidat en conclut que vous ne voulez pas de lui.', 'Vous relancez tout le monde, à la main', 30],
        ['Suivi', 'Pipeline à jour', 'Étape enregistrée', 'plus personne ne sait qui a été vu, refusé ou oublié. Vous recontactez un candidat déjà écarté.', 'Vous tenez un tableur que personne ne met à jour', 25],
        ['Réponse', 'Chaque candidat a sa réponse', 'Message adapté à son étape', 'des candidats n\'ont jamais de nouvelles. Ce sont aussi vos futurs clients, et ils en parlent.', 'Vous n\'avez plus le temps de répondre aux refus', 30],
      ] },
    avis: { label: 'Avis Google',
      away: 'Un avis sans réponse, c\'est une réunion publique où vous n\'êtes pas venu.',
      toward: 'Chaque avis reçoit la bonne réponse, vite, dans le ton de votre métier.',
      win: 'Avis traité, réponse publiée, bilan à jour. Votre réputation tourne pendant que vous travaillez.',
      clutter: ['Avis sans réponse', 'Mot de passe Google ?', 'Qui répond à celui-là ?', 'Fiche pas à jour'],
      steps: [
        ['Déclencheur', 'Nouvel avis Google', 'Avis 2 étoiles détecté ce matin', 'l\'avis reste sans réponse. Tous ceux qui vous cherchent sur Google le voient, et appellent le concurrent.', 'Vous allez vérifier vos fiches, quand vous y pensez', 30],
        ['Tri', 'Selon la note', '2 étoiles, alerte immédiate', 'un client furieux reçoit le même merci qu\'un client ravi. Sur Google, ça se voit et ça se retient.', 'Vous lisez tout, sans savoir par quoi commencer', 20],
        ['Rédaction', 'Réponse au ton du métier', 'Brouillon rédigé pour ce métier', 'les réponses sonnent toutes pareil. Vos futurs clients voient un robot, pas une entreprise.', 'Vous cherchez une formule qui ne fasse pas copier-coller', 45],
        ['Humain', 'Validation si c\'est sensible', 'Soumis avant publication', 'une réponse maladroite part vers un client mécontent, en public et pour des années.', 'Vous relisez entre deux rendez-vous', 20],
        ['Publication', 'Réponse en ligne', 'Publiée sur la fiche', 'la réponse reste dans un tiroir, et le client mécontent garde le dernier mot.', 'Vous vous connectez, copiez, collez, publiez', 25],
        ['Bilan', 'Rapport automatique', 'Vues, appels et avis compilés', 'vous payez un service sans jamais voir ce qu\'il rapporte, et vous finissez par l\'arrêter.', 'Vous compilez vos chiffres à la main chaque trimestre', 60],
      ] },
    wordpress: { label: 'Maintenance',
      away: 'Votre site tient jusqu\'au jour où il ne tient plus. Et c\'est un client qui vous prévient.',
      toward: 'Chaque semaine, tout est à jour, vérifié et prouvé. Vous n\'y pensez plus.',
      win: 'Site sauvegardé, à jour, contrôlé. Le compte rendu est dans votre boîte.',
      clutter: ['17 mises à jour', 'Erreur critique ?', 'Sauvegarde : jamais', 'Mot de passe admin ?'],
      steps: [
        ['Planning', 'Mardi, 6 h', 'Fenêtre de maintenance ouverte', 'les mises à jour s\'accumulent pendant des mois. La grosse panne n\'est qu\'une question de temps.', 'Vous y pensez quand vous avez un moment', 15],
        ['Sauvegarde', 'Copie complète', 'Base et fichiers sauvegardés', 'une panne n\'a aucun retour possible. Votre site, vos contenus et vos commandes peuvent disparaître.', 'Vous lancez une sauvegarde, si vous y pensez', 20],
        ['Mises à jour', 'Extensions et cœur', '7 mises à jour appliquées', 'les failles connues restent ouvertes. Un site piraté, c\'est Google qui vous bannit et vos clients qui fuient.', 'Vous cliquez sur Mettre à jour, en croisant les doigts', 30],
        ['Contrôle', 'Pages clés testées', 'Accueil, formulaire, panier', 'le site cassé est découvert par un client, ou jamais. Pendant ce temps, vous ne recevez plus de demandes.', 'Vous ouvrez quelques pages pour voir si ça marche', 25],
        ['Rapport', 'Compte rendu envoyé', 'Ce qui a changé, en clair', 'vous payez sans savoir ce qui a été fait, et rien ne prouve que le travail a été réalisé.', 'Personne ne sait ce qui a changé, ni quand', 15],
      ] },
  };
  const LAY = { w: 228, h: 150, gx: 40, gy: 44 };
  const seeded = (id) => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }; };
  const fmtMin = (m) => { const r = Math.round(m / 5) * 5, h = Math.floor(r / 60), x = r % 60; return h ? `${h} h${x ? ` ${String(x).padStart(2, '0')}` : ''}` : `${r} min`; };

  $$('[data-machine]').forEach((el) => {
    const ids = (el.dataset.scenarios || Object.keys(SCENARIOS).join(',')).split(',');
    const uid = Math.random().toString(36).slice(2, 7);
    el.classList.add('machine');
    el.innerHTML = `
      <div class="m-tabs" role="tablist" aria-label="Choisir un scénario">${ids.map((id, i) => `<button role="tab" type="button" id="t-${uid}-${id}" aria-controls="p-${uid}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${SCENARIOS[id].label}</button>`).join('')}</div>
      <div class="m-panel" id="p-${uid}" role="tabpanel" tabindex="0" aria-labelledby="t-${uid}-${ids[0]}">
        <div class="m-pitch">
          <p class="m-away"><span class="mono">Sans automatisation</span><span data-pitch-away></span></p>
          <p class="m-toward"><span class="mono">Avec</span><span data-pitch-toward></span></p>
        </div>
        <div class="m-mix">
          <label class="mono" for="mix-${uid}">Glissez de l'avant à l'après</label>
          <input id="mix-${uid}" type="range" min="0" max="100" value="0" step="1" data-machine-mix>
          <div class="m-scale mono" aria-hidden="true"><span>Avant, à la main</span><span>Après, automatisé</span></div>
        </div>
        <div class="m-body">
          <div class="m-board"><div class="m-clutter" aria-hidden="true"></div><svg class="m-wires" aria-hidden="true"><circle class="m-token" r="5" cx="-20" cy="-20"></circle></svg><ol class="m-nodes"></ol></div>
          <div class="m-side">
            <div class="m-actions"><button type="button" class="btn btn-primary" data-machine-run>Lancer <span class="arrow" aria-hidden="true">→</span></button><span class="pill mono">Simulation</span></div>
            <p class="m-time"><span data-machine-time></span><small>de travail manuel par semaine, à titre d'exemple</small></p>
            <p class="m-status" data-machine-status></p>
            <p class="m-count mono"><span data-machine-count>0</span> <span data-machine-unit>étape</span> sans vous</p>
            <div role="log" aria-live="polite" aria-label="Journal d'exécution"><ol class="m-log mono" data-machine-log></ol></div>
          </div>
        </div>
      </div>`;
    const board = $('.m-board', el), svg = $('.m-wires', el), token = $('.m-token', el), list = $('.m-nodes', el), clutter = $('.m-clutter', el);
    const tabs = $$('[role=tab]', el), panel = $('.m-panel', el), mixInput = $('[data-machine-mix]', el);
    const status = $('[data-machine-status]', el), log = $('[data-machine-log]', el), count = $('[data-machine-count]', el), unit = $('[data-machine-unit]', el), timeEl = $('[data-machine-time]', el);
    const IDLE = 'Lancez, puis coupez une étape pour voir ce que ça vous coûte.';
    const BEFORE = 'Voilà votre semaine aujourd\'hui. Glissez vers la droite pour remettre de l\'ordre.';
    let current = ids[0], nodes = [], pos = [], chaos = [], offs = [], paths = [], rendered = [], runId = 0, touched = false, nodeW = LAY.w, mix = 0, lastCut = -1, glideId = 0;

    const setState = (s) => { el.dataset.state = s; };
    const consequence = (i) => `Sans cette étape, ${nb(SCENARIOS[current].steps[i][3])}`;
    const isCut = (nd) => $('.node-cut', nd).getAttribute('aria-pressed') !== 'true';
    function refreshStatus() {
      if (mix < 0.99) status.textContent = BEFORE;
      else if (lastCut >= 0 && isCut(nodes[lastCut])) status.textContent = consequence(lastCut);
      else status.textContent = IDLE;
    }
    const local = (i) => clamp((mix - i / (nodes.length + 1)) * (nodes.length + 1) / 1.6);
    function apply() {
      const total = SCENARIOS[current].steps.reduce((a, s, i) => a + s[5] * (1 - local(i)), 0);
      timeEl.textContent = fmtMin(total);
      rendered = nodes.map((nd, i) => {
        const l = local(i), e = l * l * (3 - 2 * l);
        const x = chaos[i].x + (pos[i].x - chaos[i].x) * e, y = chaos[i].y + (pos[i].y - chaos[i].y) * e, r = chaos[i].r * (1 - e);
        nd.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`;
        nd.style.zIndex = l >= 1 ? '' : String(1 + (i % 3));
        nd.classList.toggle('is-after', l > 0.5);
        return { x, y, l };
      });
      const c = clamp(1 - mix * 1.7);
      clutter.style.setProperty('--c', c.toFixed(3));
      clutter.classList.toggle('is-gone', c === 0);
      el.classList.toggle('is-before', mix < 0.5);
      wires();
    }
    function wires() {
      svg.setAttribute('width', board.clientWidth); svg.setAttribute('height', board.clientHeight);
      const h = LAY.h;
      paths.forEach((p, i) => {
        const a = rendered[i], b = rendered[i + 1], k = 1 - Math.min(a.l, b.l);
        const dx = b.x - a.x, dy = b.y - a.y;
        const o = offs[i];
        let sx, sy, ex, ey, c1x, c1y, c2x, c2y;
        if (Math.abs(dx) > Math.abs(dy)) {
          sx = dx > 0 ? a.x + nodeW : a.x; ex = dx > 0 ? b.x : b.x + nodeW; sy = a.y + h / 2; ey = b.y + h / 2;
          const m = (sx + ex) / 2; c1x = m; c1y = sy; c2x = m; c2y = ey;
        } else {
          sx = a.x + nodeW / 2; ex = b.x + nodeW / 2; sy = dy > 0 ? a.y + h : a.y; ey = dy > 0 ? b.y : b.y + h;
          const m = (sy + ey) / 2; c1x = sx; c1y = m; c2x = ex; c2y = m;
        }
        p.setAttribute('d', `M${sx} ${sy} C${c1x + o[0] * k} ${c1y + o[1] * k} ${c2x + o[2] * k} ${c2y + o[3] * k} ${ex} ${ey}`);
        p.classList.toggle('is-tangled', k > 0.35);
      });
    }
    function layout() {
      const w = board.clientWidth, n = nodes.length;
      const cols = w < 640 ? 1 : w < 860 ? 2 : 3;
      nodeW = cols === 1 ? w : Math.min(LAY.w, (w - (cols - 1) * LAY.gx) / cols);
      const free = cols === 1 ? 0 : (w - cols * nodeW) / (cols - 1);
      const rows = Math.ceil(n / cols);
      pos = nodes.map((_, i) => {
        const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c;
        return { x: c * (nodeW + free), y: r * (LAY.h + LAY.gy) };
      });
      const H = rows * LAY.h + (rows - 1) * LAY.gy;
      board.style.height = `${H}px`;
      const rand = seeded(current + cols);
      chaos = nodes.map((_, i) => cols === 1
        ? { x: 0, y: pos[i].y + (rand() - 0.5) * 16, r: (rand() - 0.5) * 3.2 }
        : { x: rand() * (w - nodeW), y: rand() * (H - LAY.h), r: (rand() - 0.5) * 16 });
      offs = nodes.map(() => [(rand() - 0.5) * 340, (rand() - 0.5) * 300, (rand() - 0.5) * 340, (rand() - 0.5) * 300]);
      nodes.forEach((nd) => { nd.style.width = `${nodeW}px`; });
      apply();
    }
    function reset() {
      nodes.forEach((nd) => nd.classList.remove('is-done', 'is-active', 'is-broken', 'is-skipped'));
      paths.forEach((p) => p.classList.remove('is-live'));
      token.setAttribute('cx', -20); token.setAttribute('cy', -20);
      log.innerHTML = ''; count.textContent = '0'; unit.textContent = 'étape';
    }
    function setMix(v) { mix = v / 100; mixInput.value = v; apply(); }
    function glide(to, ms, done) {
      const id = ++glideId;
      if (reduced() || ms === 0) { setMix(to); if (done) done(); return; }
      const from = +mixInput.value, t0 = performance.now();
      const f = (now) => {
        if (id !== glideId) return;
        const k = clamp((now - t0) / ms);
        setMix(from + (to - from) * (1 - (1 - k) ** 3));
        if (k < 1) requestAnimationFrame(f); else if (done) done();
      };
      requestAnimationFrame(f);
    }
    function load(id) {
      runId++; glideId++; current = id; lastCut = -1;
      const sc = SCENARIOS[id];
      $('[data-pitch-away]', el).textContent = nb(sc.away);
      $('[data-pitch-toward]', el).textContent = nb(sc.toward);
      clutter.innerHTML = '';
      const rand = seeded(`${id}c`);
      [...(niche() ? niche().clutter : []), ...sc.clutter].slice(0, 6).forEach((t) => {
        const c = document.createElement('span'); c.className = 'm-chip mono'; c.textContent = nb(t);
        c.style.left = `${4 + rand() * 66}%`; c.style.top = `${4 + rand() * 84}%`; c.style.setProperty('--r', `${((rand() - 0.5) * 18).toFixed(1)}deg`);
        c.style.animationDelay = `${(-rand() * 3).toFixed(2)}s`;
        clutter.append(c);
      });
      list.innerHTML = sc.steps.map((s, i) => `
        <li class="node" data-step>
          <div class="node-top mono" data-handle><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(s[0])}</span></div>
          <div class="node-face"><h3>${esc(nb(s[1]))}</h3><p class="node-man">${esc(nb(s[4]))}</p></div>
          <button type="button" class="node-cut" aria-pressed="true"><span class="sr-only">${esc(nb(s[1]))} : </span><span data-cut-label>Active</span></button>
        </li>`).join('');
      nodes = $$('[data-step]', list);
      $$('path', svg).forEach((p) => p.remove());
      paths = nodes.slice(1).map(() => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svg.insertBefore(p, token); return p; });
      nodes.forEach((nd, i) => {
        const cut = $('.node-cut', nd);
        cut.addEventListener('click', () => {
          touched = true;
          const on = cut.getAttribute('aria-pressed') !== 'true';
          cut.setAttribute('aria-pressed', String(on));
          $('[data-cut-label]', cut).textContent = on ? 'Active' : 'Coupée';
          nd.classList.toggle('is-cut', !on);
          runId++; reset(); setState('idle');
          if (on) { const others = nodes.findIndex(isCut); lastCut = others; } else lastCut = i;
          refreshStatus();
          el.classList.toggle('has-cut', lastCut >= 0);
        });
        drag(nd, i);
      });
      el.classList.remove('has-cut');
      reset(); setState('idle');
      mix = 0; mixInput.value = 0;
      layout();
      refreshStatus();
    }
    function drag(nd, i) {
      const handle = $('[data-handle]', nd);
      let st = null;
      handle.addEventListener('pointerdown', (e) => {
        if (board.clientWidth < 640 || mix < 0.99) return;
        touched = true;
        st = { x: e.clientX, y: e.clientY, ox: pos[i].x, oy: pos[i].y }; handle.setPointerCapture(e.pointerId); nd.classList.add('is-dragged');
      });
      handle.addEventListener('pointermove', (e) => {
        if (!st) return;
        pos[i] = { x: clamp(st.ox + e.clientX - st.x, 0, board.clientWidth - nodeW), y: clamp(st.oy + e.clientY - st.y, 0, board.clientHeight - LAY.h) };
        apply();
      });
      const end = () => { st = null; nd.classList.remove('is-dragged'); };
      handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    }
    const line = (html, cls) => { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = html; log.append(li); log.scrollTop = log.scrollHeight; };
    function travel(p, id) {
      return new Promise((res) => {
        const L = p.getTotalLength(), t0 = performance.now(), dur = 460;
        const f = (now) => {
          if (id !== runId) return res();
          const k = clamp((now - t0) / dur), e = 1 - (1 - k) ** 3, pt = p.getPointAtLength(L * e);
          token.setAttribute('cx', pt.x); token.setAttribute('cy', pt.y);
          if (k < 1) requestAnimationFrame(f); else res();
        };
        requestAnimationFrame(f);
      });
    }
    async function run() {
      const id = ++runId; reset(); setState('running');
      const sc = SCENARIOS[current]; let done = 0;
      status.textContent = 'La machine tourne.';
      for (let i = 0; i < nodes.length; i++) {
        if (i > 0 && !reduced()) { paths[i - 1].classList.add('is-live'); await travel(paths[i - 1], id); if (id !== runId) return; }
        const nd = nodes[i], st = sc.steps[i];
        if (isCut(nd)) {
          nd.classList.add('is-broken');
          nodes.slice(i + 1).forEach((x) => x.classList.add('is-skipped'));
          line(`✕ ${esc(nb(st[1]))} : coupée`, 'bad');
          status.textContent = consequence(i);
          token.setAttribute('cx', -20); token.setAttribute('cy', -20);
          setState('broken'); return;
        }
        nd.classList.add('is-active');
        if (!reduced()) { await wait(240); if (id !== runId) return; }
        nd.classList.remove('is-active'); nd.classList.add('is-done');
        done++; count.textContent = done; unit.textContent = done > 1 ? 'étapes' : 'étape';
        line(`✓ ${esc(nb(st[2]))}`);
      }
      token.setAttribute('cx', -20); token.setAttribute('cy', -20);
      status.textContent = nb(sc.win);
      setState('done');
    }
    $('[data-machine-run]', el).addEventListener('click', () => {
      touched = true; runId++;
      if (mix < 0.99) glide(100, 900, run); else run();
    });
    mixInput.addEventListener('input', () => {
      touched = true; glideId++; runId++;
      mix = +mixInput.value / 100; reset(); setState('idle'); apply(); refreshStatus();
    });
    const select = (i, focus) => {
      touched = true;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', tabs[i].id);
      if (focus) tabs[i].focus();
      load(ids[i]);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const m = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
        if (m !== undefined) { e.preventDefault(); select(m, true); }
      });
    });
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
    onMotion(() => { if (reduced() && el.dataset.state === 'running') { runId++; reset(); setState('idle'); refreshStatus(); } });
    load(current);
    document.addEventListener('botfx:niche', () => {
      if (el.dataset.state === 'running') return;
      const pref = niche() ? ids.indexOf(niche().scenario) : 0;
      if (pref >= 0) {
        tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === pref)); t.tabIndex = k === pref ? 0 : -1; });
        panel.setAttribute('aria-labelledby', tabs[pref].id);
        load(ids[pref]);
      } else if (mix === 0) load(current);
    });
    /* le curseur frémit une fois à l'arrivée, pour dire qu'il se tire */
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting) { io.disconnect(); if (!touched && !reduced()) glide(16, 650, () => { if (!touched) glide(0, 650); }); }
    }, { threshold: 0.4 }).observe(board);
  });

  /* ---------- votre boîte demain : le temps glisse, la journée change ---------- */
  const future = $('[data-future]');
  if (future) {
    const HOURS = ['9 h', '10 h', '11 h', '12 h', '14 h', '15 h', '16 h', '17 h'];
    const STEPS = [18, 34, 48, 60, 72, 82, 92, 100];
    const DAY = [['Trier les mails', 'Triés, résumés', 'Appeler un client'], ['Ressaisir les commandes', 'Saisies toutes seules', 'Lancer une offre'], ['Relancer les impayés', 'Relancés sans vous', 'Former l\'équipe'], ['Chercher un document', 'Retrouvé en une question', 'Prospecter'], ['Préparer les devis', 'Brouillons prêts', 'Penser la suite'], ['Mettre à jour le CRM', 'Toujours à jour', 'Déjeuner, vraiment'], ['Compiler le reporting', 'Reçu chaque lundi', 'Créer'], ['Répondre aux questions simples', 'Réponses préparées', 'Rentrer plus tôt']];
    const day = $('[data-future-day]', future), input = $('input', future), hours = $('[data-future-hours]', future), when = $('[data-future-when]', future), genius = $('[data-niche-genius]', future);
    let blocks = [];
    const paint = () => {
      const v = +input.value; let n = 0;
      blocks.forEach((b, i) => { const on = v >= STEPS[i]; b.classList.toggle('is-auto', on); if (on) n++; });
      hours.textContent = `${n} h`;
      when.textContent = v < 15 ? 'Aujourd\'hui' : v < 40 ? 'Dans 3 mois' : v < 75 ? 'Dans 6 mois' : 'Dans un an';
      future.style.setProperty('--f', v / 100);
      input.setAttribute('aria-valuetext', `${when.textContent}, ${n} heures reprises sur ${blocks.length}`);
    };
    const renderDay = () => {
      const rows = niche() ? niche().day : DAY;
      day.innerHTML = rows.map((d, i) => `<li class="fblock" data-future-block><span class="mono fh">${HOURS[i]}</span><span class="fnow">${esc(nb(d[0]))}</span><span class="fthen"><b>${esc(nb(d[2]))}</b><small class="mono">${esc(nb(d[1]))}</small></span></li>`).join('');
      blocks = $$('[data-future-block]', day);
      genius.textContent = nb(niche() ? niche().genius : GENIUS);
      paint();
    };
    document.addEventListener('botfx:niche', renderDay);
    renderDay();
    input.addEventListener('input', paint);
  }

  /* ---------- jeu : supprimer des tâches ---------- */
  const game = $('[data-game]');
  if (game) {
    const TASKS = ['Relancer une facture', 'Copier le devis', 'Ressaisir un client', 'Classer un PDF', 'Exporter le CSV', 'Renvoyer le lien', 'Mettre à jour le CRM', 'Compter les heures', 'Chercher le contrat', 'Répondre «\u00a0bien reçu\u00a0»', 'Refaire le tableau', 'Vérifier le virement', 'Trier les mails', 'Recoller les chiffres'];
    const area = $('[data-game-area]', game), menu = $('[data-game-menu]', game), result = $('[data-game-result]', game);
    const elScore = $('[data-game-score]', game), elMissed = $('[data-game-missed]', game), elTime = $('[data-game-time]', game), elBest = $('[data-game-best]', game);
    const btnStart = $('[data-game-start]', game), btnCalm = $('[data-game-calm]', game), after = $('[data-game-after]', game);
    let live = [], score = 0, missed = 0, raf = 0, last = 0, left = 0, spawnIn = 0, elapsed = 0, pilotAt = 0, playing = false, calm = false;
    const getBest = () => { try { return +localStorage.getItem('botfx-game-best') || 0; } catch (_) { return 0; } };
    const setBest = (v) => { try { localStorage.setItem('botfx-game-best', String(v)); } catch (_) {} };
    elBest.textContent = getBest();
    const syncMenu = () => { btnStart.hidden = reduced(); };
    syncMenu();
    const hud = () => { elScore.textContent = score; elMissed.textContent = missed; elTime.textContent = calm ? '∞' : Math.ceil(left); };
    const gameTasks = () => (niche() ? [...niche().day.map((d) => nb(d[0])), ...TASKS].slice(0, 14) : TASKS);
    const pick = () => { const l = gameTasks(); return l[Math.floor(Math.random() * l.length)]; };
    const clear = () => { live.forEach((t) => t.el.remove()); live = []; };
    const removeTask = (t, by = 1) => {
      live = live.filter((x) => x !== t); t.el.remove(); score += by; hud();
    };
    const burst = (t) => {
      if (reduced()) return;
      const b = document.createElement('i'); b.className = 'task-burst'; b.style.transform = `translate(${t.x}px,${t.y}px)`; area.append(b);
      setTimeout(() => b.remove(), 520);
    };
    const hit = (t) => {
      if (t.pilot) {
        const n = live.length - 1;
        live.filter((x) => x !== t).forEach((x) => { burst(x); x.el.remove(); });
        live = live.filter((x) => x === t); t.el.remove(); live = []; score += Math.max(1, n); hud();
        return;
      }
      burst(t); removeTask(t);
      if (calm && !live.length) finish();
    };
    const spawn = (label, pilot) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = pilot ? 'task task-pilot' : 'task'; el.textContent = label;
      const t = { el, pilot, x: 0, y: -50, v: 80 + Math.random() * 40 + elapsed * 3.4 };
      el.addEventListener('click', () => hit(t));
      area.append(el);
      t.x = Math.random() * Math.max(10, area.clientWidth - el.offsetWidth - 8) + 4;
      el.style.transform = `translate(${t.x}px,${t.y}px)`;
      live.push(t);
    };
    function frame(now) {
      if (!playing) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      elapsed += dt; left -= dt; spawnIn -= dt;
      if (spawnIn <= 0) { spawn(pick()); spawnIn = Math.max(0.36, 0.9 - elapsed * 0.022); }
      if (elapsed >= pilotAt) { spawn('✦ Pilote automatique', true); pilotAt += 10; }
      const floor = area.clientHeight;
      live.slice().forEach((t) => {
        t.y += t.v * dt; t.el.style.transform = `translate(${t.x}px,${t.y}px)`;
        if (t.y > floor) { live = live.filter((x) => x !== t); t.el.remove(); if (!t.pilot) missed++; }
      });
      hud();
      if (left <= 0) return finish();
      raf = requestAnimationFrame(frame);
    }
    const begin = () => {
      score = 0; missed = 0; clear(); result.textContent = ''; after.hidden = true;
      menu.hidden = true;
      /* toute la zone de chute à l'écran, score compris : le bas de la zone colle au bas de l'écran */
      scrollTo({ top: scrollY + area.getBoundingClientRect().bottom - innerHeight + 8, behavior: reduced() ? 'auto' : 'smooth' });
    };
    function startTimed() {
      begin(); calm = false; playing = true; area.classList.remove('is-calm');
      left = +game.dataset.duration || 30; elapsed = 0; spawnIn = 0; pilotAt = 10; last = performance.now();
      game.dataset.state = 'playing'; area.focus({ preventScroll: true }); hud();
      raf = requestAnimationFrame(frame);
    }
    function startCalm(keep) {
      if (!keep) begin();
      cancelAnimationFrame(raf); playing = false; calm = true; clear(); area.classList.add('is-calm');
      game.dataset.state = 'calm'; menu.hidden = true;
      gameTasks().slice(0, 12).forEach((l) => spawn(l, false));
      live.forEach((t) => { t.el.style.transform = ''; });
      hud();
    }
    function finish() {
      cancelAnimationFrame(raf); playing = false; clear(); area.classList.remove('is-calm');
      game.dataset.state = 'over'; menu.hidden = false; after.hidden = false;
      const rec = score > getBest(); if (rec) { setBest(score); elBest.textContent = score; }
      const s = score > 1 ? 's' : '';
      const end = calm ? 'Elles reviendront la semaine prochaine. Sauf si on les supprime pour de bon.' : `${missed} vous ont échappé. Dans la vraie vie, elles reviennent lundi.`;
      result.textContent = `${score} tâche${s} supprimée${s}${rec && score ? ', nouveau record' : ''}. ${end}`;
      calm = false; hud(); elTime.textContent = game.dataset.duration || 30;
    }
    btnStart.addEventListener('click', startTimed);
    btnCalm.addEventListener('click', () => startCalm(false));
    addEventListener('keydown', (e) => {
      if (!playing || (e.code !== 'Space' && e.key !== ' ')) return;
      if (e.target.closest && e.target.closest('button.task')) return;
      e.preventDefault();
      if (!live.length) return;
      hit(live.reduce((a, b) => (b.y > a.y ? b : a)));
    });
    document.addEventListener('visibilitychange', () => {
      if (!playing) return;
      if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    onMotion(() => { syncMenu(); if (playing && reduced()) { const s = score, m = missed; startCalm(true); score = s; missed = m; hud(); } });
  }

  /* ---------- calculateur ---------- */
  const calc = $('[data-calc]');
  if (calc) {
    const form = calc.closest('form');
    const WEEKS = 47, DAYS = 220;
    const val = (k) => +$(`[data-calc="${k}"]`, form).value;
    const grid = $('[data-calc-grid]', form);
    grid.innerHTML = '<i></i>'.repeat(DAYS);
    const cells = [...grid.children];
    const UNITS = { hours: ' h', people: '', cost: ' €', share: ' %' };
    const update = () => {
      const h = val('hours'), p = val('people'), c = val('cost'), s = val('share');
      $$('[data-calc-out]', form).forEach((o) => { o.textContent = `${val(o.dataset.calcOut)}${UNITS[o.dataset.calcOut].replace(' ', ' ')}`; });
      const raw = h * p * WEEKS * (s / 100);
      const hours = Math.round(raw), euros = Math.round(raw * c), days = Math.min(DAYS, Math.round(raw / 7));
      $('[data-calc-hours]', form).textContent = `${fr.format(hours)} h`;
      $('[data-calc-euros]', form).textContent = `${fr.format(euros)} €`;
      $('[data-calc-days]', form).textContent = days;
      $('[data-calc-formula]', form).textContent = `${h} h × ${p} personne${p > 1 ? 's' : ''} × ${WEEKS} semaines × ${s} % = ${fr.format(hours)} h, puis × ${c} € de l'heure. Une journée compte 7 h.`;
      cells.forEach((el, i) => el.classList.toggle('is-on', i < days));
      const metier = niche() ? `Mon activité : ${niche().label}.\n` : '';
      const body = `Bonjour François,\n\n${metier}Mon estimation sur botfx.fr : ${h} h répétitives par semaine et par personne, ${p} personne(s), ${c} € de l'heure, ${s} % automatisable, soit environ ${hours} h et ${euros} € par an.\n\nOn en parle ?\n`;
      $('[data-calc-cta]', form).href = `mailto:contact@botfx.fr?subject=${encodeURIComponent('Automatisation — mon estimation')}&body=${encodeURIComponent(body)}`;
    };
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', update);
    document.addEventListener('botfx:niche', update);
    update();
  }

  /* ---------- radiographie : mesures réelles de la page ---------- */
  const xray = $('[data-xray]');
  if (xray) {
    const measure = () => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource');
      const size = (e) => e.encodedBodySize || e.decodedBodySize || 0;
      const total = res.reduce((a, r) => a + size(r), nav ? size(nav) : 0);
      const third = new Set(res.map((r) => new URL(r.name).host).filter((h) => h !== location.host)).size;
      $('[data-xray-weight]', xray).textContent = `${fr.format(Math.max(1, Math.round(total / 1024)))} Ko`;
      $('[data-xray-requests]', xray).textContent = res.length + 1;
      $('[data-xray-third]', xray).textContent = third;
      $('[data-xray-cookies]', xray).textContent = document.cookie ? document.cookie.split(';').length : 0;
      $('[data-xray-nodes]', xray).textContent = fr.format(document.getElementsByTagName('*').length);
    };
    if (document.readyState === 'complete') measure(); else addEventListener('load', measure);
    const btn = $('[data-xray-toggle]', xray);
    btn.addEventListener('click', () => {
      const on = root.classList.toggle('xray');
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Masquer la structure' : 'Voir la structure de la page';
    });
  }

  /* ---------- téléphone : parcours guidé hors ligne ---------- */
  const phone = $('[data-phone]');
  if (phone) {
    const FLOW = [
      ['Pour qui préparez-vous ce dossier ?', ['Un nouveau client', 'Un client existant']],
      ['À quelle fréquence ?', ['Chaque semaine', 'Chaque mois', 'Une seule fois']],
      ['Quel format préférez-vous ?', ['PDF', 'Dans l\'application']],
    ];
    const screen = $('[data-phone-screen]', phone), net = $('[data-phone-net]', phone), air = $('[data-phone-offline]', phone);
    let step = 0;
    const render = () => {
      if (step >= FLOW.length) {
        screen.innerHTML = `<p class="ph-q">Dossier prêt.</p><p class="ph-note">Calculé sur l'appareil. Rien n'a quitté le téléphone.</p><button type="button" class="ph-opt" data-restart>Recommencer</button>`;
        $('[data-restart]', screen).addEventListener('click', () => { step = 0; render(); });
        return;
      }
      const [q, opts] = FLOW[step];
      screen.innerHTML = `<p class="ph-step mono">${step + 1}/${FLOW.length}</p><p class="ph-q">${q.replace(' ?', ' ?')}</p>${opts.map((o) => `<button type="button" class="ph-opt" data-choice>${o}</button>`).join('')}`;
      $$('[data-choice]', screen).forEach((b) => b.addEventListener('click', () => { step++; render(); }));
    };
    air.addEventListener('click', () => {
      const off = phone.dataset.offline !== 'true';
      phone.dataset.offline = String(off);
      air.setAttribute('aria-pressed', String(off));
      net.textContent = off ? 'Hors ligne, tout marche' : 'Connecté';
    });
    render();
  }

  /* ---------- le métier choisi réécrit les textes de la page (le HTML de base reste celui que lit Google) ---------- */
  const WORDS = {
    artisan: { client: 'vos clients', metier: 'vos chantiers', admin: 'vos devis du soir et vos papiers', x1: 'vos dossiers MaPrimeRénov\' et CEE', x2: 'vos situations de travaux', x3: 'votre attestation décennale', lieu: 'sur vos chantiers', doc: 'vos devis', outil: 'votre logiciel de devis', temps: 'être sur le chantier' },
    commerce: { client: 'vos clients', metier: 'votre boutique', admin: 'vos stocks et vos commandes', x1: 'vos retours et remboursements', x2: 'votre rapprochement de caisse', x3: 'vos fiches produit', lieu: 'en boutique', doc: 'vos commandes', outil: 'votre caisse et votre boutique en ligne', temps: 'choisir vos produits' },
    restaurant: { client: 'vos clients', metier: 'votre restaurant', admin: 'vos factures fournisseurs et vos plannings', x1: 'vos relevés HACCP', x2: 'votre food cost', x3: 'vos fiches allergènes', lieu: 'en salle', doc: 'vos réservations', outil: 'votre caisse et votre logiciel de réservation', temps: 'créer votre carte' },
    sante: { client: 'vos patients', metier: 'vos soins', admin: 'la paperasse', x1: 'vos rappels aux patients', x2: 'vos plannings de tournée', x3: 'vos contrats de remplacement', lieu: 'à domicile ou au cabinet', doc: 'vos rendez-vous', outil: 'votre agenda et votre logiciel métier', temps: 'soigner' },
    cabinet: { client: 'vos clients', metier: 'votre cabinet', admin: 'vos pièces jointes et vos relances', x1: 'la facture électronique', x2: 'vos lettres de mission', x3: 'vos échéances fiscales et sociales', lieu: 'au bureau', doc: 'vos dossiers', outil: 'votre logiciel métier', temps: 'conseiller' },
    agence: { client: 'vos clients', metier: 'votre agence', admin: 'vos validations et vos factures', x1: 'vos retours client par mail', x2: 'vos comptes rendus de réunion', x3: 'vos reportings mensuels', lieu: 'en rendez-vous', doc: 'vos propositions', outil: 'vos outils de gestion de projet', temps: 'créer' },
    formation: { client: 'vos stagiaires', metier: 'vos formations', admin: 'vos émargements et vos dossiers de financement', x1: 'vos preuves Qualiopi', x2: 'vos dossiers OPCO', x3: 'votre bilan pédagogique et financier', lieu: 'en session', doc: 'vos inscriptions', outil: 'votre plateforme de formation', temps: 'transmettre' },
    immobilier: { client: 'vos acquéreurs', metier: 'votre agence immobilière', admin: 'vos annonces et vos relances', x1: 'vos DPE à récupérer', x2: 'vos comptes rendus de visite', x3: 'la diffusion de vos annonces', lieu: 'sur le terrain', doc: 'vos mandats', outil: 'votre logiciel de transaction', temps: 'vendre' },
  };
  const COLS = (n) => `.columns .card:nth-child(${n}) p`;
  const PERSONAL = {
    '*': [['.cta-sign', 'Votre équipe passe ses journées sur {admin}. Je construis la machine. Et je reste pour l\'amélioration continue.']],
    '/': [
      ['.hero .lede', 'Je conçois, je code et je maintiens les outils qui vous libèrent de {admin}, et qui allègent {x1} : <strong>sites sur mesure</strong>, <strong>web apps et SaaS</strong>, <strong>WordPress</strong>, <strong>automatisations</strong> et <strong>IA appliquée</strong>. Vous, vous continuez à {temps}.'],
      ['#services .sec-head > p', 'Du site au SaaS, une seule personne s\'occupe de tout ce qui tourne autour de {metier}.'],
      ['#services .offers article:nth-child(1) > p:not(.num)', 'Un espace pour {client}, une application pour {metier}, un abonnement si besoin : conçus, codés, déployés et maintenus par une seule personne.'],
      ['#services .offers article:nth-child(2) > p:not(.num)', 'Un site rapide qui parle à {client} et que Google comme les IA peuvent lire sans effort.'],
      ['#services .offers article:nth-child(3) > p:not(.num)', 'Extensions sur mesure et maintenance suivie : votre site reste à jour pendant que vous êtes {lieu}.'],
      ['#services .offers article:nth-child(4) > p:not(.num)', 'Je relie {outil} au reste : moins de ressaisie autour de {x1} et de {x2}, et des relances qui partent toutes seules.'],
      ['#services .offers article:nth-child(5) > p:not(.num)', 'Trier les demandes de {client}, retrouver {x3} en une question, préparer une réponse : de l\'IA dans votre quotidien, avec des garde-fous.', { sante: 'Retrouver {x3} en une question, préparer un courrier type : de l\'IA pour votre gestion administrative, avec des garde-fous.' }],
      ['[data-circle-step]:nth-child(1) p', 'On part de votre semaine réelle {lieu}. Ce qui se répète, ce qui se perd, ce qui ne dépend que de vous.'],
      ['[data-circle-step]:nth-child(2) p', 'Pas un grand plan. Une tâche précise, autour de {x2}, branchée de bout en bout, testée, livrée vite.'],
      ['[data-circle-step]:nth-child(3) p', 'La tâche ne revient plus. Ce temps est à vous pour {temps}, chaque semaine, sans recruter.'],
      ['[data-circle-step]:nth-child(4) p', 'Ce qui concerne {client} est saisi une fois, au bon endroit, sans erreur de recopie.'],
      ['[data-circle-step]:nth-child(5) p', 'Vous voyez enfin où en sont {doc} et {x1}. L\'IA peut s\'y brancher et travailler sur du concret.', { sante: 'Vous voyez enfin où en est votre gestion. L\'IA peut se brancher sur vos documents administratifs et travailler sur du concret.' }],
      ['[data-circle-step]:nth-child(6) p', 'Le temps gagné sert à attaquer la tâche suivante, loin de {admin}. Le cercle repart, plus vite à chaque tour.'],
      ['#machine .sec-head > p', 'Voici à quoi ressemble une automatisation pour {metier}. Lancez-la, déplacez les blocs, coupez une étape et regardez ce qui se passe.'],
      ['#demain .sec-head > p', 'Le futur de votre entreprise ne commence pas par un plan à cinq ans. Il commence par moins de temps sur {admin}, puis encore moins.'],
      ['#jeu .sec-head > p', 'Elles tombent, vous cliquez. Ce sont {admin} : attrapez le pilote automatique pour tout effacer. Au clavier, la barre d\'espace supprime la plus basse.'],
      ['#calcul .sec-head > p', 'Quatre curseurs, vos chiffres, pour le temps que vous passez sur {admin} et {x2}. Rien n\'est envoyé tant que vous ne m\'écrivez pas.'],
      ['#realisations .sec-head > p', 'Trois projets récents, racontés sans nom de client. La même logique s\'applique à {metier} : ce qui compte, c\'est ce que la machine fait à votre place.'],
      ['.steps .step:nth-child(1) p:last-child', 'Un échange pour comprendre comment ça se passe {lieu} et repérer ce qui vous coûte du temps, de {x1} à {x3}.'],
      ['.steps .step:nth-child(2) p:last-child', 'Des livraisons courtes et testées autour de {doc}, que vous validez au fur et à mesure.'],
      ['.steps .step:nth-child(3) p:last-child', 'Maintenance, évolutions et documentation : vous restez maître de vos outils, et vous continuez à {temps}.'],
    ],
    '/services/': [
      ['.hero .lede', 'La personne qui écoute ce qui coince autour de {metier} est celle qui conçoit, code, déploie et maintient.'],
      ['.offers article:nth-child(1) > p:not(.num)', 'Je relie {outil} au reste pour que les données circulent seules et que vos équipes arrêtent de recopier.'],
      ['.offers article:nth-child(2) > p:not(.num)', 'Trier les demandes de {client}, retrouver une information, préparer une réponse, avec des garde-fous.', { sante: 'Retrouver une procédure, préparer un courrier type, sur vos seuls documents administratifs, avec des garde-fous.' }],
      ['.offers article:nth-child(3) > p:not(.num)', 'Une application pour {client} ou pour votre équipe {lieu}, installable sur téléphone.'],
      ['.offers article:nth-child(4) > p:not(.num)', 'Un site rapide qui parle à {client}, facile à lire pour Google comme pour les IA.'],
      ['.offers article:nth-child(5) > p:not(.num)', 'Extensions propres et maintenance suivie pendant que vous êtes {lieu}.'],
    ],
    '/services/automatisation-n8n/': [
      ['.hero .lede', 'Entre {admin} et {x1}, vos journées filent. Je relie {outil} par API et n8n pour que les données circulent seules, et que vous puissiez {temps}.'],
      [COLS(1), 'Les retards de paiement de {client} sont détectés, vérifiés et relancés au bon ton. Vous n\'êtes prévenu que s\'ils ne répondent pas.'],
      [COLS(2), 'Formulaires, dépôt de documents, relances limitées à ce qui manque et signature en ligne, pour {doc} comme pour {x2}.'],
      [COLS(3), 'Une demande de {client} devient une fiche sans doublon et une notification. Elle ne dort plus dans une boîte mail.'],
      [COLS(4), 'Vos chiffres sur {doc} et {x3} consolidés et envoyés chaque semaine, sans export ni copier-coller.'],
      [COLS(5), 'Entre {outil}, la comptabilité et la messagerie, ce qui est saisi une fois arrive partout.'],
      [COLS(6), 'Une échéance, une anomalie, un blocage sur {doc} : vous êtes prévenu avant que cela devienne un problème.'],
    ],
    '/services/creation-site-sur-mesure/': [
      ['.hero .lede', 'Un site qui parle à {client} : codé à la main, rapide, accessible, structuré pour être bien lu par Google comme par les IA.'],
      [COLS(1), 'Pas de constructeur, pas d\'extensions empilées : la page s\'affiche avant que {client} hésitent.'],
      [COLS(2), 'Structure propre, pages par service et par zone : le socle pour que {client} vous trouvent sur Google.'],
      [COLS(3), 'Contenus structurés et questions-réponses : vos pages sont faciles à lire pour ChatGPT ou Perplexity. Personne ne peut garantir d\'y être cité, mais {client} trouveront une source claire.'],
      [COLS(4), 'Navigation au clavier, contrastes, animations en pause : tous {client} peuvent vous lire.'],
      [COLS(5), 'Sans outil tiers, pas de bandeau cookies à imposer à {client}.'],
      [COLS(6), 'Simulateur, calculateur, démonstration : un site peut faire découvrir ce que vous faites pour {client} au lieu de le décrire.'],
    ],
    '/services/web-app-pwa-saas/': [
      ['.hero .lede', 'Une application pour {client} ou pour votre équipe {lieu} : installable, utilisable sans réseau, conçue, codée et maintenue par la même personne.'],
      [COLS(1), 'Une application sur l\'écran d\'accueil, sans passer par les stores, qui fonctionne même {lieu} sans réseau.'],
      [COLS(2), 'Dépôt de documents, signature, suivi : {client} avancent seuls et vous gardez la vue d\'ensemble.'],
      [COLS(3), 'Comptes, paiements récurrents, essais, factures : le produit encaisse pendant que vous êtes {lieu}.'],
      [COLS(4), 'Les règles autour de {x1} et de {x2}, transformées en parcours guidé que vos équipes suivent pas à pas.'],
      [COLS(5), 'Vous publiez vos contenus et gérez les accès de {client} sans dépendre d\'un développeur.'],
      [COLS(6), 'Audit, limitation des abus, données minimales : ce qui n\'est pas collecté sur {client} ne peut pas fuiter.'],
    ],
    '/services/wordpress-plugins-maintenance/': [
      ['.hero .lede', 'Votre site reste à jour et en sécurité pendant que vous êtes {lieu}. Extensions sur mesure, maintenance suivie, compte rendu lisible.'],
      [COLS(1), 'Une fonction précise autour de {doc}, codée proprement, à la place de trois extensions qui se marchent dessus.'],
      [COLS(2), 'Les formulaires remplis par {client} arrivent directement dans {outil}.'],
      [COLS(3), 'Sauvegarde avant chaque opération, contrôle des pages où passent {client}, retour arrière possible.'],
      [COLS(4), 'Comptes, droits, extensions abandonnées : on ferme les portes avant qu\'on les force, pendant que vous êtes {lieu}.'],
      [COLS(5), 'Cache, images, extensions inutiles : un site plus léger pour {client}.'],
      [COLS(6), 'Balises, données structurées, pages orphelines : surveillées dans le temps pour que {client} vous trouvent.'],
    ],
    '/services/ia-agents-entreprise/': [
      ['.hero .lede', 'Une IA branchée sur {metier}, avec des garde-fous : elle retrouve {x3}, prépare {x2}, et vous décidez.', { sante: 'Une IA branchée sur vos documents administratifs, avec des garde-fous : elle retrouve {x3}, prépare vos courriers types, et vous décidez.' }],
      [COLS(1), 'Vos documents sur {doc} et {x1} interrogés en langage naturel, avec la source citée à chaque réponse.', { sante: 'Vos procédures et documents internes interrogés en langage naturel, avec la source citée à chaque réponse.' }],
      [COLS(2), 'Les messages de {client} sont classés, résumés et routés avec un brouillon de réponse.', { sante: 'Les messages administratifs, fournisseurs, comptable, assurances, sont classés, résumés et routés avec un brouillon de réponse.' }],
      [COLS(3), 'Factures et formulaires liés à {doc} : les données utiles sont lues et saisies au bon endroit.', { sante: 'Factures fournisseurs et documents administratifs : les données utiles sont lues et saisies au bon endroit.' }],
      [COLS(4), 'Une suite d\'actions confiée à l\'IA autour de {doc}, dans un périmètre strict, avec validation humaine.', { sante: 'Une suite d\'actions confiée à l\'IA autour de votre gestion administrative, dans un périmètre strict, avec validation humaine.' }],
      [COLS(5), 'Réponses à {client}, comptes rendus, courriers types : dans votre ton et à partir de vos contenus.', { sante: 'Courriers types, notes internes, modèles de documents : dans votre ton et à partir de vos contenus.' }],
      [COLS(6), 'Une question, une réponse tirée de vos données, sans ouvrir {outil} pour la trouver.', { sante: 'Une question, une réponse tirée de vos procédures, sans fouiller dans vos dossiers.' }],
    ],
    '/realisations/automatisation-cabinet-de-paie/': [['.sec-head > p', 'Scénario simplifié, avec des données fictives. Transposez-le à {metier} : coupez une étape pour voir ce qu\'elle vous éviterait sur {x1}.']],
    '/realisations/application-pwa-infirmiers-liberaux/': [['.phone-grid .lede', 'Une PWA n\'a pas besoin de connexion pour rester utile, même {lieu}. Passez en mode avion, répondez aux questions : le résultat se calcule sur l\'appareil.']],
    '/realisations/automatisation-agence-web/': [['.sec-head > p', 'Scénarios simplifiés, avec des données fictives. Imaginez-les pour {metier} : glissez de l\'avant à l\'après, puis coupez une étape pour voir ce qu\'elle vous éviterait sur {x2}.']],
    '/realisations/': [['.hero .lede', 'Ces projets sont racontés sans nom de client. La même logique vaut pour {metier} : quelle tâche disparaît, et comment.']],
    '/developpeur-web-dax-landes/': [['.hero .lede', 'Basé à Saint-Paul-lès-Dax, je construis les outils numériques qui libèrent les pros comme vous de {admin}, et qui allègent {x1}, dans les Landes et partout en France.']],
  };
  const personalTargets = [...PERSONAL['*'], ...(PERSONAL[location.pathname] || [])]
    .map(([sel, tpl, only]) => ({ sel, tpl, only, el: $(sel) }));
  /* la phrase de fin n'existe pas sur toutes les pages : on ne garde que les cibles présentes, sauf celles propres à la page */
  const pageSpecific = new Set((PERSONAL[location.pathname] || []).map(([sel]) => sel));
  root.dataset.personalMissing = personalTargets.filter((t) => !t.el && pageSpecific.has(t.sel)).map((t) => t.sel).join(' | ');
  const livePersonal = personalTargets.filter((t) => t.el);
  root.dataset.personalTargets = livePersonal.length;
  livePersonal.forEach((t) => { t.base = t.el.innerHTML; });
  const renderPersonal = () => livePersonal.forEach((t) => {
    t.el.innerHTML = nicheKey ? nb(((t.only && t.only[nicheKey]) || t.tpl).replace(/\{(\w+)\}/g, (_, k) => WORDS[nicheKey][k])) : t.base;
  });

  /* ---------- sélecteurs d'activité (hero + journée) et cockpit ---------- */
  const selects = $$('[data-niche-select]');
  selects.forEach((sel) => {
    sel.insertAdjacentHTML('beforeend', Object.entries(NICHES).map(([k, n]) => `<option value="${k}">${n.label}</option>`).join(''));
    sel.addEventListener('change', () => setNiche(sel.value));
  });
  $$('[data-niche-chips]').forEach((box) => {
    box.innerHTML = Object.entries(NICHES).map(([k, n]) => `<button type="button" class="chip" data-niche="${k}" aria-pressed="false">${n.label}</button>`).join('');
    $$('[data-niche]', box).forEach((b) => b.addEventListener('click', () => setNiche(b.dataset.niche === nicheKey ? '' : b.dataset.niche)));
  });
  /* tâches du cockpit : selon la page en cours et le secteur choisi */
  const TASKS_BY_TOPIC = {
    automatisation: {
      generic: ['Facture relancée', 'Devis signé, dossier créé', 'Pièce manquante réclamée', 'Rapport du lundi envoyé'],
      artisan: ['Devis relancé', 'Acompte encaissé', 'Heures remontées', 'Papiers envoyés au comptable'],
      commerce: ['Commande saisie', 'Stock synchronisé', 'Colis suivi', 'Panier abandonné relancé'],
      restaurant: ['Facture fournisseur classée', 'Planning envoyé', 'Réservation confirmée', 'Heures transmises au comptable'],
      sante: ['Rendez-vous confirmé', 'Impayé relancé', 'Document renvoyé', 'Comptabilité classée'],
      cabinet: ['Pièce manquante réclamée', 'Lettre de mission signée', 'Honoraires relancés', 'Dossier classé'],
      agence: ['Validation relancée', 'Facture partie', 'Heures comptées', 'Reporting livré'],
      formation: ['Inscription saisie', 'Convocation envoyée', 'Émargement signé', 'Paiement relancé'],
      immobilier: ['Annonce diffusée', 'Pièce réclamée', 'Compte rendu envoyé', 'Fiche client à jour'],
    },
    site: {
      generic: ['Page chargée en un éclair', 'Demande de contact reçue', 'Page indexée par Google', 'Site accessible à tous'],
      artisan: ['Réalisations en ligne', 'Demande de devis reçue', 'Page par ville publiée', 'Avis mis en avant'],
      commerce: ['Vitrine mise à jour', 'Horaires à jour partout', 'Promotion publiée', 'Fiche produit indexée'],
      restaurant: ['Carte en ligne', 'Réservation depuis le site', 'Horaires à jour partout', 'Menu du jour publié'],
      sante: ['Prise de rendez-vous en ligne', 'Horaires à jour', 'Infos pratiques publiées', 'Site accessible à tous'],
      cabinet: ['Expertise expliquée', 'Prise de contact qualifiée', 'FAQ métier publiée', 'Page par service indexée'],
      agence: ['Portfolio en ligne', 'Étude de cas publiée', 'Demande qualifiée', 'Page offre indexée'],
      formation: ['Programme en ligne', 'Dates à jour', 'Préinscription reçue', 'Page formation indexée'],
      immobilier: ['Annonces à jour', 'Estimation demandée', 'Page quartier publiée', 'Contact qualifié'],
    },
    webapp: {
      generic: ['Application installée', 'Ouverte sans réseau', 'Document déposé', 'Abonnement encaissé'],
      artisan: ['Devis signé sur le chantier', 'Photos de chantier rangées', 'Planning des équipes à jour', 'Facture envoyée du téléphone'],
      commerce: ['Commande suivie par le client', 'Stock consulté en rayon', 'Retour lancé par le client', 'Points de fidélité à jour'],
      restaurant: ['Planning consulté par l\'équipe', 'Stock saisi en cuisine', 'Réservation gérée au téléphone', 'Fiche technique ouverte'],
      sante: ['Tournée préparée', 'Fiche ouverte sans réseau', 'Document retrouvé', 'Rendez-vous ajouté'],
      cabinet: ['Espace client ouvert', 'Document déposé par le client', 'Signature en ligne', 'Dossier suivi par le client'],
      agence: ['Espace client ouvert', 'Validation en un clic', 'Livrable déposé', 'Abonnement encaissé'],
      formation: ['Accès ouvert par QR code', 'Support consulté sans réseau', 'Émargement signé sur mobile', 'Abonnement activé'],
      immobilier: ['Bon de visite signé sur mobile', 'Dossier acquéreur déposé', 'Suivi de vente partagé', 'Compte rendu dicté'],
    },
    wordpress: {
      generic: ['Site sauvegardé', 'Extensions à jour', 'Pages clés testées', 'Rapport envoyé'],
      artisan: ['Site sauvegardé', 'Formulaire de devis testé', 'Extensions à jour', 'Rapport envoyé'],
      commerce: ['Boutique sauvegardée', 'Panier testé', 'Paiement vérifié', 'Rapport envoyé'],
      restaurant: ['Site sauvegardé', 'Réservation testée', 'Carte vérifiée', 'Rapport envoyé'],
      sante: ['Site sauvegardé', 'Prise de rendez-vous testée', 'Failles corrigées', 'Rapport envoyé'],
      cabinet: ['Site sauvegardé', 'Formulaire de contact testé', 'Failles corrigées', 'Rapport envoyé'],
      agence: ['Sites clients sauvegardés', 'Extensions à jour', 'Pages clés testées', 'Rapport client envoyé'],
      formation: ['Site sauvegardé', 'Inscription testée', 'Calendrier vérifié', 'Rapport envoyé'],
      immobilier: ['Site sauvegardé', 'Annonces vérifiées', 'Formulaire de contact testé', 'Rapport envoyé'],
    },
    ia: {
      generic: ['Mail résumé', 'Information retrouvée', 'Source citée', 'Doute transmis à un humain'],
      artisan: ['Mail de chantier trié', 'Bon de commande lu', 'Réponse client préparée', 'Norme retrouvée'],
      commerce: ['Question client triée', 'Facture fournisseur lue', 'Fiche produit rédigée', 'Avis résumé'],
      restaurant: ['Réponse à un avis préparée', 'Facture fournisseur lue', 'Allergènes retrouvés', 'Demande de groupe triée'],
      sante: ['Mail administratif trié', 'Procédure retrouvée', 'Courrier type préparé', 'Note interne résumée'],
      cabinet: ['Mail client résumé', 'Clause retrouvée', 'Pièce lue et classée', 'Réponse préparée'],
      agence: ['Brief résumé', 'Compte rendu rédigé', 'Demande triée', 'Proposition préparée'],
      formation: ['Demande d\'inscription triée', 'Évaluations résumées', 'Programme retrouvé', 'Réponse préparée'],
      immobilier: ['Demande d\'acquéreur triée', 'Annonce rédigée', 'Diagnostic retrouvé', 'Réponse préparée'],
    },
  };
  const PAGE_TOPIC = [['/services/creation-site', 'site'], ['/services/web-app', 'webapp'], ['/realisations/application-pwa', 'webapp'], ['/services/wordpress', 'wordpress'], ['/services/ia-', 'ia'], ['/services/', 'automatisation'], ['/realisations/', 'automatisation'], ['/developpeur-web', 'automatisation']];
  const pageTopic = (PAGE_TOPIC.find(([prefix]) => location.pathname.startsWith(prefix)) || [])[1];
  const PAGE_TASKS = pageTopic ? TASKS_BY_TOPIC[pageTopic] : null;
  const tickerLines = $$('[data-ticker] li');
  const tickerBase = tickerLines.map((l) => l.lastChild.textContent);
  const syncNiche = () => {
    selects.forEach((s) => { s.value = nicheKey; });
    $$('[data-niche]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.niche === nicheKey)));
    const rows = PAGE_TASKS ? (PAGE_TASKS[nicheKey] || PAGE_TASKS.generic) : (niche() ? niche().ticker : tickerBase);
    tickerLines.forEach((l, i) => { l.lastChild.textContent = nb(rows[i]); });
  };
  /* les e-mails de contact annoncent l'activité, y compris en bas de chaque page */
  const mailLinks = $$('a[href^="mailto:contact@botfx.fr?subject"]').filter((a) => !a.hasAttribute('data-calc-cta'));
  mailLinks.forEach((a) => { a.dataset.baseHref = a.getAttribute('href'); });
  const renderMails = () => mailLinks.forEach((a) => {
    a.href = niche() ? `${a.dataset.baseHref}&body=${encodeURIComponent(`Bonjour François,\n\nMon activité : ${niche().label}.\n\n`)}` : a.dataset.baseHref;
  });
  document.addEventListener('botfx:niche', syncNiche);
  document.addEventListener('botfx:niche', renderMails);
  document.addEventListener('botfx:niche', renderPersonal);
  renderMails();
  if (nicheKey) document.dispatchEvent(new CustomEvent('botfx:niche')); else syncNiche();
})();
