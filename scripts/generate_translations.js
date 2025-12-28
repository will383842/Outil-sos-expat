const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../sos/src/helper');
const missingKeysPath = path.join(__dirname, '../missing_keys_analysis.json');

// Charger les données
const missingKeys = JSON.parse(fs.readFileSync(missingKeysPath, 'utf-8'));

// Dictionnaire de traductions pour les termes courants
const commonTranslations = {
  // German (de)
  de: {
    'Titre': 'Titel', 'title': 'Titel', 'Title': 'Titel',
    'Messages': 'Nachrichten', 'messages': 'Nachrichten',
    'Contact': 'Kontakt', 'contact': 'Kontakt',
    'Reçu le': 'Empfangen am', 'Received on': 'Empfangen am',
    'Lu': 'Gelesen', 'Read': 'Gelesen',
    'Marquer comme lu': 'Als gelesen markieren', 'Mark as read': 'Als gelesen markieren',
    'Réponse envoyée': 'Antwort gesendet', 'Reply sent': 'Antwort gesendet',
    'Répondu le': 'Beantwortet am', 'Replied on': 'Beantwortet am',
    'Votre réponse...': 'Ihre Antwort...', 'Your reply...': 'Ihre Antwort...',
    'Erreur': 'Fehler', 'Error': 'Fehler', 'error': 'Fehler',
    'Envoyer': 'Senden', 'Send': 'Senden', 'send': 'Senden',
    'par': 'von', 'by': 'von',
    'Assistant IA': 'KI-Assistent', 'AI Assistant': 'KI-Assistent',
    'Outil': 'Werkzeug', 'Tool': 'Werkzeug',
    'Accéder': 'Zugreifen', 'Access': 'Zugriff',
    'Fonctionnalités': 'Funktionen', 'Features': 'Funktionen',
    'Conversations': 'Gespräche', 'conversations': 'Gespräche',
    'récentes': 'neueste', 'recent': 'neueste',
    'Aucune': 'Keine', 'No': 'Keine', 'None': 'Keine',
    'description': 'Beschreibung',
    'Chargement': 'Laden', 'Loading': 'Laden',
    'Devise': 'Währung', 'Currency': 'Währung',
    'Frais': 'Gebühren', 'Fees': 'Gebühren',
    'Euro': 'Euro', 'EUR': 'EUR',
    'Dollar': 'Dollar', 'USD': 'USD',
    'Paiement': 'Zahlung', 'Payment': 'Zahlung',
    'Vérification': 'Verifizierung', 'Verification': 'Verifizierung',
    'vérifié': 'verifiziert', 'verified': 'verifiziert',
    'Note': 'Hinweis', 'note': 'Hinweis',
    'Sélectionner': 'Auswählen', 'Select': 'Auswählen',
    'Expert': 'Experte', 'expert': 'Experte',
    'Accueil': 'Startseite', 'Home': 'Startseite',
    'Retour': 'Zurück', 'Back': 'Zurück',
    'Effacer': 'Löschen', 'Clear': 'Löschen',
    'cache': 'Cache',
    'Erreur d\'accès': 'Zugriffsfehler', 'Access error': 'Zugriffsfehler',
    'Accès refusé': 'Zugriff verweigert', 'Access denied': 'Zugriff verweigert',
    'Durée': 'Dauer', 'Duration': 'Dauer',
    'Annuler': 'Abbrechen', 'Cancel': 'Abbrechen',
    'Confirmer': 'Bestätigen', 'Confirm': 'Bestätigen',
    'mobile': 'Mobil',
    'Tableau de bord': 'Dashboard', 'Dashboard': 'Dashboard',
    'Statistiques': 'Statistiken', 'Statistics': 'Statistiken', 'Stats': 'Statistiken',
    'Pays': 'Land', 'Country': 'Land', 'country': 'Land', 'Countries': 'Länder',
    'Avocat': 'Anwalt', 'Lawyer': 'Anwalt', 'lawyers': 'Anwälte', 'Lawyers': 'Anwälte',
    'Expatrié': 'Expat', 'Expat': 'Expat', 'expats': 'Expats', 'Expats': 'Expats',
    'Client': 'Kunde', 'client': 'Kunde', 'Clients': 'Kunden',
    'Paiements': 'Zahlungen', 'Payments': 'Zahlungen', 'payments': 'Zahlungen',
    'Factures': 'Rechnungen', 'Invoices': 'Rechnungen', 'invoices': 'Rechnungen',
    'Rechercher': 'Suchen', 'Search': 'Suchen', 'search': 'Suchen',
    'Filtrer': 'Filtern', 'Filter': 'Filtern', 'filter': 'Filtern',
    'Exporter': 'Exportieren', 'Export': 'Exportieren',
    'Télécharger': 'Herunterladen', 'Download': 'Herunterladen',
    'Modifier': 'Bearbeiten', 'Edit': 'Bearbeiten',
    'Supprimer': 'Löschen', 'Delete': 'Löschen',
    'Ajouter': 'Hinzufügen', 'Add': 'Hinzufügen',
    'Créer': 'Erstellen', 'Create': 'Erstellen',
    'Sauvegarder': 'Speichern', 'Save': 'Speichern',
    'Total': 'Gesamt', 'total': 'Gesamt',
    'Montant': 'Betrag', 'Amount': 'Betrag', 'amount': 'Betrag',
    'Date': 'Datum', 'date': 'Datum',
    'Statut': 'Status', 'Status': 'Status', 'status': 'Status',
    'Actions': 'Aktionen', 'actions': 'Aktionen',
    'Détails': 'Details', 'Details': 'Details', 'details': 'Details',
    'Voir': 'Ansehen', 'View': 'Ansehen', 'view': 'Ansehen',
    'Profil': 'Profil', 'Profile': 'Profil', 'profile': 'Profil',
    'Nom': 'Name', 'Name': 'Name', 'name': 'Name',
    'Email': 'E-Mail', 'email': 'E-Mail',
    'Téléphone': 'Telefon', 'Phone': 'Telefon', 'phone': 'Telefon',
    'Adresse': 'Adresse', 'Address': 'Adresse', 'address': 'Adresse',
    'Langue': 'Sprache', 'Language': 'Sprache', 'language': 'Sprache',
    'Langues': 'Sprachen', 'Languages': 'Sprachen',
    'Nationalité': 'Staatsangehörigkeit', 'Nationality': 'Staatsangehörigkeit',
    'Spécialité': 'Fachgebiet', 'Specialty': 'Fachgebiet', 'specialties': 'Fachgebiete',
    'Expérience': 'Erfahrung', 'Experience': 'Erfahrung', 'experience': 'Erfahrung',
    'Note moyenne': 'Durchschnittsbewertung', 'Average rating': 'Durchschnittsbewertung',
    'Avis': 'Bewertungen', 'Reviews': 'Bewertungen', 'reviews': 'Bewertungen',
    'Appel': 'Anruf', 'Call': 'Anruf', 'call': 'Anruf',
    'Appels': 'Anrufe', 'Calls': 'Anrufe', 'calls': 'Anrufe',
    'Réservation': 'Buchung', 'Booking': 'Buchung', 'booking': 'Buchung',
    'Réservations': 'Buchungen', 'Bookings': 'Buchungen',
    'Actif': 'Aktiv', 'Active': 'Aktiv', 'active': 'Aktiv',
    'Archivé': 'Archiviert', 'Archived': 'Archiviert', 'archived': 'Archiviert',
    'Expiré': 'Abgelaufen', 'Expired': 'Abgelaufen', 'expired': 'Abgelaufen',
    'En attente': 'Ausstehend', 'Pending': 'Ausstehend', 'pending': 'Ausstehend',
    'Approuvé': 'Genehmigt', 'Approved': 'Genehmigt', 'approved': 'Genehmigt',
    'Rejeté': 'Abgelehnt', 'Rejected': 'Abgelehnt', 'rejected': 'Abgelehnt',
    'Vérifié': 'Verifiziert', 'Verified': 'Verifiziert',
    'Non vérifié': 'Nicht verifiziert', 'Not verified': 'Nicht verifiziert',
    'Commission': 'Provision', 'commission': 'Provision',
    'Revenus': 'Einnahmen', 'Revenue': 'Einnahmen', 'revenue': 'Einnahmen',
    'Graphique': 'Diagramm', 'Chart': 'Diagramm', 'chart': 'Diagramm',
    'Période': 'Zeitraum', 'Period': 'Zeitraum', 'period': 'Zeitraum',
    'Jour': 'Tag', 'Day': 'Tag', 'day': 'Tag',
    'Semaine': 'Woche', 'Week': 'Woche', 'week': 'Woche',
    'Mois': 'Monat', 'Month': 'Monat', 'month': 'Monat',
    'Année': 'Jahr', 'Year': 'Jahr', 'year': 'Jahr',
    'Aujourd\'hui': 'Heute', 'Today': 'Heute',
    'Hier': 'Gestern', 'Yesterday': 'Gestern',
    'Cette semaine': 'Diese Woche', 'This week': 'Diese Woche',
    'Ce mois': 'Dieser Monat', 'This month': 'Dieser Monat',
    'Erreurs': 'Fehler', 'Errors': 'Fehler',
    'Journal': 'Protokoll', 'Log': 'Protokoll', 'Logs': 'Protokolle',
    'B2B': 'B2B',
    'Entreprise': 'Unternehmen', 'Business': 'Unternehmen', 'Company': 'Unternehmen',
    'Abonnement': 'Abonnement', 'Subscription': 'Abonnement',
    'Plan': 'Plan', 'plan': 'Plan',
    'Prix': 'Preis', 'Price': 'Preis', 'price': 'Preis',
    'Tarif': 'Tarif', 'Rate': 'Tarif',
    'Gratuit': 'Kostenlos', 'Free': 'Kostenlos',
    'Premium': 'Premium',
    'Pro': 'Pro',
    'minutes': 'Minuten', 'min': 'Min',
    'heures': 'Stunden', 'hours': 'Stunden',
    'jours': 'Tage', 'days': 'Tage',
    'il y a': 'vor', 'ago': 'vor',
    'depuis': 'seit', 'since': 'seit',
    'Succès': 'Erfolg', 'Success': 'Erfolg',
    'Échec': 'Fehlgeschlagen', 'Failed': 'Fehlgeschlagen',
    'Attention': 'Achtung', 'Warning': 'Warnung',
    'Information': 'Information', 'Info': 'Info',
    'Oui': 'Ja', 'Yes': 'Ja',
    'Non': 'Nein', 'No': 'Nein',
    'Fermer': 'Schließen', 'Close': 'Schließen',
    'Ouvrir': 'Öffnen', 'Open': 'Öffnen',
    'Répondre': 'Antworten', 'Reply': 'Antworten',
    'Mettre à jour': 'Aktualisieren', 'Update': 'Aktualisieren',
    'Actualiser': 'Aktualisieren', 'Refresh': 'Aktualisieren'
  },
  // Spanish (es)
  es: {
    'Messages de contact': 'Mensajes de contacto', 'Contact Messages': 'Mensajes de contacto',
    'Reçu le': 'Recibido el', 'Received on': 'Recibido el',
    'Lu': 'Leído', 'Read': 'Leído',
    'Marquer comme lu': 'Marcar como leído', 'Mark as read': 'Marcar como leído',
    'Réponse envoyée': 'Respuesta enviada', 'Reply sent': 'Respuesta enviada',
    'Répondu le': 'Respondido el', 'Replied on': 'Respondido el',
    'Votre réponse...': 'Su respuesta...', 'Your reply...': 'Su respuesta...',
    'Erreur d\'envoi': 'Error de envío', 'Send error': 'Error de envío',
    'par': 'por', 'by': 'por',
    'Assistant IA': 'Asistente IA', 'AI Assistant': 'Asistente IA',
    'Outil IA': 'Herramienta IA', 'AI Tool': 'Herramienta IA',
    'Accéder à l\'Outil IA': 'Acceder a la Herramienta IA', 'Access AI Tool': 'Acceder a la Herramienta IA',
    'Fonctionnalités': 'Funcionalidades', 'Features': 'Funcionalidades',
    'Conversations récentes': 'Conversaciones recientes', 'Recent conversations': 'Conversaciones recientes',
    'Aucune conversation': 'Sin conversaciones', 'No conversations': 'Sin conversaciones',
    'Chargement': 'Cargando', 'Loading': 'Cargando',
    'Devise': 'Moneda', 'Currency': 'Moneda',
    'Frais': 'Cargos', 'Fees': 'Cargos',
    'Paiement': 'Pago', 'Payment': 'Pago',
    'Vérification': 'Verificación', 'Verification': 'Verificación',
    'vérifié': 'verificado', 'verified': 'verificado',
    'Sélectionner': 'Seleccionar', 'Select': 'Seleccionar',
    'Expert': 'Experto', 'expert': 'experto',
    'Accueil': 'Inicio', 'Home': 'Inicio',
    'Retour': 'Volver', 'Back': 'Volver',
    'Effacer': 'Borrar', 'Clear': 'Borrar',
    'Erreur d\'accès': 'Error de acceso', 'Access error': 'Error de acceso',
    'Accès refusé': 'Acceso denegado', 'Access denied': 'Acceso denegado',
    'Durée': 'Duración', 'Duration': 'Duración',
    'Annuler': 'Cancelar', 'Cancel': 'Cancelar',
    'Confirmer': 'Confirmar', 'Confirm': 'Confirmar',
    'Tableau de bord': 'Panel de control', 'Dashboard': 'Panel de control',
    'Statistiques': 'Estadísticas', 'Statistics': 'Estadísticas',
    'Pays': 'País', 'Country': 'País', 'Countries': 'Países',
    'Avocat': 'Abogado', 'Lawyer': 'Abogado', 'Lawyers': 'Abogados',
    'Expatrié': 'Expatriado', 'Expat': 'Expatriado', 'Expats': 'Expatriados',
    'Client': 'Cliente', 'Clients': 'Clientes',
    'Paiements': 'Pagos', 'Payments': 'Pagos',
    'Factures': 'Facturas', 'Invoices': 'Facturas',
    'Rechercher': 'Buscar', 'Search': 'Buscar',
    'Filtrer': 'Filtrar', 'Filter': 'Filtrar',
    'Exporter': 'Exportar', 'Export': 'Exportar',
    'Télécharger': 'Descargar', 'Download': 'Descargar',
    'Modifier': 'Editar', 'Edit': 'Editar',
    'Supprimer': 'Eliminar', 'Delete': 'Eliminar',
    'Ajouter': 'Añadir', 'Add': 'Añadir',
    'Créer': 'Crear', 'Create': 'Crear',
    'Sauvegarder': 'Guardar', 'Save': 'Guardar',
    'Total': 'Total',
    'Montant': 'Monto', 'Amount': 'Monto',
    'Date': 'Fecha',
    'Statut': 'Estado', 'Status': 'Estado',
    'Actions': 'Acciones',
    'Détails': 'Detalles', 'Details': 'Detalles',
    'Voir': 'Ver', 'View': 'Ver',
    'Profil': 'Perfil', 'Profile': 'Perfil',
    'Nom': 'Nombre', 'Name': 'Nombre',
    'Email': 'Correo electrónico',
    'Téléphone': 'Teléfono', 'Phone': 'Teléfono',
    'Adresse': 'Dirección', 'Address': 'Dirección',
    'Langue': 'Idioma', 'Language': 'Idioma',
    'Langues': 'Idiomas', 'Languages': 'Idiomas',
    'Nationalité': 'Nacionalidad', 'Nationality': 'Nacionalidad',
    'Spécialité': 'Especialidad', 'Specialty': 'Especialidad',
    'Expérience': 'Experiencia', 'Experience': 'Experiencia',
    'Note moyenne': 'Calificación promedio', 'Average rating': 'Calificación promedio',
    'Avis': 'Reseñas', 'Reviews': 'Reseñas',
    'Appel': 'Llamada', 'Call': 'Llamada',
    'Appels': 'Llamadas', 'Calls': 'Llamadas',
    'Réservation': 'Reserva', 'Booking': 'Reserva',
    'Réservations': 'Reservas', 'Bookings': 'Reservas',
    'Actif': 'Activo', 'Active': 'Activo',
    'Archivé': 'Archivado', 'Archived': 'Archivado',
    'Expiré': 'Expirado', 'Expired': 'Expirado',
    'En attente': 'Pendiente', 'Pending': 'Pendiente',
    'Approuvé': 'Aprobado', 'Approved': 'Aprobado',
    'Rejeté': 'Rechazado', 'Rejected': 'Rechazado',
    'Vérifié': 'Verificado', 'Verified': 'Verificado',
    'Non vérifié': 'No verificado', 'Not verified': 'No verificado',
    'Commission': 'Comisión',
    'Revenus': 'Ingresos', 'Revenue': 'Ingresos',
    'Graphique': 'Gráfico', 'Chart': 'Gráfico',
    'Période': 'Período', 'Period': 'Período',
    'Jour': 'Día', 'Day': 'Día',
    'Semaine': 'Semana', 'Week': 'Semana',
    'Mois': 'Mes', 'Month': 'Mes',
    'Année': 'Año', 'Year': 'Año',
    'Aujourd\'hui': 'Hoy', 'Today': 'Hoy',
    'Hier': 'Ayer', 'Yesterday': 'Ayer',
    'Cette semaine': 'Esta semana', 'This week': 'Esta semana',
    'Ce mois': 'Este mes', 'This month': 'Este mes',
    'Erreurs': 'Errores', 'Errors': 'Errores',
    'Journal': 'Registro', 'Log': 'Registro', 'Logs': 'Registros',
    'Entreprise': 'Empresa', 'Business': 'Empresa', 'Company': 'Empresa',
    'Abonnement': 'Suscripción', 'Subscription': 'Suscripción',
    'Prix': 'Precio', 'Price': 'Precio',
    'Tarif': 'Tarifa', 'Rate': 'Tarifa',
    'Gratuit': 'Gratis', 'Free': 'Gratis',
    'minutes': 'minutos',
    'heures': 'horas', 'hours': 'horas',
    'jours': 'días', 'days': 'días',
    'il y a': 'hace', 'ago': 'hace',
    'depuis': 'desde', 'since': 'desde',
    'Succès': 'Éxito', 'Success': 'Éxito',
    'Échec': 'Fallido', 'Failed': 'Fallido',
    'Attention': 'Atención', 'Warning': 'Advertencia',
    'Oui': 'Sí', 'Yes': 'Sí',
    'Non': 'No', 'No': 'No',
    'Fermer': 'Cerrar', 'Close': 'Cerrar',
    'Ouvrir': 'Abrir', 'Open': 'Abrir',
    'Répondre': 'Responder', 'Reply': 'Responder',
    'Mettre à jour': 'Actualizar', 'Update': 'Actualizar',
    'Actualiser': 'Actualizar', 'Refresh': 'Actualizar'
  },
  // Portuguese (pt)
  pt: {
    'Messages de contact': 'Mensagens de contato', 'Contact Messages': 'Mensagens de contato',
    'Reçu le': 'Recebido em', 'Received on': 'Recebido em',
    'Lu': 'Lido', 'Read': 'Lido',
    'Marquer comme lu': 'Marcar como lido', 'Mark as read': 'Marcar como lido',
    'Réponse envoyée': 'Resposta enviada', 'Reply sent': 'Resposta enviada',
    'Répondu le': 'Respondido em', 'Replied on': 'Respondido em',
    'Votre réponse...': 'Sua resposta...', 'Your reply...': 'Sua resposta...',
    'Erreur d\'envoi': 'Erro de envio', 'Send error': 'Erro de envio',
    'par': 'por', 'by': 'por',
    'Assistant IA': 'Assistente IA', 'AI Assistant': 'Assistente IA',
    'Outil IA': 'Ferramenta IA', 'AI Tool': 'Ferramenta IA',
    'Accéder à l\'Outil IA': 'Acessar Ferramenta IA', 'Access AI Tool': 'Acessar Ferramenta IA',
    'Fonctionnalités': 'Funcionalidades', 'Features': 'Funcionalidades',
    'Conversations récentes': 'Conversas recentes', 'Recent conversations': 'Conversas recentes',
    'Aucune conversation': 'Nenhuma conversa', 'No conversations': 'Nenhuma conversa',
    'Chargement': 'Carregando', 'Loading': 'Carregando',
    'Devise': 'Moeda', 'Currency': 'Moeda',
    'Frais': 'Taxas', 'Fees': 'Taxas',
    'Paiement': 'Pagamento', 'Payment': 'Pagamento',
    'Vérification': 'Verificação', 'Verification': 'Verificação',
    'vérifié': 'verificado', 'verified': 'verificado',
    'Sélectionner': 'Selecionar', 'Select': 'Selecionar',
    'Expert': 'Especialista', 'expert': 'especialista',
    'Accueil': 'Início', 'Home': 'Início',
    'Retour': 'Voltar', 'Back': 'Voltar',
    'Effacer': 'Limpar', 'Clear': 'Limpar',
    'Erreur d\'accès': 'Erro de acesso', 'Access error': 'Erro de acesso',
    'Accès refusé': 'Acesso negado', 'Access denied': 'Acesso negado',
    'Durée': 'Duração', 'Duration': 'Duração',
    'Annuler': 'Cancelar', 'Cancel': 'Cancelar',
    'Confirmer': 'Confirmar', 'Confirm': 'Confirmar',
    'Tableau de bord': 'Painel', 'Dashboard': 'Painel',
    'Statistiques': 'Estatísticas', 'Statistics': 'Estatísticas',
    'Pays': 'País', 'Country': 'País', 'Countries': 'Países',
    'Avocat': 'Advogado', 'Lawyer': 'Advogado', 'Lawyers': 'Advogados',
    'Expatrié': 'Expatriado', 'Expat': 'Expatriado', 'Expats': 'Expatriados',
    'Client': 'Cliente', 'Clients': 'Clientes',
    'Paiements': 'Pagamentos', 'Payments': 'Pagamentos',
    'Factures': 'Faturas', 'Invoices': 'Faturas',
    'Rechercher': 'Pesquisar', 'Search': 'Pesquisar',
    'Filtrer': 'Filtrar', 'Filter': 'Filtrar',
    'Exporter': 'Exportar', 'Export': 'Exportar',
    'Télécharger': 'Baixar', 'Download': 'Baixar',
    'Modifier': 'Editar', 'Edit': 'Editar',
    'Supprimer': 'Excluir', 'Delete': 'Excluir',
    'Ajouter': 'Adicionar', 'Add': 'Adicionar',
    'Créer': 'Criar', 'Create': 'Criar',
    'Sauvegarder': 'Salvar', 'Save': 'Salvar',
    'Total': 'Total',
    'Montant': 'Valor', 'Amount': 'Valor',
    'Date': 'Data',
    'Statut': 'Status', 'Status': 'Status',
    'Actions': 'Ações',
    'Détails': 'Detalhes', 'Details': 'Detalhes',
    'Voir': 'Ver', 'View': 'Ver',
    'Profil': 'Perfil', 'Profile': 'Perfil',
    'Nom': 'Nome', 'Name': 'Nome',
    'Email': 'E-mail',
    'Téléphone': 'Telefone', 'Phone': 'Telefone',
    'Adresse': 'Endereço', 'Address': 'Endereço',
    'Langue': 'Idioma', 'Language': 'Idioma',
    'Langues': 'Idiomas', 'Languages': 'Idiomas',
    'Nationalité': 'Nacionalidade', 'Nationality': 'Nacionalidade',
    'Spécialité': 'Especialidade', 'Specialty': 'Especialidade',
    'Expérience': 'Experiência', 'Experience': 'Experiência',
    'Note moyenne': 'Avaliação média', 'Average rating': 'Avaliação média',
    'Avis': 'Avaliações', 'Reviews': 'Avaliações',
    'Appel': 'Chamada', 'Call': 'Chamada',
    'Appels': 'Chamadas', 'Calls': 'Chamadas',
    'Réservation': 'Reserva', 'Booking': 'Reserva',
    'Réservations': 'Reservas', 'Bookings': 'Reservas',
    'Actif': 'Ativo', 'Active': 'Ativo',
    'Archivé': 'Arquivado', 'Archived': 'Arquivado',
    'Expiré': 'Expirado', 'Expired': 'Expirado',
    'En attente': 'Pendente', 'Pending': 'Pendente',
    'Approuvé': 'Aprovado', 'Approved': 'Aprovado',
    'Rejeté': 'Rejeitado', 'Rejected': 'Rejeitado',
    'Vérifié': 'Verificado', 'Verified': 'Verificado',
    'Non vérifié': 'Não verificado', 'Not verified': 'Não verificado',
    'Commission': 'Comissão',
    'Revenus': 'Receita', 'Revenue': 'Receita',
    'Graphique': 'Gráfico', 'Chart': 'Gráfico',
    'Période': 'Período', 'Period': 'Período',
    'Jour': 'Dia', 'Day': 'Dia',
    'Semaine': 'Semana', 'Week': 'Semana',
    'Mois': 'Mês', 'Month': 'Mês',
    'Année': 'Ano', 'Year': 'Ano',
    'Aujourd\'hui': 'Hoje', 'Today': 'Hoje',
    'Hier': 'Ontem', 'Yesterday': 'Ontem',
    'Cette semaine': 'Esta semana', 'This week': 'Esta semana',
    'Ce mois': 'Este mês', 'This month': 'Este mês',
    'Erreurs': 'Erros', 'Errors': 'Erros',
    'Journal': 'Log', 'Log': 'Log', 'Logs': 'Logs',
    'Entreprise': 'Empresa', 'Business': 'Empresa', 'Company': 'Empresa',
    'Abonnement': 'Assinatura', 'Subscription': 'Assinatura',
    'Prix': 'Preço', 'Price': 'Preço',
    'Tarif': 'Tarifa', 'Rate': 'Tarifa',
    'Gratuit': 'Grátis', 'Free': 'Grátis',
    'minutes': 'minutos',
    'heures': 'horas', 'hours': 'horas',
    'jours': 'dias', 'days': 'dias',
    'il y a': 'há', 'ago': 'atrás',
    'depuis': 'desde', 'since': 'desde',
    'Succès': 'Sucesso', 'Success': 'Sucesso',
    'Échec': 'Falhou', 'Failed': 'Falhou',
    'Attention': 'Atenção', 'Warning': 'Aviso',
    'Oui': 'Sim', 'Yes': 'Sim',
    'Non': 'Não', 'No': 'Não',
    'Fermer': 'Fechar', 'Close': 'Fechar',
    'Ouvrir': 'Abrir', 'Open': 'Abrir',
    'Répondre': 'Responder', 'Reply': 'Responder',
    'Mettre à jour': 'Atualizar', 'Update': 'Atualizar',
    'Actualiser': 'Atualizar', 'Refresh': 'Atualizar'
  },
  // Russian (ru)
  ru: {
    'Messages de contact': 'Сообщения', 'Contact Messages': 'Сообщения',
    'Reçu le': 'Получено', 'Received on': 'Получено',
    'Lu': 'Прочитано', 'Read': 'Прочитано',
    'Marquer comme lu': 'Отметить как прочитанное', 'Mark as read': 'Отметить как прочитанное',
    'Réponse envoyée': 'Ответ отправлен', 'Reply sent': 'Ответ отправлен',
    'Répondu le': 'Отвечено', 'Replied on': 'Отвечено',
    'Votre réponse...': 'Ваш ответ...', 'Your reply...': 'Ваш ответ...',
    'Erreur d\'envoi': 'Ошибка отправки', 'Send error': 'Ошибка отправки',
    'par': 'от', 'by': 'от',
    'Assistant IA': 'ИИ-ассистент', 'AI Assistant': 'ИИ-ассистент',
    'Outil IA': 'ИИ-инструмент', 'AI Tool': 'ИИ-инструмент',
    'Accéder à l\'Outil IA': 'Доступ к ИИ-инструменту', 'Access AI Tool': 'Доступ к ИИ-инструменту',
    'Fonctionnalités': 'Функции', 'Features': 'Функции',
    'Conversations récentes': 'Недавние разговоры', 'Recent conversations': 'Недавние разговоры',
    'Aucune conversation': 'Нет разговоров', 'No conversations': 'Нет разговоров',
    'Chargement': 'Загрузка', 'Loading': 'Загрузка',
    'Devise': 'Валюта', 'Currency': 'Валюта',
    'Frais': 'Комиссии', 'Fees': 'Комиссии',
    'Paiement': 'Оплата', 'Payment': 'Оплата',
    'Vérification': 'Проверка', 'Verification': 'Проверка',
    'vérifié': 'подтверждено', 'verified': 'подтверждено',
    'Sélectionner': 'Выбрать', 'Select': 'Выбрать',
    'Expert': 'Эксперт', 'expert': 'эксперт',
    'Accueil': 'Главная', 'Home': 'Главная',
    'Retour': 'Назад', 'Back': 'Назад',
    'Effacer': 'Очистить', 'Clear': 'Очистить',
    'Erreur d\'accès': 'Ошибка доступа', 'Access error': 'Ошибка доступа',
    'Accès refusé': 'Доступ запрещен', 'Access denied': 'Доступ запрещен',
    'Durée': 'Продолжительность', 'Duration': 'Продолжительность',
    'Annuler': 'Отмена', 'Cancel': 'Отмена',
    'Confirmer': 'Подтвердить', 'Confirm': 'Подтвердить',
    'Tableau de bord': 'Панель управления', 'Dashboard': 'Панель управления',
    'Statistiques': 'Статистика', 'Statistics': 'Статистика',
    'Pays': 'Страна', 'Country': 'Страна', 'Countries': 'Страны',
    'Avocat': 'Адвокат', 'Lawyer': 'Адвокат', 'Lawyers': 'Адвокаты',
    'Expatrié': 'Экспат', 'Expat': 'Экспат', 'Expats': 'Экспаты',
    'Client': 'Клиент', 'Clients': 'Клиенты',
    'Paiements': 'Платежи', 'Payments': 'Платежи',
    'Factures': 'Счета', 'Invoices': 'Счета',
    'Rechercher': 'Поиск', 'Search': 'Поиск',
    'Filtrer': 'Фильтр', 'Filter': 'Фильтр',
    'Exporter': 'Экспорт', 'Export': 'Экспорт',
    'Télécharger': 'Скачать', 'Download': 'Скачать',
    'Modifier': 'Редактировать', 'Edit': 'Редактировать',
    'Supprimer': 'Удалить', 'Delete': 'Удалить',
    'Ajouter': 'Добавить', 'Add': 'Добавить',
    'Créer': 'Создать', 'Create': 'Создать',
    'Sauvegarder': 'Сохранить', 'Save': 'Сохранить',
    'Total': 'Всего',
    'Montant': 'Сумма', 'Amount': 'Сумма',
    'Date': 'Дата',
    'Statut': 'Статус', 'Status': 'Статус',
    'Actions': 'Действия',
    'Détails': 'Детали', 'Details': 'Детали',
    'Voir': 'Просмотр', 'View': 'Просмотр',
    'Profil': 'Профиль', 'Profile': 'Профиль',
    'Nom': 'Имя', 'Name': 'Имя',
    'Email': 'Email',
    'Téléphone': 'Телефон', 'Phone': 'Телефон',
    'Adresse': 'Адрес', 'Address': 'Адрес',
    'Langue': 'Язык', 'Language': 'Язык',
    'Langues': 'Языки', 'Languages': 'Языки',
    'Nationalité': 'Гражданство', 'Nationality': 'Гражданство',
    'Spécialité': 'Специализация', 'Specialty': 'Специализация',
    'Expérience': 'Опыт', 'Experience': 'Опыт',
    'Note moyenne': 'Средний рейтинг', 'Average rating': 'Средний рейтинг',
    'Avis': 'Отзывы', 'Reviews': 'Отзывы',
    'Appel': 'Звонок', 'Call': 'Звонок',
    'Appels': 'Звонки', 'Calls': 'Звонки',
    'Réservation': 'Бронирование', 'Booking': 'Бронирование',
    'Réservations': 'Бронирования', 'Bookings': 'Бронирования',
    'Actif': 'Активный', 'Active': 'Активный',
    'Archivé': 'Архивный', 'Archived': 'Архивный',
    'Expiré': 'Истекший', 'Expired': 'Истекший',
    'En attente': 'Ожидание', 'Pending': 'Ожидание',
    'Approuvé': 'Одобрено', 'Approved': 'Одобрено',
    'Rejeté': 'Отклонено', 'Rejected': 'Отклонено',
    'Vérifié': 'Проверено', 'Verified': 'Проверено',
    'Non vérifié': 'Не проверено', 'Not verified': 'Не проверено',
    'Commission': 'Комиссия',
    'Revenus': 'Доход', 'Revenue': 'Доход',
    'Graphique': 'График', 'Chart': 'График',
    'Période': 'Период', 'Period': 'Период',
    'Jour': 'День', 'Day': 'День',
    'Semaine': 'Неделя', 'Week': 'Неделя',
    'Mois': 'Месяц', 'Month': 'Месяц',
    'Année': 'Год', 'Year': 'Год',
    'Aujourd\'hui': 'Сегодня', 'Today': 'Сегодня',
    'Hier': 'Вчера', 'Yesterday': 'Вчера',
    'Cette semaine': 'На этой неделе', 'This week': 'На этой неделе',
    'Ce mois': 'В этом месяце', 'This month': 'В этом месяце',
    'Erreurs': 'Ошибки', 'Errors': 'Ошибки',
    'Journal': 'Журнал', 'Log': 'Журнал', 'Logs': 'Журналы',
    'Entreprise': 'Компания', 'Business': 'Бизнес', 'Company': 'Компания',
    'Abonnement': 'Подписка', 'Subscription': 'Подписка',
    'Prix': 'Цена', 'Price': 'Цена',
    'Tarif': 'Тариф', 'Rate': 'Тариф',
    'Gratuit': 'Бесплатно', 'Free': 'Бесплатно',
    'minutes': 'минут', 'min': 'мин',
    'heures': 'часов', 'hours': 'часов',
    'jours': 'дней', 'days': 'дней',
    'il y a': 'назад', 'ago': 'назад',
    'depuis': 'с', 'since': 'с',
    'Succès': 'Успех', 'Success': 'Успех',
    'Échec': 'Неудача', 'Failed': 'Неудача',
    'Attention': 'Внимание', 'Warning': 'Предупреждение',
    'Oui': 'Да', 'Yes': 'Да',
    'Non': 'Нет', 'No': 'Нет',
    'Fermer': 'Закрыть', 'Close': 'Закрыть',
    'Ouvrir': 'Открыть', 'Open': 'Открыть',
    'Répondre': 'Ответить', 'Reply': 'Ответить',
    'Mettre à jour': 'Обновить', 'Update': 'Обновить',
    'Actualiser': 'Обновить', 'Refresh': 'Обновить'
  },
  // Hindi (hi)
  hi: {
    'Messages de contact': 'संपर्क संदेश', 'Contact Messages': 'संपर्क संदेश',
    'Reçu le': 'प्राप्त', 'Received on': 'प्राप्त',
    'Lu': 'पढ़ा गया', 'Read': 'पढ़ा गया',
    'Marquer comme lu': 'पढ़ा गया चिह्नित करें', 'Mark as read': 'पढ़ा गया चिह्नित करें',
    'Réponse envoyée': 'जवाब भेजा गया', 'Reply sent': 'जवाब भेजा गया',
    'Répondu le': 'जवाब दिया गया', 'Replied on': 'जवाब दिया गया',
    'Votre réponse...': 'आपका जवाब...', 'Your reply...': 'आपका जवाब...',
    'Erreur d\'envoi': 'भेजने में त्रुटि', 'Send error': 'भेजने में त्रुटि',
    'par': 'द्वारा', 'by': 'द्वारा',
    'Assistant IA': 'एआई सहायक', 'AI Assistant': 'एआई सहायक',
    'Outil IA': 'एआई टूल', 'AI Tool': 'एआई टूल',
    'Fonctionnalités': 'विशेषताएं', 'Features': 'विशेषताएं',
    'Conversations récentes': 'हाल की बातचीत', 'Recent conversations': 'हाल की बातचीत',
    'Aucune conversation': 'कोई बातचीत नहीं', 'No conversations': 'कोई बातचीत नहीं',
    'Chargement': 'लोड हो रहा है', 'Loading': 'लोड हो रहा है',
    'Devise': 'मुद्रा', 'Currency': 'मुद्रा',
    'Frais': 'शुल्क', 'Fees': 'शुल्क',
    'Paiement': 'भुगतान', 'Payment': 'भुगतान',
    'Vérification': 'सत्यापन', 'Verification': 'सत्यापन',
    'vérifié': 'सत्यापित', 'verified': 'सत्यापित',
    'Sélectionner': 'चुनें', 'Select': 'चुनें',
    'Expert': 'विशेषज्ञ', 'expert': 'विशेषज्ञ',
    'Accueil': 'होम', 'Home': 'होम',
    'Retour': 'वापस', 'Back': 'वापस',
    'Effacer': 'साफ करें', 'Clear': 'साफ करें',
    'Annuler': 'रद्द करें', 'Cancel': 'रद्द करें',
    'Confirmer': 'पुष्टि करें', 'Confirm': 'पुष्टि करें',
    'Tableau de bord': 'डैशबोर्ड', 'Dashboard': 'डैशबोर्ड',
    'Statistiques': 'आंकड़े', 'Statistics': 'आंकड़े',
    'Pays': 'देश', 'Country': 'देश', 'Countries': 'देश',
    'Avocat': 'वकील', 'Lawyer': 'वकील', 'Lawyers': 'वकील',
    'Expatrié': 'प्रवासी', 'Expat': 'प्रवासी', 'Expats': 'प्रवासी',
    'Client': 'ग्राहक', 'Clients': 'ग्राहक',
    'Paiements': 'भुगतान', 'Payments': 'भुगतान',
    'Factures': 'चालान', 'Invoices': 'चालान',
    'Rechercher': 'खोजें', 'Search': 'खोजें',
    'Filtrer': 'फ़िल्टर', 'Filter': 'फ़िल्टर',
    'Exporter': 'निर्यात', 'Export': 'निर्यात',
    'Télécharger': 'डाउनलोड', 'Download': 'डाउनलोड',
    'Modifier': 'संपादित करें', 'Edit': 'संपादित करें',
    'Supprimer': 'हटाएं', 'Delete': 'हटाएं',
    'Ajouter': 'जोड़ें', 'Add': 'जोड़ें',
    'Créer': 'बनाएं', 'Create': 'बनाएं',
    'Sauvegarder': 'सहेजें', 'Save': 'सहेजें',
    'Total': 'कुल',
    'Montant': 'राशि', 'Amount': 'राशि',
    'Date': 'दिनांक',
    'Statut': 'स्थिति', 'Status': 'स्थिति',
    'Actions': 'क्रियाएं',
    'Détails': 'विवरण', 'Details': 'विवरण',
    'Voir': 'देखें', 'View': 'देखें',
    'Profil': 'प्रोफ़ाइल', 'Profile': 'प्रोफ़ाइल',
    'Nom': 'नाम', 'Name': 'नाम',
    'Email': 'ईमेल',
    'Téléphone': 'फ़ोन', 'Phone': 'फ़ोन',
    'Adresse': 'पता', 'Address': 'पता',
    'Langue': 'भाषा', 'Language': 'भाषा',
    'Langues': 'भाषाएं', 'Languages': 'भाषाएं',
    'Oui': 'हां', 'Yes': 'हां',
    'Non': 'नहीं', 'No': 'नहीं',
    'Fermer': 'बंद करें', 'Close': 'बंद करें',
    'Ouvrir': 'खोलें', 'Open': 'खोलें'
  },
  // Arabic (ar)
  ar: {
    'Messages de contact': 'رسائل الاتصال', 'Contact Messages': 'رسائل الاتصال',
    'Reçu le': 'تم الاستلام في', 'Received on': 'تم الاستلام في',
    'Lu': 'مقروء', 'Read': 'مقروء',
    'Marquer comme lu': 'تحديد كمقروء', 'Mark as read': 'تحديد كمقروء',
    'Réponse envoyée': 'تم إرسال الرد', 'Reply sent': 'تم إرسال الرد',
    'Répondu le': 'تم الرد في', 'Replied on': 'تم الرد في',
    'Votre réponse...': 'ردك...', 'Your reply...': 'ردك...',
    'Erreur d\'envoi': 'خطأ في الإرسال', 'Send error': 'خطأ في الإرسال',
    'par': 'بواسطة', 'by': 'بواسطة',
    'Assistant IA': 'مساعد الذكاء الاصطناعي', 'AI Assistant': 'مساعد الذكاء الاصطناعي',
    'Outil IA': 'أداة الذكاء الاصطناعي', 'AI Tool': 'أداة الذكاء الاصطناعي',
    'Fonctionnalités': 'الميزات', 'Features': 'الميزات',
    'Conversations récentes': 'المحادثات الأخيرة', 'Recent conversations': 'المحادثات الأخيرة',
    'Aucune conversation': 'لا توجد محادثات', 'No conversations': 'لا توجد محادثات',
    'Chargement': 'جاري التحميل', 'Loading': 'جاري التحميل',
    'Devise': 'العملة', 'Currency': 'العملة',
    'Frais': 'الرسوم', 'Fees': 'الرسوم',
    'Paiement': 'الدفع', 'Payment': 'الدفع',
    'Vérification': 'التحقق', 'Verification': 'التحقق',
    'vérifié': 'تم التحقق', 'verified': 'تم التحقق',
    'Sélectionner': 'اختر', 'Select': 'اختر',
    'Expert': 'خبير', 'expert': 'خبير',
    'Accueil': 'الرئيسية', 'Home': 'الرئيسية',
    'Retour': 'رجوع', 'Back': 'رجوع',
    'Effacer': 'مسح', 'Clear': 'مسح',
    'Annuler': 'إلغاء', 'Cancel': 'إلغاء',
    'Confirmer': 'تأكيد', 'Confirm': 'تأكيد',
    'Tableau de bord': 'لوحة التحكم', 'Dashboard': 'لوحة التحكم',
    'Statistiques': 'الإحصائيات', 'Statistics': 'الإحصائيات',
    'Pays': 'البلد', 'Country': 'البلد', 'Countries': 'البلدان',
    'Avocat': 'محامي', 'Lawyer': 'محامي', 'Lawyers': 'المحامون',
    'Expatrié': 'مغترب', 'Expat': 'مغترب', 'Expats': 'المغتربون',
    'Client': 'عميل', 'Clients': 'العملاء',
    'Paiements': 'المدفوعات', 'Payments': 'المدفوعات',
    'Factures': 'الفواتير', 'Invoices': 'الفواتير',
    'Rechercher': 'بحث', 'Search': 'بحث',
    'Filtrer': 'تصفية', 'Filter': 'تصفية',
    'Exporter': 'تصدير', 'Export': 'تصدير',
    'Télécharger': 'تحميل', 'Download': 'تحميل',
    'Modifier': 'تعديل', 'Edit': 'تعديل',
    'Supprimer': 'حذف', 'Delete': 'حذف',
    'Ajouter': 'إضافة', 'Add': 'إضافة',
    'Créer': 'إنشاء', 'Create': 'إنشاء',
    'Sauvegarder': 'حفظ', 'Save': 'حفظ',
    'Total': 'الإجمالي',
    'Montant': 'المبلغ', 'Amount': 'المبلغ',
    'Date': 'التاريخ',
    'Statut': 'الحالة', 'Status': 'الحالة',
    'Actions': 'الإجراءات',
    'Détails': 'التفاصيل', 'Details': 'التفاصيل',
    'Voir': 'عرض', 'View': 'عرض',
    'Profil': 'الملف الشخصي', 'Profile': 'الملف الشخصي',
    'Nom': 'الاسم', 'Name': 'الاسم',
    'Email': 'البريد الإلكتروني',
    'Téléphone': 'الهاتف', 'Phone': 'الهاتف',
    'Adresse': 'العنوان', 'Address': 'العنوان',
    'Langue': 'اللغة', 'Language': 'اللغة',
    'Langues': 'اللغات', 'Languages': 'اللغات',
    'Oui': 'نعم', 'Yes': 'نعم',
    'Non': 'لا', 'No': 'لا',
    'Fermer': 'إغلاق', 'Close': 'إغلاق',
    'Ouvrir': 'فتح', 'Open': 'فتح'
  },
  // Chinese (ch)
  ch: {
    'Messages de contact': '联系消息', 'Contact Messages': '联系消息',
    'Reçu le': '收到于', 'Received on': '收到于',
    'Lu': '已读', 'Read': '已读',
    'Marquer comme lu': '标记为已读', 'Mark as read': '标记为已读',
    'Réponse envoyée': '回复已发送', 'Reply sent': '回复已发送',
    'Répondu le': '回复于', 'Replied on': '回复于',
    'Votre réponse...': '您的回复...', 'Your reply...': '您的回复...',
    'Erreur d\'envoi': '发送错误', 'Send error': '发送错误',
    'par': '由', 'by': '由',
    'Assistant IA': 'AI助手', 'AI Assistant': 'AI助手',
    'Outil IA': 'AI工具', 'AI Tool': 'AI工具',
    'Fonctionnalités': '功能', 'Features': '功能',
    'Conversations récentes': '最近对话', 'Recent conversations': '最近对话',
    'Aucune conversation': '没有对话', 'No conversations': '没有对话',
    'Chargement': '加载中', 'Loading': '加载中',
    'Devise': '货币', 'Currency': '货币',
    'Frais': '费用', 'Fees': '费用',
    'Paiement': '支付', 'Payment': '支付',
    'Vérification': '验证', 'Verification': '验证',
    'vérifié': '已验证', 'verified': '已验证',
    'Sélectionner': '选择', 'Select': '选择',
    'Expert': '专家', 'expert': '专家',
    'Accueil': '首页', 'Home': '首页',
    'Retour': '返回', 'Back': '返回',
    'Effacer': '清除', 'Clear': '清除',
    'Annuler': '取消', 'Cancel': '取消',
    'Confirmer': '确认', 'Confirm': '确认',
    'Tableau de bord': '仪表板', 'Dashboard': '仪表板',
    'Statistiques': '统计', 'Statistics': '统计',
    'Pays': '国家', 'Country': '国家', 'Countries': '国家',
    'Avocat': '律师', 'Lawyer': '律师', 'Lawyers': '律师',
    'Expatrié': '外籍人士', 'Expat': '外籍人士', 'Expats': '外籍人士',
    'Client': '客户', 'Clients': '客户',
    'Paiements': '付款', 'Payments': '付款',
    'Factures': '发票', 'Invoices': '发票',
    'Rechercher': '搜索', 'Search': '搜索',
    'Filtrer': '筛选', 'Filter': '筛选',
    'Exporter': '导出', 'Export': '导出',
    'Télécharger': '下载', 'Download': '下载',
    'Modifier': '编辑', 'Edit': '编辑',
    'Supprimer': '删除', 'Delete': '删除',
    'Ajouter': '添加', 'Add': '添加',
    'Créer': '创建', 'Create': '创建',
    'Sauvegarder': '保存', 'Save': '保存',
    'Total': '总计',
    'Montant': '金额', 'Amount': '金额',
    'Date': '日期',
    'Statut': '状态', 'Status': '状态',
    'Actions': '操作',
    'Détails': '详情', 'Details': '详情',
    'Voir': '查看', 'View': '查看',
    'Profil': '个人资料', 'Profile': '个人资料',
    'Nom': '姓名', 'Name': '姓名',
    'Email': '邮箱',
    'Téléphone': '电话', 'Phone': '电话',
    'Adresse': '地址', 'Address': '地址',
    'Langue': '语言', 'Language': '语言',
    'Langues': '语言', 'Languages': '语言',
    'Oui': '是', 'Yes': '是',
    'Non': '否', 'No': '否',
    'Fermer': '关闭', 'Close': '关闭',
    'Ouvrir': '打开', 'Open': '打开'
  }
};

// Traductions spécifiques pour les clés complètes
const specificTranslations = {
  // admin.contactMessages
  'admin.contactMessages.title': {
    de: 'Kontaktnachrichten', es: 'Mensajes de contacto', pt: 'Mensagens de contato',
    ru: 'Сообщения', hi: 'संपर्क संदेश', ar: 'رسائل الاتصال', ch: '联系消息'
  },
  'admin.contactMessages.receivedOn': {
    de: 'Empfangen am', es: 'Recibido el', pt: 'Recebido em',
    ru: 'Получено', hi: 'प्राप्त', ar: 'تم الاستلام في', ch: '收到于'
  },
  'admin.contactMessages.read': {
    de: 'Gelesen', es: 'Leído', pt: 'Lido',
    ru: 'Прочитано', hi: 'पढ़ा गया', ar: 'مقروء', ch: '已读'
  },
  'admin.contactMessages.markAsRead': {
    de: 'Als gelesen markieren', es: 'Marcar como leído', pt: 'Marcar como lido',
    ru: 'Отметить как прочитанное', hi: 'पढ़ा गया चिह्नित करें', ar: 'تحديد كمقروء', ch: '标记为已读'
  },
  'admin.contactMessages.replySent': {
    de: 'Antwort gesendet:', es: 'Respuesta enviada:', pt: 'Resposta enviada:',
    ru: 'Ответ отправлен:', hi: 'जवाब भेजा गया:', ar: 'تم إرسال الرد:', ch: '回复已发送:'
  },
  'admin.contactMessages.repliedOn': {
    de: 'Beantwortet am', es: 'Respondido el', pt: 'Respondido em',
    ru: 'Отвечено', hi: 'जवाब दिया गया', ar: 'تم الرد في', ch: '回复于'
  },
  'admin.contactMessages.replyPlaceholder': {
    de: 'Ihre Antwort...', es: 'Su respuesta...', pt: 'Sua resposta...',
    ru: 'Ваш ответ...', hi: 'आपका जवाब...', ar: 'ردك...', ch: '您的回复...'
  },
  'admin.contactMessages.sendError': {
    de: 'Sendefehler:', es: 'Error de envío:', pt: 'Erro de envio:',
    ru: 'Ошибка отправки:', hi: 'भेजने में त्रुटि:', ar: 'خطأ في الإرسال:', ch: '发送错误:'
  },
  // header.logo
  'header.logo.byUlixai': {
    de: 'von Ulixai', es: 'por Ulixai', pt: 'por Ulixai',
    ru: 'от Ulixai', hi: 'Ulixai द्वारा', ar: 'بواسطة Ulixai', ch: '由Ulixai提供'
  },
  // aiAssistant
  'aiAssistant.title': {
    de: 'KI-Assistent', es: 'Asistente IA', pt: 'Assistente IA',
    ru: 'ИИ-ассистент', hi: 'एआई सहायक', ar: 'مساعد الذكاء الاصطناعي', ch: 'AI助手'
  },
  'aiAssistant.description': {
    de: 'Ihr intelligenter Assistent zur Beantwortung Ihrer Kunden',
    es: 'Su asistente inteligente para responder a sus clientes',
    pt: 'Seu assistente inteligente para responder seus clientes',
    ru: 'Ваш умный ассистент для ответов клиентам',
    hi: 'आपके ग्राहकों को जवाब देने के लिए आपका बुद्धिमान सहायक',
    ar: 'مساعدك الذكي للرد على عملائك',
    ch: '您的智能助手，用于回应客户'
  },
  'aiAssistant.toolTitle': {
    de: 'SOS Expat KI-Werkzeug', es: 'Herramienta IA SOS Expat', pt: 'Ferramenta IA SOS Expat',
    ru: 'ИИ-инструмент SOS Expat', hi: 'SOS Expat एआई टूल', ar: 'أداة SOS Expat للذكاء الاصطناعي', ch: 'SOS Expat AI工具'
  },
  'aiAssistant.toolDescription': {
    de: 'Ihr intelligenter KI-Assistent zur Beantwortung Ihrer Expat-Kunden. Echtzeitgespräche mit Claude und GPT-4.',
    es: 'Su asistente IA inteligente para responder a sus clientes expatriados. Conversaciones en tiempo real con Claude y GPT-4.',
    pt: 'Seu assistente IA inteligente para responder seus clientes expatriados. Conversas em tempo real com Claude e GPT-4.',
    ru: 'Ваш умный ИИ-ассистент для ответов экспатам. Разговоры в реальном времени с Claude и GPT-4.',
    hi: 'आपके प्रवासी ग्राहकों को जवाब देने के लिए आपका बुद्धिमान एआई सहायक। Claude और GPT-4 के साथ रियल-टाइम बातचीत।',
    ar: 'مساعدك الذكي للرد على عملائك المغتربين. محادثات في الوقت الحقيقي مع Claude و GPT-4.',
    ch: '您的智能AI助手，用于回应外籍客户。与Claude和GPT-4进行实时对话。'
  },
  'aiAssistant.accessButton': {
    de: 'Auf KI-Werkzeug zugreifen', es: 'Acceder a la Herramienta IA', pt: 'Acessar Ferramenta IA',
    ru: 'Доступ к ИИ-инструменту', hi: 'एआई टूल तक पहुंचें', ar: 'الوصول إلى أداة الذكاء الاصطناعي', ch: '访问AI工具'
  },
  'aiAssistant.features': {
    de: 'Funktionen', es: 'Funcionalidades', pt: 'Funcionalidades',
    ru: 'Функции', hi: 'विशेषताएं', ar: 'الميزات', ch: '功能'
  },
  'aiAssistant.recentConversations': {
    de: 'Letzte Gespräche', es: 'Conversaciones recientes', pt: 'Conversas recentes',
    ru: 'Недавние разговоры', hi: 'हाल की बातचीत', ar: 'المحادثات الأخيرة', ch: '最近对话'
  },
  'aiAssistant.noConversations': {
    de: 'Keine Gespräche', es: 'Sin conversaciones', pt: 'Nenhuma conversa',
    ru: 'Нет разговоров', hi: 'कोई बातचीत नहीं', ar: 'لا توجد محادثات', ch: '没有对话'
  },
  'aiAssistant.noConversationsDescription': {
    de: 'Starten Sie ein Gespräch mit dem KI-Assistenten', es: 'Inicie una conversación con el asistente IA',
    pt: 'Inicie uma conversa com o assistente IA', ru: 'Начните разговор с ИИ-ассистентом',
    hi: 'एआई सहायक के साथ बातचीत शुरू करें', ar: 'ابدأ محادثة مع مساعد الذكاء الاصطناعي', ch: '开始与AI助手对话'
  },
  'aiAssistant.messagesCount': {
    de: 'Nachrichten', es: 'mensajes', pt: 'mensagens',
    ru: 'сообщений', hi: 'संदेश', ar: 'رسائل', ch: '消息'
  },
  'aiAssistant.status.active': {
    de: 'Aktiv', es: 'Activo', pt: 'Ativo',
    ru: 'Активный', hi: 'सक्रिय', ar: 'نشط', ch: '活跃'
  },
  'aiAssistant.status.archived': {
    de: 'Archiviert', es: 'Archivado', pt: 'Arquivado',
    ru: 'Архивный', hi: 'संग्रहीत', ar: 'مؤرشف', ch: '已归档'
  },
  'aiAssistant.status.expired': {
    de: 'Abgelaufen', es: 'Expirado', pt: 'Expirado',
    ru: 'Истекший', hi: 'समाप्त', ar: 'منتهي', ch: '已过期'
  },
  'aiAssistant.timeAgo.minutes': {
    de: 'vor {{count}} Min', es: 'hace {{count}} min', pt: 'há {{count}} min',
    ru: '{{count}} мин назад', hi: '{{count}} मिनट पहले', ar: 'منذ {{count}} دقيقة', ch: '{{count}}分钟前'
  },
  'aiAssistant.timeAgo.hours': {
    de: 'vor {{count}}h', es: 'hace {{count}}h', pt: 'há {{count}}h',
    ru: '{{count}}ч назад', hi: '{{count}} घंटे पहले', ar: 'منذ {{count}} ساعة', ch: '{{count}}小时前'
  },
  'aiAssistant.timeAgo.days': {
    de: 'vor {{count}}T', es: 'hace {{count}}d', pt: 'há {{count}}d',
    ru: '{{count}}д назад', hi: '{{count}} दिन पहले', ar: 'منذ {{count}} يوم', ch: '{{count}}天前'
  },
  'aiAssistant.feature.autoBooking': {
    de: 'Automatische Buchungsantworten', es: 'Respuestas automáticas a reservas', pt: 'Respostas automáticas a reservas',
    ru: 'Автоматические ответы на бронирования', hi: 'बुकिंग के लिए स्वचालित जवाब', ar: 'ردود حجز تلقائية', ch: '自动预订回复'
  },
  'aiAssistant.feature.realTimeChat': {
    de: 'Echtzeit-KI-Chat', es: 'Chat IA en tiempo real', pt: 'Chat IA em tempo real',
    ru: 'ИИ-чат в реальном времени', hi: 'रियल-टाइम एआई चैट', ar: 'محادثة ذكاء اصطناعي في الوقت الحقيقي', ch: '实时AI聊天'
  },
  'aiAssistant.feature.webSearch': {
    de: 'Integrierte Websuche', es: 'Búsqueda web integrada', pt: 'Pesquisa web integrada',
    ru: 'Встроенный веб-поиск', hi: 'एकीकृत वेब खोज', ar: 'بحث ويب مدمج', ch: '集成网络搜索'
  },
  'aiAssistant.feature.contextPreserved': {
    de: 'Kundenkontext erhalten', es: 'Contexto del cliente preservado', pt: 'Contexto do cliente preservado',
    ru: 'Сохранение контекста клиента', hi: 'ग्राहक संदर्भ संरक्षित', ar: 'الحفاظ على سياق العميل', ch: '保留客户上下文'
  },
  'aiAssistant.error.loadConversations': {
    de: 'Fehler beim Laden der Gespräche', es: 'Error al cargar conversaciones', pt: 'Erro ao carregar conversas',
    ru: 'Ошибка загрузки разговоров', hi: 'बातचीत लोड करने में त्रुटि', ar: 'خطأ في تحميل المحادثات', ch: '加载对话时出错'
  },
  'aiAssistant.error.accessTool': {
    de: 'Fehler beim Zugriff auf das Werkzeug', es: 'Error al acceder a la herramienta', pt: 'Erro ao acessar a ferramenta',
    ru: 'Ошибка доступа к инструменту', hi: 'टूल तक पहुंचने में त्रुटि', ar: 'خطأ في الوصول إلى الأداة', ch: '访问工具时出错'
  },
  'aiAssistant.error.accessDenied': {
    de: 'Zugriff verweigert', es: 'Acceso denegado', pt: 'Acesso negado',
    ru: 'Доступ запрещен', hi: 'पहुंच अस्वीकृत', ar: 'تم رفض الوصول', ch: '拒绝访问'
  },
  'aiAssistant.conversationDuration.title': {
    de: 'Gesprächsdauer', es: 'Duración de la conversación', pt: 'Duração da conversa',
    ru: 'Продолжительность разговора', hi: 'बातचीत की अवधि', ar: 'مدة المحادثة', ch: '对话持续时间'
  },
  'aiAssistant.conversationDuration.description': {
    de: 'Durchschnittliche Dauer Ihrer Gespräche', es: 'Duración promedio de sus conversaciones',
    pt: 'Duração média das suas conversas', ru: 'Средняя продолжительность ваших разговоров',
    hi: 'आपकी बातचीत की औसत अवधि', ar: 'متوسط مدة محادثاتك', ch: '您对话的平均时长'
  },
  // checkout & stripe
  'checkout.currency.label': {
    de: 'Währung', es: 'Moneda', pt: 'Moeda',
    ru: 'Валюта', hi: 'मुद्रा', ar: 'العملة', ch: '货币'
  },
  'checkout.currency.fees': {
    de: 'Gebühren', es: 'Cargos', pt: 'Taxas',
    ru: 'Комиссии', hi: 'शुल्क', ar: 'الرسوم', ch: '费用'
  },
  'checkout.currency.eur': {
    de: 'Euro (EUR)', es: 'Euro (EUR)', pt: 'Euro (EUR)',
    ru: 'Евро (EUR)', hi: 'यूरो (EUR)', ar: 'يورو (EUR)', ch: '欧元 (EUR)'
  },
  'checkout.currency.usd': {
    de: 'US-Dollar (USD)', es: 'Dólar estadounidense (USD)', pt: 'Dólar americano (USD)',
    ru: 'Доллар США (USD)', hi: 'अमेरिकी डॉलर (USD)', ar: 'دولار أمريكي (USD)', ch: '美元 (USD)'
  },
  'checkout.currency.autoDetectHint': {
    de: 'Automatisch erkannt', es: 'Detectado automáticamente', pt: 'Detectado automaticamente',
    ru: 'Определено автоматически', hi: 'स्वचालित रूप से पता लगाया गया', ar: 'تم الكشف تلقائياً', ch: '自动检测'
  },
  'stripe.kyc.loading': {
    de: 'KYC wird geladen...', es: 'Cargando KYC...', pt: 'Carregando KYC...',
    ru: 'Загрузка KYC...', hi: 'KYC लोड हो रहा है...', ar: 'جاري تحميل KYC...', ch: '正在加载KYC...'
  },
  'stripe.kyc.verified': {
    de: 'Verifiziert', es: 'Verificado', pt: 'Verificado',
    ru: 'Подтверждено', hi: 'सत्यापित', ar: 'تم التحقق', ch: '已验证'
  },
  'stripe.kyc.stripeLoading': {
    de: 'Stripe wird geladen...', es: 'Cargando Stripe...', pt: 'Carregando Stripe...',
    ru: 'Загрузка Stripe...', hi: 'Stripe लोड हो रहा है...', ar: 'جاري تحميل Stripe...', ch: '正在加载Stripe...'
  },
  'stripe.kyc.note': {
    de: 'Hinweis: KYC-Verifizierung erforderlich', es: 'Nota: Se requiere verificación KYC',
    pt: 'Nota: Verificação KYC necessária', ru: 'Примечание: Требуется KYC-верификация',
    hi: 'नोट: KYC सत्यापन आवश्यक', ar: 'ملاحظة: يتطلب التحقق من KYC', ch: '注意：需要KYC验证'
  },
  // callCheckoutWrapper
  'callCheckoutWrapper.loading.title': {
    de: 'Wird geladen...', es: 'Cargando...', pt: 'Carregando...',
    ru: 'Загрузка...', hi: 'लोड हो रहा है...', ar: 'جاري التحميل...', ch: '加载中...'
  },
  'callCheckoutWrapper.loading.subtitle': {
    de: 'Bitte warten Sie einen Moment', es: 'Por favor espere un momento', pt: 'Por favor aguarde um momento',
    ru: 'Пожалуйста, подождите', hi: 'कृपया एक क्षण प्रतीक्षा करें', ar: 'يرجى الانتظار لحظة', ch: '请稍候'
  },
  'callCheckoutWrapper.loading.progress': {
    de: 'Ladefortschritt', es: 'Progreso de carga', pt: 'Progresso de carregamento',
    ru: 'Прогресс загрузки', hi: 'लोडिंग प्रगति', ar: 'تقدم التحميل', ch: '加载进度'
  },
  'callCheckoutWrapper.cta.selectExpert': {
    de: 'Experten auswählen', es: 'Seleccionar experto', pt: 'Selecionar especialista',
    ru: 'Выбрать эксперта', hi: 'विशेषज्ञ चुनें', ar: 'اختر خبيراً', ch: '选择专家'
  },
  'callCheckoutWrapper.cta.home': {
    de: 'Zur Startseite', es: 'Ir a inicio', pt: 'Ir para início',
    ru: 'На главную', hi: 'होम पर जाएं', ar: 'الذهاب للرئيسية', ch: '返回首页'
  },
  'callCheckoutWrapper.cta.back': {
    de: 'Zurück', es: 'Volver', pt: 'Voltar',
    ru: 'Назад', hi: 'वापस', ar: 'رجوع', ch: '返回'
  },
  'callCheckoutWrapper.cta.clearCache': {
    de: 'Cache leeren', es: 'Limpiar caché', pt: 'Limpar cache',
    ru: 'Очистить кэш', hi: 'कैश साफ करें', ar: 'مسح الذاكرة المؤقتة', ch: '清除缓存'
  },
  'callCheckoutWrapper.error.title': {
    de: 'Fehler', es: 'Error', pt: 'Erro',
    ru: 'Ошибка', hi: 'त्रुटि', ar: 'خطأ', ch: '错误'
  },
  'callCheckoutWrapper.error.body': {
    de: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
    es: 'Se ha producido un error. Por favor, inténtelo de nuevo.',
    pt: 'Ocorreu um erro. Por favor, tente novamente.',
    ru: 'Произошла ошибка. Пожалуйста, попробуйте снова.',
    hi: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    ar: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    ch: '发生错误。请重试。'
  },
  // callCheckout
  'callCheckout.modal.cancel': {
    de: 'Abbrechen', es: 'Cancelar', pt: 'Cancelar',
    ru: 'Отмена', hi: 'रद्द करें', ar: 'إلغاء', ch: '取消'
  },
  'callCheckout.modal.confirm': {
    de: 'Bestätigen', es: 'Confirmar', pt: 'Confirmar',
    ru: 'Подтвердить', hi: 'पुष्टि करें', ar: 'تأكيد', ch: '确认'
  },
  'callCheckout.mobileNote': {
    de: 'Hinweis für Mobilgeräte', es: 'Nota para móviles', pt: 'Nota para dispositivos móveis',
    ru: 'Примечание для мобильных', hi: 'मोबाइल नोट', ar: 'ملاحظة للجوال', ch: '移动端提示'
  },
  // dashboard.messages
  'dashboard.messages.receivedOn': {
    de: 'Empfangen am', es: 'Recibido el', pt: 'Recebido em',
    ru: 'Получено', hi: 'प्राप्त', ar: 'تم الاستلام في', ch: '收到于'
  },
  'dashboard.messages.client': {
    de: 'Kunde', es: 'Cliente', pt: 'Cliente',
    ru: 'Клиент', hi: 'ग्राहक', ar: 'عميل', ch: '客户'
  },
  'dashboard.messages.country': {
    de: 'Land', es: 'País', pt: 'País',
    ru: 'Страна', hi: 'देश', ar: 'البلد', ch: '国家'
  },
  'dashboard.messages.message': {
    de: 'Nachricht', es: 'Mensaje', pt: 'Mensagem',
    ru: 'Сообщение', hi: 'संदेश', ar: 'رسالة', ch: '消息'
  },
  'dashboard.messages.markAsRead': {
    de: 'Als gelesen markieren', es: 'Marcar como leído', pt: 'Marcar como lido',
    ru: 'Отметить как прочитанное', hi: 'पढ़ा गया चिह्नित करें', ar: 'تحديد كمقروء', ch: '标记为已读'
  },
  // pricing
  'pricingTitlePrefix': {
    de: '', es: '', pt: '', ru: '', hi: '', ar: '', ch: ''
  },
  'pricing.title.prefix': {
    de: '', es: '', pt: '', ru: '', hi: '', ar: '', ch: ''
  },
  'pricing.title.highlight': {
    de: 'Preise', es: 'Precios', pt: 'Preços',
    ru: 'Цены', hi: 'मूल्य', ar: 'الأسعار', ch: '价格'
  },
  'sosCall.hero.title.suffix': {
    de: 'jetzt', es: 'ahora', pt: 'agora',
    ru: 'сейчас', hi: 'अभी', ar: 'الآن', ch: '现在'
  }
};

// Fonction pour traduire une valeur
function translateValue(key, frValue, enValue, targetLang) {
  // 1. Vérifier si une traduction spécifique existe
  if (specificTranslations[key] && specificTranslations[key][targetLang]) {
    return specificTranslations[key][targetLang];
  }

  // 2. Utiliser la valeur EN comme base (généralement plus proche des autres langues)
  const baseValue = enValue || frValue;
  if (!baseValue) return '';

  // 3. Chercher des correspondances dans le dictionnaire
  const dict = commonTranslations[targetLang];
  if (dict && dict[baseValue]) {
    return dict[baseValue];
  }

  // 4. Essayer avec la valeur FR
  if (dict && dict[frValue]) {
    return dict[frValue];
  }

  // 5. Retourner la valeur EN par défaut (fallback)
  return enValue || frValue;
}

// Charger les fichiers de traduction existants
const langs = ['de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];
const translations = {};

langs.forEach(lang => {
  translations[lang] = JSON.parse(fs.readFileSync(path.join(basePath, `${lang}.json`), 'utf-8'));
});

// Ajouter les traductions manquantes
let addedCount = 0;
Object.entries(missingKeys).forEach(([key, data]) => {
  data.missingIn.forEach(lang => {
    if (!translations[lang][key]) {
      const translation = translateValue(key, data.fr, data.en, lang);
      translations[lang][key] = translation;
      addedCount++;
    }
  });
});

// Sauvegarder les fichiers mis à jour
langs.forEach(lang => {
  // Trier les clés pour une meilleure lisibilité
  const sortedKeys = Object.keys(translations[lang]).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = translations[lang][k]);

  fs.writeFileSync(
    path.join(basePath, `${lang}.json`),
    JSON.stringify(sorted, null, 2),
    'utf-8'
  );
});

console.log(`\n✅ ${addedCount} traductions ajoutées avec succès!`);
console.log('\nFichiers mis à jour:');
langs.forEach(lang => console.log(`  - ${lang}.json`));
