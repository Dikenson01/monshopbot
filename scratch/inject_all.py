import json

trans_path = 'web/js/translations.js'
with open(trans_path, 'r', encoding='utf-8') as f:
    content = f.read()

translations = {
    'fr': {
        'discussion_entamee': 'Discussion entamée',
        'remettre': 'Remettre dans le circuit',
        'restock_alert_msg': 'Ce produit est de nouveau en stock !',
        'naviguer': 'Naviguer vers le client',
        'dernier_echange': 'Dernier échange',
        'statActive': 'Livraisons Actives',
        'ovStatOrders': 'Commandes Totales',
        'marquer_livre': 'Marquer comme livré',
        'annuler': 'Annuler la livraison',
        'accepter_la_course': 'Accepter la course',
        'statCA': "Chiffre d'Affaires",
        'le_client_verra': '(Le client ne verra pas votre numéro)',
        'ovStatLivreurs': 'Livreurs',
        'total_encaisse': 'Total Encaissé',
        'ovStatUsers': 'Utilisateurs',
        'recommended_formulas': 'Formules Recommandées',
        'confirmer_livraison': 'Confirmer la livraison ?',
        'recommended': '+ RECOMMANDÉ',
        'confirmer_remettre': 'Remettre la commande dans le circuit ?',
        'approche_client': "À l'approche (Notifier le client)",
        'statUsers': 'Clients Actifs',
        'confirmer_annuler': 'Êtes-vous sûr de vouloir annuler ?',
        'aucun_message': "Aucun message pour l'instant...",
        'envoyer': 'Envoyer',
        'confirmer_action': 'Veuillez confirmer cette action',
        'restock_alert_title': '🔔 ALERTE STOCK',
        'ovStatActive': 'Actifs',
        'ovStatCA': "Chiffre d'Affaires",
        'commande': 'Commande',
        'messagerie_anonyme': 'Messagerie Anonyme',
        'frequently_bought_with': 'SOUVENT ACHETÉ AVEC'
    },
    'en': {
        'discussion_entamee': 'Chat started',
        'remettre': 'Put back in circuit',
        'restock_alert_msg': 'This product is back in stock!',
        'naviguer': 'Navigate to client',
        'dernier_echange': 'Last message',
        'statActive': 'Active Deliveries',
        'ovStatOrders': 'Total Orders',
        'marquer_livre': 'Mark as delivered',
        'annuler': 'Cancel delivery',
        'accepter_la_course': 'Accept delivery',
        'statCA': "Revenue",
        'le_client_verra': '(The client will not see your number)',
        'ovStatLivreurs': 'Couriers',
        'total_encaisse': 'Total Collected',
        'ovStatUsers': 'Users',
        'recommended_formulas': 'Recommended Formulas',
        'confirmer_livraison': 'Confirm delivery?',
        'recommended': '+ RECOMMENDED',
        'confirmer_remettre': 'Put the order back in circuit?',
        'approche_client': "Approaching (Notify client)",
        'statUsers': 'Active Clients',
        'confirmer_annuler': 'Are you sure you want to cancel?',
        'aucun_message': "No messages yet...",
        'envoyer': 'Send',
        'confirmer_action': 'Please confirm this action',
        'restock_alert_title': '🔔 STOCK ALERT',
        'ovStatActive': 'Active',
        'ovStatCA': "Revenue",
        'commande': 'Order',
        'messagerie_anonyme': 'Anonymous Chat',
        'frequently_bought_with': 'FREQUENTLY BOUGHT WITH'
    },
    'de': {
        'discussion_entamee': 'Chat gestartet',
        'remettre': 'Zurück in den Kreislauf',
        'restock_alert_msg': 'Dieses Produkt ist wieder auf Lager!',
        'naviguer': 'Zum Kunden navigieren',
        'dernier_echange': 'Letzte Nachricht',
        'statActive': 'Aktive Lieferungen',
        'ovStatOrders': 'Gesamtbestellungen',
        'marquer_livre': 'Als geliefert markieren',
        'annuler': 'Lieferung abbrechen',
        'accepter_la_course': 'Lieferung annehmen',
        'statCA': "Umsatz",
        'le_client_verra': '(Der Kunde wird Ihre Nummer nicht sehen)',
        'ovStatLivreurs': 'Kuriere',
        'total_encaisse': 'Gesamteinnahmen',
        'ovStatUsers': 'Benutzer',
        'recommended_formulas': 'Empfohlene Formeln',
        'confirmer_livraison': 'Lieferung bestätigen?',
        'recommended': '+ EMPFOHLEN',
        'confirmer_remettre': 'Bestellung zurück in den Kreislauf?',
        'approche_client': "Im Anflug (Kunden benachrichtigen)",
        'statUsers': 'Aktive Kunden',
        'confirmer_annuler': 'Sind Sie sicher, dass Sie stornieren möchten?',
        'aucun_message': "Noch keine Nachrichten...",
        'envoyer': 'Senden',
        'confirmer_action': 'Bitte bestätigen Sie diese Aktion',
        'restock_alert_title': '🔔 BESTANDSALARM',
        'ovStatActive': 'Aktiv',
        'ovStatCA': "Umsatz",
        'commande': 'Bestellung',
        'messagerie_anonyme': 'Anonymer Chat',
        'frequently_bought_with': 'WIRD OFT ZUSAMMEN GEKAUFT'
    },
    'es': {
        'discussion_entamee': 'Chat iniciado',
        'remettre': 'Volver a poner en circuito',
        'restock_alert_msg': '¡Este producto vuelve a estar en stock!',
        'naviguer': 'Navegar hacia el cliente',
        'dernier_echange': 'Último mensaje',
        'statActive': 'Entregas Activas',
        'ovStatOrders': 'Pedidos Totales',
        'marquer_livre': 'Marcar como entregado',
        'annuler': 'Cancelar entrega',
        'accepter_la_course': 'Aceptar entrega',
        'statCA': "Ingresos",
        'le_client_verra': '(El cliente no verá su número)',
        'ovStatLivreurs': 'Mensajeros',
        'total_encaisse': 'Total Cobrado',
        'ovStatUsers': 'Usuarios',
        'recommended_formulas': 'Fórmulas Recomendadas',
        'confirmer_livraison': '¿Confirmar entrega?',
        'recommended': '+ RECOMENDADO',
        'confirmer_remettre': '¿Volver a poner el pedido en el circuito?',
        'approche_client': "Acercándose (Notificar al cliente)",
        'statUsers': 'Clientes Activos',
        'confirmer_annuler': '¿Está seguro de que desea cancelar?',
        'aucun_message': "Aún no hay mensajes...",
        'envoyer': 'Enviar',
        'confirmer_action': 'Por favor, confirme esta acción',
        'restock_alert_title': '🔔 ALERTA DE STOCK',
        'ovStatActive': 'Activo',
        'ovStatCA': "Ingresos",
        'commande': 'Pedido',
        'messagerie_anonyme': 'Chat Anónimo',
        'frequently_bought_with': 'FRECUENTEMENTE COMPRADO CON'
    }
}

def insert_after(text, marker, insertion):
    if marker in text:
        return text.replace(marker, marker + "\n" + insertion)
    return text

for lang, data in translations.items():
    formatted = ""
    for k, v in data.items():
        # Handle single quotes by escaping them or using double quotes
        v_escaped = v.replace("'", "\\'")
        formatted += f"        '{k}': '{v_escaped}',\n"
    
    # We will insert it at the very top of each block
    if lang == 'fr':
        content = insert_after(content, "fr: {", formatted)
    elif lang == 'en':
        content = insert_after(content, "en: {", formatted)
    elif lang == 'es':
        content = insert_after(content, "es: {", formatted)
    elif lang == 'de':
        content = insert_after(content, "de: {", formatted)

with open(trans_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("All missing translations injected.")
